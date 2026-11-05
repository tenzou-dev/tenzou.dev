import { clearSessionCookie, getSession } from "../../_lib/auth.js";
import { json } from "../../_lib/http.js";

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ ok: false }, 401);
  return json({ ok: true, login: session.login });
}

export async function onRequestDelete({ request }) {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  headers.append("set-cookie", clearSessionCookie(request));
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
