import { getSession } from "../_lib/auth.js";
import { isAuthorized, json } from "../_lib/http.js";

const MAX_BODY = 200_000;
const SOCIAL_TYPES = new Set(["email", "github", "x", "telegram", "link"]);
const GITHUB_USER = /^[A-Za-z0-9-]{1,39}$/;

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeTags(value) {
  const list = Array.isArray(value) ? value : String(value || "").split(",");
  const seen = new Set();

  return list
    .map((tag) => text(tag, 24).replace(/^#+/, "").toLowerCase().replace(/\s+/g, " "))
    .filter((tag) => {
      if (!tag || seen.has(tag)) return false;
      seen.add(tag);
      return true;
    })
    .slice(0, 6);
}

function text(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function link(value, allowMail) {
  const raw = text(value, 500);
  if (!raw) return "";
  if (/^https?:\/\/\S+$/i.test(raw)) return raw;
  if (allowMail && /^mailto:\S+$/i.test(raw)) return raw;
  return "";
}

/**
 * Keeps only the fields we render, trims lengths and drops unsafe links.
 */
function sanitize(input) {
  const data = input && typeof input === "object" ? input : {};

  const name = text(data.name, 12);
  if (!name) throw new Error("nama wajib diisi");

  const github = text(data.github, 39);

  const socials = (Array.isArray(data.socials) ? data.socials : [])
    .slice(0, 8)
    .map((item) => ({
      type: SOCIAL_TYPES.has(item && item.type) ? item.type : "link",
      url: link(item && item.url, true),
    }))
    .filter((item) => item.url);

  const usedSlugs = new Set();

  const posts = (Array.isArray(data.posts) ? data.posts : [])
    .slice(0, 50)
    .map((post) => {
      const title = text(post && post.title, 160);
      if (!title) return null;

      const date = text(post && post.date, 10);
      const base = slugify(post && post.slug) || slugify(title) || "post";
      let slug = base;
      let suffix = 2;
      while (usedSlugs.has(slug)) {
        slug = base + "-" + suffix;
        suffix += 1;
      }
      usedSlugs.add(slug);

      return {
        title,
        slug,
        date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "",
        summary: text(post && post.summary, 400),
        tags: normalizeTags(post && post.tags),
        body: text(post && post.body, 20000),
      };
    })
    .filter(Boolean);

  const projects = (Array.isArray(data.projects) ? data.projects : [])
    .slice(0, 30)
    .map((project) => ({
      title: text(project && project.title, 120),
      description: text(project && project.description, 300),
      url: link(project && project.url, false),
      meta: text(project && project.meta, 60),
    }))
    .filter((project) => project.title);

  return {
    name,
    intro: text(data.intro, 700),
    version: text(data.version, 40),
    github: GITHUB_USER.test(github) ? github : "",
    socials,
    projects,
    posts,
  };
}

export async function onRequestGet({ env }) {
  if (!env.CONTENT) {
    return json({ ok: false, error: "KV binding CONTENT belum diset" }, 500);
  }

  const raw = await env.CONTENT.get("content");
  if (!raw) return json({ ok: true, content: null });

  try {
    return json({ ok: true, content: JSON.parse(raw) });
  } catch (e) {
    return json({ ok: false, error: "konten tersimpan rusak" }, 500);
  }
}

export async function onRequestPut({ request, env }) {
  if (!env.CONTENT) {
    return json({ ok: false, error: "KV binding CONTENT belum diset" }, 500);
  }

  const session = await getSession(request, env);
  const allowed = Boolean(session) || isAuthorized(request, env);

  if (!allowed) {
    const configured = Boolean(env.ADMIN_PASSWORD || env.SESSION_SECRET);
    return json(
      { ok: false, error: configured ? "unauthorized" : "admin belum dikonfigurasi" },
      configured ? 401 : 500
    );
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY) {
    return json({ ok: false, error: "konten terlalu besar" }, 413);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return json({ ok: false, error: "json tidak valid" }, 400);
  }

  let content;
  try {
    content = sanitize(parsed);
  } catch (e) {
    return json({ ok: false, error: e.message }, 400);
  }

  await env.CONTENT.put("content", JSON.stringify(content));

  return json({ ok: true, content });
}
