import { json } from "../_lib/http.js";

/**
 * Blog engagement: likes and comments, stored per post slug in KV.
 *
 *   GET  /api/blog?slug=hello-world
 *   POST /api/blog  { slug, action: "like" | "unlike" }
 *   POST /api/blog  { slug, action: "comment", name, body, website }
 *
 * Content itself lives in /api/content. This endpoint only owns the parts that
 * change without an admin save, so likes/comments survive content updates.
 */
const KEY_PREFIX = "blog:";
const MAX_BODY = 12_000;
const MAX_COMMENTS = 200;
const MAX_COMMENT_BODY = 1000;
const MAX_NAME = 40;

function clean(value, max) {
  return typeof value === "string" ? value.replace(/\r\n/g, "\n").trim().slice(0, max) : "";
}

function postSlug(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function keyFor(slug) {
  return KEY_PREFIX + slug;
}

async function readState(env, slug) {
  const raw = await env.CONTENT.get(keyFor(slug));
  if (!raw) return { likes: 0, comments: [] };

  try {
    const data = JSON.parse(raw);
    return {
      likes: Math.max(0, Math.floor(Number(data && data.likes) || 0)),
      comments: Array.isArray(data && data.comments) ? data.comments : [],
    };
  } catch (e) {
    return { likes: 0, comments: [] };
  }
}

export async function onRequestGet({ request, env }) {
  if (!env.CONTENT) return json({ ok: false, error: "KV belum diset" }, 500);

  const url = new URL(request.url);
  const slug = postSlug(url.searchParams.get("slug"));
  if (!slug) return json({ ok: false, error: "slug tidak valid" }, 400);

  const state = await readState(env, slug);
  return json({ ok: true, likes: state.likes, comments: state.comments });
}

export async function onRequestPost({ request, env }) {
  if (!env.CONTENT) return json({ ok: false, error: "KV belum diset" }, 500);

  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ ok: false, error: "terlalu besar" }, 413);

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    return json({ ok: false, error: "json tidak valid" }, 400);
  }

  const slug = postSlug(data && data.slug);
  if (!slug) return json({ ok: false, error: "slug tidak valid" }, 400);

  const action = clean(data && data.action, 20);
  const state = await readState(env, slug);

  if (action === "like" || action === "unlike") {
    state.likes = Math.max(0, state.likes + (action === "like" ? 1 : -1));
    await env.CONTENT.put(keyFor(slug), JSON.stringify(state));
    return json({ ok: true, likes: state.likes });
  }

  if (action === "comment") {
    // Honeypot field: real people never see it.
    if (clean(data && data.website, 80)) {
      return json({ ok: false, error: "ditolak" }, 400);
    }

    const name = clean(data && data.name, MAX_NAME);
    const body = clean(data && data.body, MAX_COMMENT_BODY);

    if (!name) return json({ ok: false, error: "nama wajib diisi" }, 400);
    if (!body) return json({ ok: false, error: "komentar wajib diisi" }, 400);

    const comment = {
      id: crypto.randomUUID(),
      name,
      body,
      at: new Date().toISOString(),
    };

    state.comments.unshift(comment);
    state.comments = state.comments.slice(0, MAX_COMMENTS);
    await env.CONTENT.put(keyFor(slug), JSON.stringify(state));

    return json({ ok: true, comment, likes: state.likes, comments: state.comments });
  }

  return json({ ok: false, error: "aksi tidak dikenal" }, 400);
}
