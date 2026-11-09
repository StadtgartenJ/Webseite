import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

export function LegalPage({ title, children, draft = true }: { title: string; children: React.ReactNode; draft?: boolean }) {
  return (
    <>
      <SiteHeader />
      <main id="inhalt" className="legal">
        <div className="wrap legal__inner">
          <h1>{title}</h1>
          {draft ? (
            <p className="legal__draft" role="note">
              Entwurf: Die markierten Angaben fehlen noch. Vor der Veröffentlichung ergänzen und rechtlich prüfen lassen.
            </p>
          ) : null}
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

/** Sichtbar markierter Platzhalter für noch unbekannte Pflichtangaben. */
export function Todo({ children }: { children: React.ReactNode }) {
  return <mark className="todo">[{children}]</mark>;
}
