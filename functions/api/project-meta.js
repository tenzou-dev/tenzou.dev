import { getSession } from "../_lib/auth.js";
import { isAuthorized, json } from "../_lib/http.js";

/**
 * Detects a project's language / stack from its URL.
 *
 *   GET /api/project-meta?url=https://example.com
 *
 * GitHub repos use the GitHub API (language + topics). Other pages are fetched
 * once and inspected for framework markers in HTML, headers, scripts and CSS.
 * The result is only a hint: the admin can always edit the field by hand.
 */
const TIMEOUT = 7000;
const MAX_HTML = 400_000;
const MAX_ASSET = 220_000;
const MAX_REDIRECTS = 4;

const TOPIC_LABELS = {
  nextjs: "Next.js",
  "next-js": "Next.js",
  react: "React",
  vue: "Vue",
  nuxt: "Nuxt",
  svelte: "Svelte",
  sveltekit: "SvelteKit",
  astro: "Astro",
  angular: "Angular",
  solidjs: "Solid",
  "solid-js": "Solid",
  preact: "Preact",
  laravel: "Laravel",
  django: "Django",
  flask: "Flask",
  rails: "Rails",
  ruby: "Ruby",
  phoenix: "Phoenix",
  express: "Express",
  nodejs: "Node.js",
  "node.js": "Node.js",
  typescript: "TypeScript",
  javascript: "JavaScript",
  python: "Python",
  golang: "Go",
  go: "Go",
  rust: "Rust",
  php: "PHP",
  tailwindcss: "Tailwind CSS",
  tailwind: "Tailwind CSS",
  bootstrap: "Bootstrap",
  wordpress: "WordPress",
  hugo: "Hugo",
  jekyll: "Jekyll",
  eleventy: "Eleventy",
  gatsby: "Gatsby",
  remix: "Remix",
};

const HOST_LABELS = [
  [".pages.dev", "Cloudflare Pages"],
  [".vercel.app", "Vercel"],
  [".netlify.app", "Netlify"],
  [".github.io", "GitHub Pages"],
  [".web.app", "Firebase"],
  [".firebaseapp.com", "Firebase"],
  [".surge.sh", "Surge"],
];

const ORDER = new Map(
  [
    "Next.js",
    "Nuxt",
    "SvelteKit",
    "Astro",
    "Gatsby",
    "Remix",
    "Docusaurus",
    "React",
    "Vue",
    "Solid",
    "Preact",
    "Angular",
    "Svelte",
    "Laravel",
    "Django",
    "Flask",
    "Express",
    "Rails",
    "Phoenix",
    "WordPress",
    "Shopify",
    "Webflow",
    "Framer",
    "Wix",
    "Squarespace",
    "Ghost",
    "Hugo",
    "Jekyll",
    "Eleventy",
    "JavaScript",
    "TypeScript",
    "PHP",
    "Python",
    "Ruby",
    "Go",
    "Rust",
    "Java",
    "Kotlin",
    "Swift",
    "C#",
    "C++",
    "Supabase",
    "Firebase",
    "PocketBase",
    "Tailwind CSS",
    "Bootstrap",
    "jQuery",
    "Cloudflare Pages",
    "Vercel",
    "Netlify",
    "GitHub Pages",
    "Surge",
  ].map((name, index) => [name, index])
);

function rank(label) {
  return ORDER.has(label) ? ORDER.get(label) : ORDER.size;
}

function isPrivateHost(host) {
  const h = String(host || "").toLowerCase();
  if (!h) return true;
  if (h === "localhost" || h === "0.0.0.0" || h === "::1" || h === "[::1]") return true;
  if (h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".localhost")) return true;
  if (h.startsWith("[") || h.includes(":")) return true;

  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (!match) return false;

  const a = Number(match[1]);
  const b = Number(match[2]);
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
}

function safeTarget(raw) {
  try {
    const url = new URL(String(raw || "").trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname || isPrivateHost(url.hostname)) return null;
    url.hash = "";
    return url;
  } catch (e) {
    return null;
  }
}

async function readLimited(res, max) {
  if (!res.body || typeof res.body.getReader !== "function") {
    return (await res.text()).slice(0, max);
  }

  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;

  while (total < max) {
    const { done, value } = await reader.read();
    if (done) break;
    const take = value.length > max - total ? value.subarray(0, max - total) : value;
    chunks.push(take);
    total += take.length;
    if (take.length < value.length) break;
  }

  try {
    await reader.cancel();
  } catch (e) {
    /* ignore */
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }

  return new TextDecoder("utf-8", { fatal: false }).decode(out);
}

