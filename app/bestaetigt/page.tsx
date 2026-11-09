import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { title: "Anmeldung bestätigt", robots: { index: false } };

// Ziel des Bestätigungslinks aus der Double-Opt-in-Mail (DOI_REDIRECT_URL).
export default function Bestaetigt() {
  return (
    <>
      <SiteHeader />
      <main id="inhalt" className="confirm">
        <div className="wrap confirm__inner">
          <h1>Du stehst auf der Liste.</h1>
          <p>Danke für deine Bestätigung. Wir melden uns, sobald es Neuigkeiten gibt. Bis dahin hörst du nichts von uns.</p>
          <a className="btn btn--primary" href="/">
            <span>Zurück zur Startseite</span>
          </a>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
