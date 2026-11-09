import { getSession } from "../_lib/auth.js";
import { isAuthorized, json } from "../_lib/http.js";

/**
 * Community projects: repositories shared by visitors.
 *
 *   GET  /api/community              → approved projects (public)
 *   GET  /api/community?all=1        → pending + approved (admin only)
 *   POST /api/community              → submit a repository (public)
 *   POST /api/community { action }   → approve / reject / delete (admin only)
 *
 * New submissions are stored as `pending` and only shown publicly after the
 * owner approves them from /admin → tab komunitas.
 */
const KEY = "community";
const MAX_BODY = 20_000;
const MAX_PENDING = 100;
const MAX_APPROVED = 150;
const RATE_LIMIT = 3;
const RATE_TTL = 600;

function text(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function link(value, max = 500) {
  const raw = text(value, max);
  if (!raw) return "";

  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.toString();
  } catch (e) {
    return "";
  }
}

/** Accepts @handle (Threads by default), a known social URL, or a full URL. */
function socialLink(value) {
  const raw = text(value, 300);
  if (!raw) return "";

  let candidate = raw;

  if (!/^https?:\/\//i.test(candidate)) {
    const known = /^(?:www\.)?(threads\.(?:com|net)|instagram\.com|x\.com|twitter\.com|github\.com|tiktok\.com|facebook\.com|linkedin\.com)\//i;

    if (known.test(candidate)) {
      candidate = "https://" + candidate;
    } else {
      const handle = candidate.replace(/^@+/, "").replace(/[^A-Za-z0-9._-]/g, "");
      if (!handle) return "";
      candidate = "https://www.threads.com/@" + handle;
    }
  }

  return link(candidate, 300);
}

/** Returns { owner, name, url } for a public GitHub repository URL. */
function githubRepo(value) {
  const raw = text(value, 300);
  if (!raw) return null;

  let candidate = raw;

  if (!/^https?:\/\//i.test(candidate)) {
    if (/^github\.com\//i.test(candidate)) candidate = "https://" + candidate;
    else if (/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(candidate)) {
      candidate = "https://github.com/" + candidate;
    } else {
      return null;
    }
  }

  let url;
  try {
    url = new URL(candidate);
  } catch (e) {
    return null;
  }

  if (url.hostname.replace(/^www\./i, "").toLowerCase() !== "github.com") return null;

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;

  const owner = parts[0];
  const name = parts[1].replace(/\.git$/i, "");

  if (!/^[A-Za-z0-9-]{1,39}$/.test(owner)) return null;
  if (!/^[A-Za-z0-9._-]{1,100}$/.test(name)) return null;
  if (name === "." || name === "..") return null;

  return { owner, name, url: "https://github.com/" + owner + "/" + name };
}

function fallbackRepo(repo) {
  return {
    owner: repo.owner,
    name: repo.name,
    fullName: repo.owner + "/" + repo.name,
    url: repo.url,
    avatar: "https://github.com/" + encodeURIComponent(repo.owner) + ".png?size=80",
    description: "",
    language: "",
    stars: 0,
    license: "",
    homepage: "",
    pushedAt: "",
  };
}

async function readGithubRepo(repo, env) {
  const headers = {
    accept: "application/vnd.github+json",
    "user-agent": "tenzou.dev",
  };

  if (env.GITHUB_TOKEN) headers.authorization = "Bearer " + env.GITHUB_TOKEN;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(
      "https://api.github.com/repos/" +
        encodeURIComponent(repo.owner) +
        "/" +
        encodeURIComponent(repo.name),
      { headers, signal: controller.signal }
    );

    if (res.status === 404) {
      return { error: "repo tidak ditemukan atau tidak publik." };
    }

    // GitHub rate limit is shared across the worker IP; keep the submission and
    // let the admin verify it instead of rejecting a valid repository.
    if (res.status === 403 || res.status === 429) {
      return { repo: fallbackRepo(repo), unverified: true };
    }

    if (!res.ok) {
      return { error: "gagal memeriksa repo ke GitHub (" + res.status + ")." };
    }

    const data = await res.json();
    const owner = data && data.owner ? text(data.owner.login, 39) : repo.owner;
    const name = text(data && data.name, 100) || repo.name;

    return {
      repo: {
        owner: owner || repo.owner,
        name,
        fullName: text(data && data.full_name, 140) || repo.owner + "/" + repo.name,
        url: link(data && data.html_url, 300) || repo.url,
        avatar:
          link(data && data.owner && data.owner.avatar_url, 500) ||
          "https://github.com/" + encodeURIComponent(owner || repo.owner) + ".png?size=80",
        description: text(data && data.description, 300),
        language: text(data && data.language, 40),
        stars: Math.max(0, Math.floor(Number(data && data.stargazers_count) || 0)),
        license:
          data && data.license && data.license.spdx_id && data.license.spdx_id !== "NOASSERTION"
            ? text(data.license.spdx_id, 40)
            : "",
        homepage: link(data && data.homepage, 300),
        pushedAt: text(data && data.pushed_at, 40),
      },
    };
  } catch (e) {
    return { repo: fallbackRepo(repo), unverified: true };
  } finally {
    clearTimeout(timer);
  }
}

