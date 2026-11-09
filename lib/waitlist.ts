/**
 * Wartelisten-Adapter (Client-Seite).
 *
 * Die Website ist statisch (GitHub Pages) und speichert selbst NICHTS.
 * Anmeldungen gehen an einen kleinen serverseitigen Endpunkt (waitlist-worker/),
 * der die Adresse prüft, Spam abwehrt und über Brevo eine Double-Opt-in-Mail verschickt.
 * Erst nach dem Klick auf den Bestätigungslink steht jemand auf der Liste.
 *
 * Ist NEXT_PUBLIC_WAITLIST_ENDPOINT nicht gesetzt, meldet das Formular offen,
 * dass Anmeldungen noch nicht möglich sind – es gibt keinen stillen Fallback.
 */

export type WaitlistResult =
  | { status: "pending" } // Bestätigungsmail wurde verschickt
  | { status: "already" } // Adresse steht schon auf der Liste
  | { status: "error"; reason: "invalid" | "rate_limited" | "unavailable" | "not_configured" | "network" };

const ENDPOINT = process.env.NEXT_PUBLIC_WAITLIST_ENDPOINT || "";

export const waitlistConfigured = ENDPOINT.length > 0;

// Pragmatische Prüfung; die verbindliche Prüfung passiert serverseitig.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isPlausibleEmail(value: string) {
  const v = value.trim();
  return v.length <= 254 && EMAIL_RE.test(v);
}

export async function joinWaitlist(input: {
  email: string;
  /** Honeypot – bleibt bei Menschen leer */
  company: string;
  /** Millisekunden zwischen Formularanzeige und Absenden (Bot-Bremse) */
  elapsedMs: number;
}): Promise<WaitlistResult> {
  if (!isPlausibleEmail(input.email)) return { status: "error", reason: "invalid" };
  if (!waitlistConfigured) {
    if (typeof console !== "undefined") {
      console.warn("[Warteliste] NEXT_PUBLIC_WAITLIST_ENDPOINT ist nicht gesetzt – Anmeldung nicht möglich.");
    }
    return { status: "error", reason: "not_configured" };
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: input.email.trim(),
        company: input.company,
        elapsedMs: Math.round(input.elapsedMs),
      }),
    });
    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as { status?: string };
      if (data.status === "already") return { status: "already" };
      if (data.status === "pending") return { status: "pending" };
      return { status: "error", reason: "unavailable" };
    }
    if (res.status === 400 || res.status === 422) return { status: "error", reason: "invalid" };
    if (res.status === 429) return { status: "error", reason: "rate_limited" };
    return { status: "error", reason: "unavailable" };
  } catch {
    return { status: "error", reason: "network" };
  }
}
