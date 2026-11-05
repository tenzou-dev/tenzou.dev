import {
  callbackUrl,
  clearStateCookie,
  createSession,
  getCookie,
  githubConfigured,
  isOwner,
  sessionCookie,
} from "../../_lib/auth.js";

function redirect(request, location, cookies = []) {
  const headers = new Headers();
  headers.set("location", location);
  headers.set("cache-control", "no-store");
  headers.append("set-cookie", clearStateCookie(request));
  cookies.forEach((cookie) => headers.append("set-cookie", cookie));
  return new Response(null, { status: 302, headers });
}

function fail(request, reason, login = "") {
  let location = "/admin?error=" + encodeURIComponent(reason);
  if (login) location += "&as=" + encodeURIComponent(login);
  return redirect(request, location);
}

export async function onRequestGet({ request, env }) {
  if (!githubConfigured(env)) return fail(request, "config");

  const url = new URL(request.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const expected = getCookie(request, "tz_oauth_state");

  if (!code || !state || !expected || state !== expected) {
    return fail(request, "state");
  }

  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: callbackUrl(request, env),
      }),
    });

    if (!tokenResponse.ok) return fail(request, "token");

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData && tokenData.access_token;
    if (!accessToken) return fail(request, "token");

    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        authorization: "Bearer " + accessToken,
        accept: "application/vnd.github+json",
        "user-agent": "tenzou.dev",
      },
    });

    if (!userResponse.ok) return fail(request, "token");

    const user = await userResponse.json();
    if (!user || !isOwner(user.login, env)) return fail(request, "owner", user && user.login);

    const session = await createSession(user.login, env);
    return redirect(request, "/admin", [sessionCookie(request, session)]);
  } catch (e) {
    return fail(request, "token");
  }
}
