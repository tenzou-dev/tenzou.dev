import { json } from "../_lib/http.js";

/**
 * Approximate location of the visitor, straight from Cloudflare's geo data.
 * Nothing is stored and no third party is involved.
 */
export async function onRequestGet({ request }) {
  const cf = request.cf || {};
  const lat = Number(cf.latitude);
  const lon = Number(cf.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return json({ ok: false });
  }

  return json({
    ok: true,
    lat,
    lon,
    city: cf.city || "",
    country: cf.country || "",
  });
}
