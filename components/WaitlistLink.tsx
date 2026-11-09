"use client";

/**
 * Einheitlicher CTA „Auf die Warteliste“.
 * Ist das Formular im Hero gerade sichtbar, bekommt es den Fokus; sonst scrollt der Link
 * zum Abschluss-Formular und setzt dort den Cursor ins Feld. Ohne JavaScript ein normaler Anker.
 */
export function WaitlistLink({
  className = "btn btn--forest",
  children = "Auf die Warteliste",
  inline = false,
}: {
  className?: string;
  children?: React.ReactNode;
  /** CTA im Seitenfluss: solange er sichtbar ist, bleibt die mobile Leiste unten weg */
  inline?: boolean;
}) {
  function onClick(e: React.MouseEvent<HTMLAnchorElement>) {
    const hero = document.getElementById("hero-email") as HTMLInputElement | null;
    const final = document.getElementById("waitlist-email") as HTMLInputElement | null;
    const section = document.getElementById("warteliste");
    const inView = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= window.innerHeight && r.width > 0;
    };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (hero && inView(hero)) {
      e.preventDefault();
      hero.focus();
      return;
    }
    if (!final || !section) return;
    e.preventDefault();
    const focus = () => final.focus({ preventScroll: true });
    history.replaceState(null, "", "#warteliste");
    if (inView(final)) return focus();
    section.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    if (reduced) return focus();
    if ("onscrollend" in window) window.addEventListener("scrollend", focus, { once: true });
    else setTimeout(focus, 800);
  }

  return (
    <a href="#warteliste" className={className} onClick={onClick} data-inline-cta={inline || undefined}>
      <span className="btn__dot" aria-hidden="true" />
      <span>{children}</span>
    </a>
  );
}
