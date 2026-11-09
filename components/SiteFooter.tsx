import { Wordmark } from "./SiteHeader";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap site-footer__inner">
        <a href="/" className="site-footer__brand" aria-label="Stadtgarden, zur Startseite">
          <Wordmark />
        </a>
        <p className="site-footer__note">
          Stadtgarden ist in Entwicklung. Alle Abbildungen sind Konzeptvisualisierungen, kein fertiges Produkt.
        </p>
        <nav aria-label="Rechtliches">
          <ul className="site-footer__links">
            <li>
              <a className="link" href="/impressum/">
                Impressum
              </a>
            </li>
            <li>
              <a className="link" href="/datenschutz/">
                Datenschutz
              </a>
            </li>
          </ul>
        </nav>
        <p className="site-footer__copy">© {new Date().getFullYear()} Stadtgarden</p>
      </div>
    </footer>
  );
}
