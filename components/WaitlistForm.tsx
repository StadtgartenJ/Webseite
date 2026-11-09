"use client";

import { useEffect, useId, useRef, useState } from "react";
import { isPlausibleEmail, joinWaitlist, type WaitlistResult } from "@/lib/waitlist";

type ErrorReason = Extract<WaitlistResult, { status: "error" }>["reason"] | "empty";

const MESSAGES: Record<ErrorReason, string> = {
  empty: "Bitte gib deine E-Mail-Adresse ein.",
  invalid: "Das sieht nicht nach einer E-Mail-Adresse aus. Prüf bitte die Schreibweise.",
  rate_limited: "Gerade kamen sehr viele Anfragen. Versuch es in ein paar Minuten noch einmal.",
  unavailable: "Die Anmeldung ist gerade nicht erreichbar. Versuch es bitte später noch einmal.",
  not_configured: "Die Warteliste öffnet in Kürze. Bis dahin können wir noch keine Adressen annehmen.",
  network: "Keine Verbindung. Prüf deine Internetverbindung und versuch es erneut.",
};

type State =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "pending"; email: string }
  | { kind: "error"; reason: ErrorReason };

export function WaitlistForm({
  tone = "light",
  note,
}: {
  tone?: "light" | "dark";
  note?: React.ReactNode;
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
    const result = await joinWaitlist({
      email: value,
      company,
      elapsedMs: performance.now() - shownAt.current,
    });
    if (result.status === "pending") setState({ kind: "pending", email: value });
    else setState({ kind: "error", reason: result.reason });
  }

  if (state.kind === "pending") {
    return (
      <div className={`wl wl--${tone} wl-done`} role="status" tabIndex={-1} ref={doneRef}>
        <p className="wl-done__title">Fast geschafft.</p>
        <p className="wl-done__text">
          Wir haben dir eine E-Mail an <strong>{state.email}</strong> geschickt. Bestätige deine Adresse über den Link
          darin, erst dann stehst du auf der Liste.
        </p>
      </div>
    );
  }

  const error = state.kind === "error" ? MESSAGES[state.reason] : null;
  const busy = state.kind === "submitting";
  const fieldId = `${id}-email`;
  const errorId = `${id}-error`;
  const noteId = `${id}-note`;

  return (
    <form className={`wl wl--${tone}`} onSubmit={onSubmit} noValidate aria-busy={busy}>
      <div className="wl-row">
        <label className="sr-only" htmlFor={fieldId}>
          E-Mail-Adresse
        </label>
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
          placeholder="deine@email.de"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state.kind === "error") setState({ kind: "idle" });
          }}
          aria-invalid={state.kind === "error" && (state.reason === "empty" || state.reason === "invalid")}
          aria-describedby={[error ? errorId : null, note ? noteId : null].filter(Boolean).join(" ") || undefined}
          required
        />
        {/* Honeypot: für Menschen unsichtbar, Bots füllen es gerne aus */}
        <div className="wl-hp" aria-hidden="true">
          <label htmlFor={`${id}-company`}>Firma</label>
          <input id={`${id}-company`} name="company" type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <button className="btn btn--primary wl-button" type="submit" disabled={busy}>
          <span>{busy ? "Wird gesendet …" : "Auf die Warteliste"}</span>
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
