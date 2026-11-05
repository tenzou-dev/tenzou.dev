/**
 * Local dev server for tenzou.dev — no dependencies, no wrangler needed.
 *
 *   node dev-server.mjs
 *   ADMIN_PASSWORD=rahasia node dev-server.mjs
 *
 * Serves the static files, the Pages Functions in functions/api, and fakes
 * Cloudflare geo data so the coordinate line shows up locally.
 * Content saved from /admin is kept in .dev-content.json (git-ignored).
 */
import { createServer } from "node:http";
import { readFile, writeFile, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { onRequestGet as getContent, onRequestPut as putContent } from "./functions/api/content.js";
import { onRequestPost as postAuth } from "./functions/api/auth.js";
import { onRequestGet as getAuthConfig } from "./functions/api/auth/config.js";
import {
  onRequestGet as getAuthSession,
  onRequestDelete as deleteAuthSession,
} from "./functions/api/auth/session.js";
import { onRequestGet as getGithubStart } from "./functions/api/auth/github.js";
import { onRequestGet as getGithubCallback } from "./functions/api/auth/callback.js";
import { onRequestGet as getWhere } from "./functions/api/where.js";
import { onRequestGet as getStatus } from "./functions/api/status.js";
import { onRequestGet as getBlog, onRequestPost as postBlog } from "./functions/api/blog.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const password = process.env.ADMIN_PASSWORD || "admin";
const storePath = path.join(root, ".dev-content.json");

const kv = {
  async get(key) {
    try {
      const map = JSON.parse(readFileSync(storePath, "utf8"));
      return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null;
    } catch (e) {
      return null;
    }
  },
  async put(key, value) {
    let map = {};
    try {
      map = JSON.parse(readFileSync(storePath, "utf8"));
    } catch (e) {
      map = {};
    }
    map[key] = value;
    await writeFile(storePath, JSON.stringify(map, null, 2), "utf8");
  },
};

const env = {
  CONTENT: kv,
  ADMIN_PASSWORD: password,
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || "",
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || "",
  GITHUB_OWNER: process.env.GITHUB_OWNER || "",
  GITHUB_ALLOWED_USERS: process.env.GITHUB_ALLOWED_USERS || "",
  SESSION_SECRET: process.env.SESSION_SECRET || "",
  OAUTH_CALLBACK_URL: process.env.OAUTH_CALLBACK_URL || "",
  CF_PAGES_COMMIT_SHA: process.env.CF_PAGES_COMMIT_SHA || "",
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "cache-control": "no-store", ...headers });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function toRequest(req, url) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (["host", "connection", "content-length", "accept-encoding"].includes(key)) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }

  const init = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await readBody(req);
  }

  const request = new Request(url, init);

  // Mirrors request.cf on Cloudflare.
  try {
    Object.defineProperty(request, "cf", {
      value: { latitude: "6.20880", longitude: "106.84560", city: "Jakarta", country: "ID" },
    });
  } catch (e) {
    /* ignore */
  }

  return request;
}

async function proxy(res, response) {
  const body = Buffer.from(await response.arrayBuffer());
  const headers = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  res.writeHead(response.status, headers);
  res.end(body);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
  const pathname = decodeURIComponent(url.pathname);

  try {
    if (pathname.startsWith("/api/")) {
      const request = await toRequest(req, url);
      const context = { request, env, params: {}, waitUntil() {} };

      if (pathname === "/api/content") {
        return proxy(res, req.method === "PUT" ? await putContent(context) : await getContent(context));
      }
      if (pathname === "/api/auth" && req.method === "POST") {
        return proxy(res, await postAuth(context));
      }
      if (pathname === "/api/auth/config") {
        return proxy(res, await getAuthConfig(context));
      }
      if (pathname === "/api/auth/session") {
        return proxy(
          res,
          req.method === "DELETE" ? await deleteAuthSession(context) : await getAuthSession(context)
        );
      }
      if (pathname === "/api/auth/github") {
        return proxy(res, await getGithubStart(context));
      }
      if (pathname === "/api/auth/callback") {
        return proxy(res, await getGithubCallback(context));
      }
      if (pathname === "/api/where") {
        return proxy(res, await getWhere(context));
      }
      if (pathname === "/api/status") {
        return proxy(res, await getStatus(context));
      }
      if (pathname === "/api/blog") {
        return proxy(res, req.method === "POST" ? await postBlog(context) : await getBlog(context));
      }

      return send(res, 404, JSON.stringify({ ok: false, error: "not found" }), {
        "content-type": "application/json; charset=utf-8",
      });
    }

    let filePath = path.join(root, pathname === "/" ? "index.html" : pathname);
    if (!path.resolve(filePath).startsWith(root)) {
      return send(res, 403, "forbidden", { "content-type": "text/plain; charset=utf-8" });
    }
    if (!existsSync(filePath) && !path.extname(filePath)) filePath += ".html";

    const info = await stat(filePath).catch(() => null);
    if (!info || info.isDirectory()) {
      return send(res, 404, "not found", { "content-type": "text/plain; charset=utf-8" });
    }

    const data = await readFile(filePath);
    send(res, 200, data, {
      "content-type": MIME[path.extname(filePath)] || "application/octet-stream",
    });
  } catch (e) {
    console.error(e);
    send(res, 500, "server error", { "content-type": "text/plain; charset=utf-8" });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`tenzou.dev dev server → http://127.0.0.1:${port}`);
  console.log(`/admin password: ${password}${process.env.ADMIN_PASSWORD ? "" : " (default — set ADMIN_PASSWORD to change)"}`);
});
