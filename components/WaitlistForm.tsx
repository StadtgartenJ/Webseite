"use client";

import { useEffect, useId, useRef, useState } from "react";
import { isPlausibleEmail, joinWaitlist, type WaitlistResult } from "@/lib/waitlist";

type ErrorReason = Extract<WaitlistResult, { status: "error" }>["reason"] | "empty";

const GENERIC = "Das hat leider nicht geklappt. Bitte versuche es noch einmal.";

const MESSAGES: Record<ErrorReason, string> = {
  empty: "Bitte gib deine E-Mail-Adresse ein.",
  invalid: "Das sieht nicht nach einer E-Mail-Adresse aus. Bitte prüf die Schreibweise.",
  rate_limited: GENERIC,
  unavailable: GENERIC,
  network: GENERIC,
  // Solange kein Wartelisten-Dienst angebunden ist, sagen wir das offen.
  not_configured: "Die Warteliste öffnet in Kürze. Noch können wir keine Adressen annehmen.",
};

type State =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "pending" }
  | { kind: "error"; reason: ErrorReason };

export function WaitlistForm({
  tone = "light",
  note,
  buttonLabel = "Auf die Warteliste",
  label = "E-Mail-Adresse",
  placeholder = "Deine E-Mail-Adresse",
  size = "md",
  inputId,
}: {
  tone?: "light" | "dark";
  note?: React.ReactNode;
  buttonLabel?: string;
  label?: string;
  placeholder?: string;
  size?: "md" | "lg";
  /** feste ID, damit CTA-Links das Feld gezielt fokussieren können */
  inputId?: string;
}) {
  const id = useId();
  const [state, setState] = useState<State>({ kind: "idle" });
  const [email, setEmail] = useState("");
  const shownAt = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    shownAt.current = performance.now();
  }, []);

  useEffect(() => {
    if (state.kind === "pending") doneRef.current?.focus();
    if (state.kind === "error" && (state.reason === "empty" || state.reason === "invalid")) inputRef.current?.focus();
  }, [state]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state.kind === "submitting") return;
    const value = email.trim();
    if (!value) return setState({ kind: "error", reason: "empty" });
    if (!isPlausibleEmail(value)) return setState({ kind: "error", reason: "invalid" });

    const company = (new FormData(e.currentTarget).get("company") as string) || "";
    setState({ kind: "submitting" });
    const result = await joinWaitlist({ email: value, company, elapsedMs: performance.now() - shownAt.current });
    // „already“ wird bewusst genauso beantwortet: Die Seite verrät nicht, wer schon eingetragen ist.
    if (result.status === "pending" || result.status === "already") setState({ kind: "pending" });
    else setState({ kind: "error", reason: result.reason });
  }

  // Bestätigungsmail wurde nachweislich verschickt (Antwort des Servers)
  if (state.kind === "pending") {
    return (
      <div className={`wl wl--${tone} wl--${size} wl-done`} role="status" tabIndex={-1} ref={doneRef}>
        <span className="wl-done__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M5 12.5l4.2 4.2L19 7" />
          </svg>
        </span>
        <p className="wl-done__title">Fast geschafft!</p>
        <p className="wl-done__text">
          Schau in dein Postfach: Ist deine Adresse neu, findest du dort einen Link zur Bestätigung. Erst danach bist du
          auf der Warteliste.
        </p>
      </div>
    );
  }

  const error = state.kind === "error" ? MESSAGES[state.reason] : null;
  const busy = state.kind === "submitting";
  const fieldId = inputId ?? `${id}-email`;
  const errorId = `${fieldId}-error`;
  const noteId = `${fieldId}-note`;
  const fieldInvalid = state.kind === "error" && (state.reason === "empty" || state.reason === "invalid");

  return (
    <form className={`wl wl--${tone} wl--${size}`} onSubmit={onSubmit} noValidate aria-busy={busy}>
      <label className="wl-label" htmlFor={fieldId}>
        {label}
      </label>
      <div className="wl-row">
        <input
          ref={inputRef}
          id={fieldId}
          className="wl-input"
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={placeholder}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state.kind === "error") setState({ kind: "idle" });
          }}
          aria-invalid={fieldInvalid}
          aria-describedby={[error ? errorId : null, note ? noteId : null].filter(Boolean).join(" ") || undefined}
          required
        />
        {/* Honeypot: für Menschen unsichtbar, Bots füllen es gerne aus */}
        <div className="wl-hp" aria-hidden="true">
          <label htmlFor={`${fieldId}-company`}>Firma</label>
          <input id={`${fieldId}-company`} name="company" type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <button className={`btn ${tone === "dark" ? "btn--lime" : "btn--forest"} wl-button`} type="submit" disabled={busy}>
          <span className="btn__dot" aria-hidden="true" />
          <span>{busy ? "Wird gesendet …" : buttonLabel}</span>
        </button>
      </div>
      <p id={errorId} className="wl-error" aria-live="polite">
        {error}
      </p>
      {note ? (
        <p id={noteId} className="wl-note">
          {note}
        </p>
      ) : null}
    </form>
  );
}
