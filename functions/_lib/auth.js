/**
 * GitHub OAuth + signed session cookies.
 *
 * Production variables:
 *   GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_OWNER, SESSION_SECRET
 * Optional:
 *   GITHUB_ALLOWED_USERS (comma separated), OAUTH_CALLBACK_URL
 */
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function githubConfigured(env) {
  return Boolean(
    env.GITHUB_CLIENT_ID &&
      env.GITHUB_CLIENT_SECRET &&
      env.GITHUB_OWNER &&
      env.SESSION_SECRET
  );
}

export function callbackUrl(request, env) {
  if (env.OAUTH_CALLBACK_URL) return env.OAUTH_CALLBACK_URL;
  return new URL("/api/auth/callback", request.url).toString();
}

export function getCookie(request, name) {
  const raw = request.headers.get("cookie") || "";

  for (const part of raw.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() !== name) continue;
    return decodeURIComponent(part.slice(index + 1).trim());
  }

  return "";
}

function secureFlag(request) {
  return new URL(request.url).protocol === "https:" ? " Secure;" : "";
}

export function sessionCookie(request, token, maxAge = 604800) {
  return `tz_session=${token}; HttpOnly;${secureFlag(request)} SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export function clearSessionCookie(request) {
  return `tz_session=; HttpOnly;${secureFlag(request)} SameSite=Lax; Path=/; Max-Age=0`;
}

export function stateCookie(request, state) {
  return `tz_oauth_state=${state}; HttpOnly;${secureFlag(request)} SameSite=Lax; Path=/; Max-Age=600`;
}

export function clearStateCookie(request) {
  return `tz_oauth_state=; HttpOnly;${secureFlag(request)} SameSite=Lax; Path=/; Max-Age=0`;
}

export function randomState() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function sign(payload, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

function same(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function allowedLogins(env) {
  const raw = [env.GITHUB_OWNER, env.GITHUB_ALLOWED_USERS].filter(Boolean).join(",");
  return new Set(
    raw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isOwner(login, env) {
  const name = String(login || "").toLowerCase();
  return Boolean(name) && allowedLogins(env).has(name);
}

export async function createSession(login, env, days = 7) {
  const payload = toBase64Url(
    encoder.encode(
      JSON.stringify({
        login,
        exp: Date.now() + days * 86400000,
      })
    )
  );
  const signature = await sign(payload, env.SESSION_SECRET);
  return payload + "." + signature;
}

export async function getSession(request, env) {
  if (!env.SESSION_SECRET) return null;

  const token = getCookie(request, "tz_session");
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = await sign(payload, env.SESSION_SECRET);
  if (!same(signature, expected)) return null;

  try {
    const data = JSON.parse(decoder.decode(fromBase64Url(payload)));
    if (!data || typeof data.login !== "string") return null;
    if (!Number.isFinite(data.exp) || data.exp < Date.now()) return null;
    if (!isOwner(data.login, env)) return null;
    return data;
  } catch (e) {
    return null;
  }
}