const META_RETRY_MS = 5 * 60 * 1000;

function shouldRefresh(item) {
  if (!item || !item.unverified || !item.repo) return false;
  const last = Date.parse(item.metadataCheckedAt || item.submittedAt || 0);
  return !Number.isFinite(last) || Date.now() - last > META_RETRY_MS;
}

/** Retries GitHub metadata for an item that was saved without it. */
async function refreshItem(item, env) {
  if (!item || !item.repo || !item.repo.owner || !item.repo.name) return false;

  item.metadataCheckedAt = new Date().toISOString();

  const repo = githubRepo(
    "https://github.com/" + item.repo.owner + "/" + item.repo.name
  );
  if (!repo) return false;

  const meta = await readGithubRepo(repo, env);
  if (meta.error || meta.unverified || !meta.repo) return false;

  item.repo = meta.repo;
  item.unverified = false;
  return true;
}

async function readState(env) {
  const raw = await env.CONTENT.get(KEY);
  if (!raw) return { pending: [], approved: [] };

  try {
    const data = JSON.parse(raw);
    return {
      pending: Array.isArray(data && data.pending)
        ? data.pending.filter((item) => item && item.id && item.repo)
        : [],
      approved: Array.isArray(data && data.approved)
        ? data.approved.filter((item) => item && item.id && item.repo)
        : [],
    };
  } catch (e) {
    return { pending: [], approved: [] };
  }
}

async function writeState(env, state) {
  await env.CONTENT.put(
    KEY,
    JSON.stringify({
      pending: state.pending.slice(0, MAX_PENDING),
      approved: state.approved.slice(0, MAX_APPROVED),
    })
  );
}

async function isAdmin(request, env) {
  const session = await getSession(request, env);
  return Boolean(session) || isAuthorized(request, env);
}

