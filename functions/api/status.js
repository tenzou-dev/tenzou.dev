import { json } from "../_lib/http.js";

/**
 * Footer version, straight from the commit that is currently deployed.
 *
 * Cloudflare Pages exposes CF_PAGES_COMMIT_SHA to Functions. We use the
 * GitHub API once per deployment to turn that commit into a readable version
 * (v1.<commit count>.0-<short sha>) and to find when the repo went live.
 * The result is cached in KV so regular visits never touch GitHub.
 */
const REPO = "tenzou-dev/tenzou.dev";
const CACHE_KEY = "site:status";
const CACHE_TTL = 60 * 60 * 24 * 7;

async function readCache(env) {
  if (!env.CONTENT || typeof env.CONTENT.get !== "function") return null;

  try {
    const raw = await env.CONTENT.get(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : null;
  } catch (e) {
    return null;
  }
}

async function writeCache(env, data) {
  if (!env.CONTENT || typeof env.CONTENT.put !== "function") return;

  try {
    await env.CONTENT.put(CACHE_KEY, JSON.stringify(data), { expirationTtl: CACHE_TTL });
  } catch (e) {
    /* cache is optional */
  }
}

async function fromGithub(deployedSha) {
  const headers = {
    accept: "application/vnd.github+json",
    "user-agent": "tenzou.dev",
  };

  const commitsResponse = await fetch(
    "https://api.github.com/repos/" + REPO + "/commits?per_page=1",
    { headers }
  );

  if (!commitsResponse.ok) throw new Error("github " + commitsResponse.status);

  const commits = await commitsResponse.json();
  const latest = Array.isArray(commits) && commits[0] ? commits[0].sha : "";

  const link = commitsResponse.headers.get("link") || "";
  const lastPage = /[?&]page=(\d+)>;\s*rel="last"/.exec(link);
  const count = lastPage ? Number(lastPage[1]) : Array.isArray(commits) && commits.length ? 1 : 0;

  let since = "";
  try {
    const repoResponse = await fetch("https://api.github.com/repos/" + REPO, { headers });
    if (repoResponse.ok) {
      const repo = await repoResponse.json();
      since = String(repo.created_at || "");
    }
  } catch (e) {
    /* uptime is optional */
  }

  const sha = String(deployedSha || latest || "").trim();
  const short = sha.slice(0, 7);
  const total = Number.isFinite(count) && count > 0 ? count : 1;

  return {
    ok: true,
    version: short ? "v1." + total + ".0-" + short : "",
    commit: short,
    commits: total,
    since,
    sha,
    at: Date.now(),
  };
}

export async function onRequestGet({ env }) {
  const deployed = String(env.CF_PAGES_COMMIT_SHA || "").trim();
  const cached = await readCache(env);

  if (cached) {
    const fresh = Date.now() - Number(cached.at || 0) < 60 * 60 * 1000;
    if ((deployed && cached.sha === deployed) || (!deployed && fresh)) {
      return json(cached);
    }
  }

  try {
    const status = await fromGithub(deployed);
    await writeCache(env, status);
    return json(status);
  } catch (e) {
    return json({ ok: false }, 200);
  }
}
