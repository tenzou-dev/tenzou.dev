import { githubConfigured } from "../../_lib/auth.js";
import { json } from "../../_lib/http.js";

export async function onRequestGet({ env }) {
  return json({
    ok: true,
    github: githubConfigured(env),
    password: Boolean(env.ADMIN_PASSWORD),
  });
}