function sameRepo(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

async function hashIp(ip, env) {
  const input = new TextEncoder().encode(String(ip) + "|" + String(env.SESSION_SECRET || "tenzou"));
  const digest = await crypto.subtle.digest("SHA-256", input);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

export async function onRequestGet({ request, env }) {
  if (!env.CONTENT) return json({ ok: false, error: "KV binding CONTENT belum diset" }, 500);

  const state = await readState(env);
  const url = new URL(request.url);

  if (url.searchParams.get("all") === "1") {
    if (!(await isAdmin(request, env))) {
      return json({ ok: false, error: "unauthorized" }, 401);
    }

    let attempted = false;
    for (const item of [...state.pending, ...state.approved]) {
      if (!shouldRefresh(item)) continue;
      attempted = true;
      await refreshItem(item, env);
    }
    if (attempted) await writeState(env, state);

    return json({
      ok: true,
      pending: state.pending,
      approved: state.approved,
    });
  }

  return json({ ok: true, projects: state.approved });
}

export async function onRequestPost({ request, env }) {
  if (!env.CONTENT) return json({ ok: false, error: "KV binding CONTENT belum diset" }, 500);

  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ ok: false, error: "kiriman terlalu besar" }, 413);

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    return json({ ok: false, error: "json tidak valid" }, 400);
  }

  const state = await readState(env);
  const action = text(data && data.action, 20);

  /* ---------- admin moderation ---------- */

  if (action) {
    if (!(await isAdmin(request, env))) {
      return json({ ok: false, error: "unauthorized" }, 401);
    }

    const id = text(data && data.id, 80);
    if (!id) return json({ ok: false, error: "id wajib diisi" }, 400);

    const pendingIndex = state.pending.findIndex((item) => item.id === id);
    const approvedIndex = state.approved.findIndex((item) => item.id === id);

    if (action === "approve") {
      if (pendingIndex < 0) return json({ ok: false, error: "project tidak ditemukan" }, 404);
      const item = state.pending.splice(pendingIndex, 1)[0];
      item.approvedAt = new Date().toISOString();
      state.approved.unshift(item);
      await writeState(env, state);
      return json({ ok: true, approved: state.approved, pending: state.pending });
    }

    if (action === "reject") {
      if (pendingIndex < 0) return json({ ok: false, error: "project tidak ditemukan" }, 404);
      state.pending.splice(pendingIndex, 1);
      await writeState(env, state);
      return json({ ok: true, approved: state.approved, pending: state.pending });
    }

    if (action === "delete") {
      if (pendingIndex >= 0) state.pending.splice(pendingIndex, 1);
      if (approvedIndex >= 0) state.approved.splice(approvedIndex, 1);
      if (pendingIndex < 0 && approvedIndex < 0) {
        return json({ ok: false, error: "project tidak ditemukan" }, 404);
      }
      await writeState(env, state);
      return json({ ok: true, approved: state.approved, pending: state.pending });
    }

    if (action === "refresh") {
      const items = id
        ? [...state.pending, ...state.approved].filter((item) => item.id === id)
        : [...state.pending, ...state.approved].filter((item) => item.unverified);

      if (!items.length) {
        return json({ ok: false, error: "project tidak ditemukan" }, 404);
      }

      let refreshed = 0;
      for (const item of items) {
        if (await refreshItem(item, env)) refreshed += 1;
      }
      await writeState(env, state);

      return json({
        ok: true,
        refreshed,
        approved: state.approved,
        pending: state.pending,
      });
    }

    return json({ ok: false, error: "aksi tidak dikenal" }, 400);
  }

  /* ---------- public submission ---------- */

  // Honeypot: real visitors never fill this field.
  if (text(data && data.website, 80)) {
    return json({ ok: false, error: "ditolak" }, 400);
  }

  const title = text(data && data.title, 80);
  const description = text(data && data.description, 400);
  const author = text(data && data.author, 60);
  const social = socialLink(data && data.social);
  const demo = link(data && data.demo, 300);
  const repo = githubRepo(data && data.repo);
  const consent = data && (data.consent === true || data.consent === "true" || data.consent === "on");

  if (title.length < 3) return json({ ok: false, error: "judul minimal 3 karakter." }, 400);
  if (description.length < 10) {
    return json({ ok: false, error: "deskripsi minimal 10 karakter." }, 400);
  }
  if (!repo) {
    return json(
      { ok: false, error: "link repo harus URL GitHub, mis. github.com/username/repo." },
      400
    );
  }
  if (!consent) {
    return json({ ok: false, error: "persetujuan wajib dicentang." }, 400);
  }

  if (
    state.pending.some((item) => sameRepo(item.repo && item.repo.url, repo.url)) ||
    state.approved.some((item) => sameRepo(item.repo && item.repo.url, repo.url))
  ) {
    return json({ ok: false, error: "repo ini sudah ada di daftar." }, 409);
  }

  const ip = request.headers.get("cf-connecting-ip");
  if (ip) {
    const rateKey = "community:rate:" + (await hashIp(ip, env));
    const used = Number(await env.CONTENT.get(rateKey)) || 0;
    if (used >= RATE_LIMIT) {
      return json({ ok: false, error: "terlalu banyak kiriman. coba lagi nanti." }, 429);
    }
    try {
      await env.CONTENT.put(rateKey, String(used + 1), { expirationTtl: RATE_TTL });
    } catch (e) {
      /* rate limit is best-effort */
    }
  }

  const meta = await readGithubRepo(repo, env);
  if (meta.error) return json({ ok: false, error: meta.error }, 502);

  const project = {
    id: crypto.randomUUID(),
    title,
    description,
    author,
    social,
    demo,
    repo: meta.repo,
    unverified: Boolean(meta.unverified),
    metadataCheckedAt: new Date().toISOString(),
    submittedAt: new Date().toISOString(),
    approvedAt: null,
  };

  // The owner adding a repo from /admin (or while signed in) publishes it
  // immediately; visitor submissions wait for review.
  if (await isAdmin(request, env)) {
    project.approvedAt = new Date().toISOString();
    state.approved.unshift(project);
    await writeState(env, state);

    return json({
      ok: true,
      message: "project ditambahkan ke komunitas ✓",
      project,
    });
  }

  state.pending.unshift(project);
  await writeState(env, state);

  return json({
    ok: true,
    message: "terkirim — project akan tampil setelah direview tenzou.",
  });
}
