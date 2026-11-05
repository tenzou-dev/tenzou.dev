import { callbackUrl, githubConfigured, randomState, stateCookie } from "../../_lib/auth.js";
import { json } from "../../_lib/http.js";

export async function onRequestGet({ request, env }) {
  if (!githubConfigured(env)) {
    return json({ ok: false, error: "Login GitHub belum dikonfigurasi" }, 500);
  }

  const state = randomState();
  const target = new URL("https://github.com/login/oauth/authorize");
  target.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  target.searchParams.set("redirect_uri", callbackUrl(request, env));
  target.searchParams.set("scope", "read:user");
  target.searchParams.set("state", state);

  const headers = new Headers();
  headers.set("location", target.toString());
  headers.set("cache-control", "no-store");
  headers.append("set-cookie", stateCookie(request, state));

  return new Response(null, { status: 302, headers });
}