async function fetchSafe(target, max, accept) {
  let current = safeTarget(target);
  if (!current) return { ok: false, text: "", url: "", headers: "" };

  for (let hop = 0; hop < MAX_REDIRECTS; hop += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      const res = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; tenzou.dev project metadata)",
          accept: accept || "text/html,application/xhtml+xml,*/*;q=0.8",
        },
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) return { ok: false, text: "", url: current.toString(), headers: "" };
        current = safeTarget(new URL(location, current).toString());
        if (!current) return { ok: false, text: "", url: "", headers: "" };
        continue;
      }

      if (!res.ok) {
        return { ok: false, text: "", url: current.toString(), headers: "" };
      }

      const text = await readLimited(res, max);
      const headers = [...res.headers.entries()]
        .map(([key, value]) => key + ": " + value)
        .join("\n");

      return { ok: true, text, url: current.toString(), headers };
    } catch (e) {
      return { ok: false, text: "", url: current.toString(), headers: "" };
    } finally {
      clearTimeout(timer);
    }
  }

  return { ok: false, text: "", url: current.toString(), headers: "" };
}

function hostLabel(hostname) {
  const host = String(hostname || "").toLowerCase();
  const found = HOST_LABELS.find(([suffix]) => host.endsWith(suffix));
  return found ? found[1] : "";
}

function generator(html) {
  const match = /<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i.exec(html);
  return match ? match[1].trim() : "";
}

