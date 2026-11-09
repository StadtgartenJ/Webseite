"use client";

import { useEffect, useState } from "react";
import { WaitlistLink } from "./WaitlistLink";

/**
 * Schmale Leiste am unteren Rand (unter 1024 px): erscheint nach dem Hero, solange weder ein
 * CTA im Seitenfluss noch das Abschluss-Formular zu sehen ist (und nicht über dem 3D-Film).
 * Kein Pop-up, nichts verdeckt Inhalte.
 */
export function StickyCta() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero");
    const list = document.getElementById("warteliste");
    if (!hero || !list) return;
    // Leiste nur zeigen, wenn gerade kein anderer CTA im Bild ist
    const blockers = [hero, list, ...Array.from(document.querySelectorAll<HTMLElement>("[data-inline-cta], [data-cta-quiet]"))];
    const visible = new Set<Element>([hero]);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
      setShow(visible.size === 0);
    });
    blockers.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className={`sticky-cta${show ? " is-shown" : ""}`} aria-hidden={!show} inert={!show}>
      <WaitlistLink className="btn btn--forest btn--block" />
    </div>
  );
}
