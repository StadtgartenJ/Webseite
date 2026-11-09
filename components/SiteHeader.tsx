"use client";

import { useEffect, useState } from "react";

const LINKS = [
  { href: "/#konzept", label: "Das Konzept" },
  { href: "/#so-funktionierts", label: "So funktioniert’s" },
];

export function Wordmark() {
  return (
    <span className="wordmark">
      <svg className="wordmark__mark" viewBox="0 0 28 16" aria-hidden="true" focusable="false">
        <path d="M1 2h26v4.5C27 11.7 22.7 15 17.5 15h-7C5.3 15 1 11.7 1 6.5V2z" fill="currentColor" />
      </svg>
      Stadtgarden
    </span>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.documentElement.classList.add("menu-open");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("menu-open");
    };
  }, [open]);

  return (
    <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
      <div className="wrap site-header__inner">
        <a href="/" className="site-header__brand" aria-label="Stadtgarden, zur Startseite">
          <Wordmark />
        </a>
        <nav className="site-nav" aria-label="Hauptnavigation">
          <ul>
            {LINKS.map((l) => (
              <li key={l.href}>
                <a className="link" href={l.href}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <a className="btn btn--small btn--primary" href="/#warteliste">
            <span>Warteliste</span>
          </a>
        </nav>
        <button
          className="menu-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="menu-toggle__label">{open ? "Schließen" : "Menü"}</span>
          <span className="menu-toggle__icon" aria-hidden="true" />
        </button>
      </div>
      <div id="mobile-menu" className="mobile-menu" hidden={!open}>
        <nav className="wrap" aria-label="Hauptnavigation mobil">
          <ul>
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setOpen(false)}>
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <a href="/#warteliste" onClick={() => setOpen(false)}>
                Warteliste
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