function detectMarkup(html, headers) {
  const page = html.toLowerCase();
  const head = headers.toLowerCase();
  const assets = [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => match[1].toLowerCase())
    .join(" ");
  const gen = generator(html).toLowerCase();
  const blob = page + " " + assets + " " + head + " " + gen;
  const found = [];
  const add = (name) => {
    if (name && !found.includes(name)) found.push(name);
  };

  if (/__next_data__|\/_next\//.test(blob) || /x-powered-by: *next\.js/.test(head)) add("Next.js");
  if (/__nuxt__|\/_nuxt\//.test(blob) || /x-powered-by: *nuxt/.test(head)) add("Nuxt");
  if (/__sveltekit|\/_app\/immutable\/|sveltekit/.test(blob)) add("SvelteKit");
  if (/astro-island|\/_astro\/|astro\.build/.test(blob)) add("Astro");
  if (/___gatsby|gatsby/.test(blob)) add("Gatsby");
  if (/__remix|remix\.run/.test(blob)) add("Remix");
  if (/docusaurus/.test(blob)) add("Docusaurus");
  if (/data-reactroot|data-reactid|__react|react-dom|\/react[-.@/]/.test(blob)) add("React");
  if (/data-v-[0-9a-f]{6,}|__vue__|vue\.runtime|\/vue[-.@/]/.test(blob)) add("Vue");
  if (/data-solid|solid-js|\/solid[-.@/]/.test(blob)) add("Solid");
  if (/preact/.test(blob)) add("Preact");
  if (/ng-version|angular(?:\.min)?\.js/.test(blob)) add("Angular");
  if (/wp-content|wp-includes|wordpress/.test(blob)) add("WordPress");
  if (/shopify/.test(blob)) add("Shopify");
  if (/webflow/.test(blob)) add("Webflow");
  if (/framerusercontent|framer\.com/.test(blob)) add("Framer");
  if (/wix\.com|wixstatic/.test(blob)) add("Wix");
  if (/squarespace/.test(blob)) add("Squarespace");
  if (/laravel_session|laravel/.test(blob)) add("Laravel");
  if (/x-powered-by: *express/.test(head)) add("Express");
  if (/x-powered-by: *php/.test(head)) add("PHP");
  if (/x-powered-by: *asp\.net/.test(head)) add("ASP.NET");

  if (/^hugo\b/.test(gen)) add("Hugo");
  if (/^jekyll\b/.test(gen)) add("Jekyll");
  if (/^ghost\b/.test(gen)) add("Ghost");
  if (/^eleventy\b|^11ty\b/.test(gen)) add("Eleventy");
  if (/^astro\b/.test(gen)) add("Astro");
  if (/^docusaurus\b/.test(gen)) add("Docusaurus");
  if (/^wordpress\b/.test(gen)) add("WordPress");

  return found;
}

function detectAssets(text) {
  const blob = String(text || "").toLowerCase();
  const found = [];
  const add = (name) => {
    if (name && !found.includes(name)) found.push(name);
  };

  if (/react\.production|react-dom|symbol\.for\(["']react|__react/.test(blob)) add("React");
  if (/vue\.runtime|__vue__|createapp\(/.test(blob)) add("Vue");
  if (/svelte/.test(blob)) add("Svelte");
  if (/solid-js|createSignal/.test(blob) && /solid/.test(blob)) add("Solid");
  if (/preact/.test(blob)) add("Preact");
  if (/angular/.test(blob)) add("Angular");
  if (/jquery/.test(blob)) add("jQuery");
  if (/--tw-/.test(blob)) add("Tailwind CSS");
  if (/--bs-|bootstrap/.test(blob)) add("Bootstrap");
  if (/supabase/.test(blob)) add("Supabase");
  if (/firebase/.test(blob)) add("Firebase");
  if (/pocketbase/.test(blob)) add("PocketBase");

  return found;
}

function assetUrls(html, base) {
  const scripts = [];
  const styles = [];

  for (const match of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
    scripts.push(match[1]);
  }
  for (const match of html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)) {
    const tag = match[0].toLowerCase();
    if (tag.includes("stylesheet")) styles.push(match[1]);
  }

  const resolve = (value) => {
    try {
      return new URL(value, base).toString();
    } catch (e) {
      return "";
    }
  };

  const usable = (url) =>
    /^https?:\/\//i.test(url) &&
    !/(google-analytics|googletagmanager|gtag|hotjar|clarity|sentry|segment|facebook|doubleclick)/i.test(url);

  const unique = (list) => [...new Set(list.map(resolve).filter(usable))];

  return {
    scripts: unique(scripts).slice(0, 2),
    styles: unique(styles).slice(0, 2),
  };
}

async function githubStack(target) {
  const host = target.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "github.com") return null;

  const parts = target.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return "";

  const api = "https://api.github.com/repos/" + parts[0] + "/" + parts[1].replace(/\.git$/i, "");
  const result = await fetchSafe(api, 200_000, "application/vnd.github+json");
  if (!result.ok) return "";

  let repo;
  try {
    repo = JSON.parse(result.text);
  } catch (e) {
    return "";
  }

  const labels = [];
  const add = (name) => {
    if (name && !labels.includes(name)) labels.push(name);
  };

  add(repo.language);
  if (Array.isArray(repo.topics)) {
    repo.topics.forEach((topic) => add(TOPIC_LABELS[String(topic).toLowerCase()]));
  }

  return labels.slice(0, 4).join(" · ");
}

async function detect(target) {
  const fromGithub = await githubStack(target);
  if (fromGithub !== null) {
    if (fromGithub) return fromGithub;
    return hostLabel(target.hostname);
  }

  const page = await fetchSafe(target.toString(), MAX_HTML);
  if (!page.ok) return "";

  const labels = detectMarkup(page.text, page.headers);

  const add = (name) => {
    if (name && !labels.includes(name)) labels.push(name);
  };

  const { scripts, styles } = assetUrls(page.text, page.url || target.toString());
  const requests = [
    ...scripts.map((url) => fetchSafe(url, MAX_ASSET, "text/javascript,application/javascript,*/*;q=0.8")),
    ...styles.map((url) => fetchSafe(url, MAX_ASSET, "text/css,*/*;q=0.8")),
  ];
  const assets = await Promise.all(requests);

  assets.forEach((asset) => {
    if (asset.ok) detectAssets(asset.text).forEach(add);
  });

  const framework = /^(Next\.js|Nuxt|SvelteKit|Astro|Gatsby|Remix|Docusaurus|React|Vue|Solid|Preact|Angular)$/;
  const known = labels.some((label) => framework.test(label));

  if (!known && scripts.length) add("JavaScript");
  if (!known && !scripts.length && styles.length) add("HTML/CSS");

  const host = hostLabel(target.hostname);
  if (host) add(host);

  labels.sort((a, b) => rank(a) - rank(b));
  return labels.slice(0, 4).join(" · ");
}

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env);
  const allowed = Boolean(session) || isAuthorized(request, env);
  if (!allowed) return json({ ok: false, error: "unauthorized" }, 401);

  const url = new URL(request.url);
  const target = safeTarget(url.searchParams.get("url"));
  if (!target) return json({ ok: false, error: "url tidak valid" }, 400);

  const stack = await detect(target);
  return json({ ok: true, stack });
}
