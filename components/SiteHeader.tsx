"use client";

import { useEffect, useState } from "react";
import { WaitlistLink } from "./WaitlistLink";

export function Wordmark() {
  return (
    <span className="wordmark">
      <svg className="wordmark__mark" viewBox="0 0 30 18" aria-hidden="true" focusable="false">
        <path d="M1 2.5h28v5.2C29 13.4 24.4 17 18.8 17h-7.6C5.6 17 1 13.4 1 7.7V2.5z" fill="currentColor" />
        <rect x="14" y="7.5" width="2" height="5.5" rx="1" fill="var(--lime)" />
      </svg>
      Stadtgarden
    </span>
  );
}

/**
 * Kopfzeile. Auf der Startseite liegt sie anfangs transparent über dem Hero-Foto
 * und bekommt beim Scrollen einen ruhigen Elfenbein-Grund.
 */
export function SiteHeader({ overlay = false, cta = true }: { overlay?: boolean; cta?: boolean }) {
  const [scrolled, setScrolled] = useState(!overlay);

  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  return (
    <header className={`site-header${overlay ? " site-header--overlay" : ""}${scrolled ? " is-solid" : ""}`}>
      <div className="wrap site-header__inner">
        <a href="/" className="site-header__brand" aria-label="Stadtgarden, zur Startseite">
          <Wordmark />
        </a>
        <nav className="site-nav" aria-label="Hauptnavigation">
          <ul>
            <li>
              <a className="link" href="/#produkt">
                Das Produkt
              </a>
            </li>
            <li>
              <a className="link" href="/#so-funktionierts">
                So funktioniert’s
              </a>
            </li>
          </ul>
        </nav>
        {!cta ? null : overlay ? (
          <WaitlistLink className="btn btn--forest btn--small" />
        ) : (
          <a className="btn btn--forest btn--small" href="/#warteliste">
            <span className="btn__dot" aria-hidden="true" />
            <span>Auf die Warteliste</span>
          </a>
        )}
      </div>
    </header>
  );
}
