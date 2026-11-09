/**
 * Stadtgarden · Wartelisten-Endpunkt (Cloudflare Worker)
 *
 * Nimmt eine E-Mail-Adresse von der statischen Website entgegen, prüft sie, bremst Bots
 * und Massenanfragen und startet bei Brevo das Double-Opt-in. Erst nach dem Klick auf den
 * Bestätigungslink landet die Adresse auf der Liste. Der API-Schlüssel bleibt hier auf dem
 * Server und taucht nie im Browser auf.
 *
 * Antworten an die Website:
 *   200 { status: "pending" }   Mail verschickt (oder Adresse schon bekannt – wird bewusst nicht verraten)
 *   422 { error: "invalid" }    Adresse ungültig
 *   429 { error: "rate_limited" }
 *   503 { error: "not_configured" } / 502 { error: "upstream" }
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const BREVO_DOI_URL = "https://api.brevo.com/v3/contacts/doubleOptinConfirmation";

function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = String(env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const okOrigin = allowed.includes(origin);
    const cors = okOrigin
      ? {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
          Vary: "Origin",
        }
      : { Vary: "Origin" };

    if (request.method === "OPTIONS") return new Response(null, { status: okOrigin ? 204 : 403, headers: cors });
    if (request.method !== "POST") return json(405, { error: "method" }, cors);
    if (!okOrigin) return json(403, { error: "origin" }, cors);

    if (!env.BREVO_API_KEY || !env.BREVO_LIST_ID || !env.BREVO_DOI_TEMPLATE_ID || !env.DOI_REDIRECT_URL) {
      console.error("Warteliste: Konfiguration unvollständig");
      return json(503, { error: "not_configured" }, cors);
    }

    // Rate Limiting je IP (Cloudflare Rate Limiting Binding, siehe wrangler.toml)
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (env.WAITLIST_LIMITER) {
      const { success } = await env.WAITLIST_LIMITER.limit({ key: ip });
      if (!success) return json(429, { error: "rate_limited" }, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json(400, { error: "invalid" }, cors);
    }

    // Bot-Bremsen: ausgefülltes Honeypot-Feld oder unrealistisch schnelles Absenden.
    // Antwort wie bei Erfolg, damit Bots nichts lernen; es wird aber nichts gespeichert.
    if (body && typeof body.company === "string" && body.company.trim() !== "") return json(200, { status: "pending" }, cors);
    if (body && typeof body.elapsedMs === "number" && body.elapsedMs < 1200) return json(200, { status: "pending" }, cors);

    const email = String((body && body.email) || "").trim().toLowerCase();
    if (email.length > 254 || !EMAIL_RE.test(email)) return json(422, { error: "invalid" }, cors);

    const res = await fetch(BREVO_DOI_URL, {
      method: "POST",
      headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        email,
        includeListIds: [Number(env.BREVO_LIST_ID)],
        templateId: Number(env.BREVO_DOI_TEMPLATE_ID),
        redirectionUrl: env.DOI_REDIRECT_URL,
      }),
    });

    if (res.ok) return json(200, { status: "pending" }, cors);

    const err = await res.json().catch(() => ({}));
    const text = JSON.stringify(err).toLowerCase();
    // Bereits eingetragen: gleiche Antwort wie bei Erfolg (keine Auskunft darüber, wer auf der Liste steht)
    if (res.status === 400 && (text.includes("duplicate") || text.includes("already"))) {
      return json(200, { status: "pending" }, cors);
    }
    if (res.status === 400 && text.includes("email")) return json(422, { error: "invalid" }, cors);
    console.error("Brevo-Fehler", res.status, err && err.code);
    return json(502, { error: "upstream" }, cors);
  },
};
