"use client";

import { useEffect, useRef, useState } from "react";
import { Picture } from "./Picture";

/**
 * Technik-Abschnitt als ruhige Bildgeschichte.
 * Desktop: links eine stehende Bühne (CSS sticky, kein Scroll-Hijacking), rechts vier Stationen;
 * die Bühne blendet zum Bild der Station, die gerade in der Bildmitte steht.
 * Handy/Tablet: jede Station mit eigenem Bild untereinander.
 * Ohne JavaScript und bei „Bewegung reduzieren“ bleibt alles lesbar; dort wechseln die Bilder ohne Blende.
 */

type Shot = { name: string; widths: number[]; width: number; height: number; alt: string; pos?: string };

const STEPS: {
  id: string;
  /** Name in der Stationsleiste */
  label: string;
  title: string;
  shot: Shot;
  mobileShot?: Shot;
  body: React.ReactNode;
}[] = [
  {
    id: "technik-produkt",
    label: "Produkt",
    title: "Außen eine ruhige Form",
    shot: {
      name: "produkt-gruen",
      widths: [800, 1200, 1536],
      width: 1536,
      height: 1024,
      alt: "Der weiße Pflanzkasten mit Efeutute und Pfennigkraut hängt an einer Spannstange vor einem Fenster mit dunkelgrüner Fassade",
      pos: "50% 55%",
    },
    body: (
      <>
        <p>
          Eine weich gerundete Kapsel in Warmweiß. Vorne nur ein schmales Sichtfenster für den Wasserstand. Alles
          Weitere liegt innen.
        </p>
        <a className="btn btn--outline tech__more" href="#technik-innenleben">
          <span className="btn__dot" aria-hidden="true" />
          <span>Entdecke das Innenleben</span>
        </a>
      </>
    ),
  },
  {
    id: "technik-innenleben",
    label: "Innenleben",
    title: "Sechs Teile, ein Prinzip",
    shot: {
      name: "explosion-gruen",
      widths: [800, 1200, 1640],
      width: 1640,
      height: 1312,
      alt: "Explosionsansicht: Spannstange mit zwei Halterungen, Pflanzeinsatz mit Erde, gelochte Trennplatte, zwei Kapillarelemente, Wasserreservoir und Außenschale mit Sichtfenster",
    },
    mobileShot: {
      name: "explosion-hoch",
      widths: [640, 1199],
      width: 1199,
      height: 1312,
      alt: "Explosionsansicht: Spannstange mit zwei Halterungen, Pflanzeinsatz mit Erde, gelochte Trennplatte, zwei Kapillarelemente, Wasserreservoir und Außenschale mit Sichtfenster",
    },
    body: (
      <dl className="tech__parts">
        <div>
          <dt>Klemmsystem</dt>
          <dd>Eine horizontale Spannstange und zwei breite Halterungen bilden das geplante Befestigungssystem.</dd>
        </div>
        <div>
          <dt>Pflanzeinsatz</dt>
          <dd>Ein herausnehmbarer Einsatz mit Platz für Substrat und Wurzeln.</dd>
        </div>
        <div>
          <dt>Trennplatte</dt>
          <dd>Gelocht, zwischen Erde und Wasser.</dd>
        </div>
        <div>
          <dt>Kapillarelemente</dt>
          <dd>Sie sollen Feuchtigkeit aus dem Reservoir in Richtung Pflanzsubstrat transportieren.</dd>
        </div>
        <div>
          <dt>Wasserreservoir</dt>
          <dd>Ein integrierter Speicher für die geplante passive Wasserversorgung.</dd>
        </div>
        <div>
          <dt>Außenschale</dt>
          <dd>Umschließt alles. Das Sichtfenster zeigt den Wasserstand im Reservoir.</dd>
        </div>
      </dl>
    ),
  },
  {
    id: "technik-wasserweg",
    label: "Wasserweg",
    title: "Der geplante Wasserweg",
    shot: {
      name: "schnitt-breit",
      widths: [800, 1200, 1672],
      width: 1672,
      height: 941,
      alt: "Konzeptschnitt am Fenster: unten Wasser im Reservoir, zwei Kapillarelemente reichen durch die gelochte Platte bis unter den Pflanzeinsatz mit Erde und Wurzeln",
      pos: "58% 50%",
    },
    body: (
      <>
        <ol className="tech__flow">
          <li>Unten liegt das Wasser im Reservoir.</li>
          <li>Kapillarelemente sollen es nach oben leiten.</li>
          <li>Das Substrat nimmt die Feuchtigkeit auf.</li>
        </ol>
        <p className="tech__note">
          Wie gut das im Alltag funktioniert, hängt auch von Erde, Pflanzen und Standort ab. Genau das testen wir gerade.
        </p>
      </>
    ),
  },
  {
    id: "technik-montage",
    label: "Montage",
    title: "So hängt er am Fenster",
    shot: {
      name: "montage-nah",
      widths: [800, 1200, 1672],
      width: 1672,
      height: 941,
      alt: "Nahaufnahme am Fenster: Die Spannstange klemmt mit runden Endkappen zwischen den Laibungen, zwei breite Halterungen tragen den Kasten",
      pos: "50% 45%",
    },
    // Handy: eigener Detailausschnitt, damit das Hero-Bild nicht doppelt erscheint
    mobileShot: {
      name: "montage-detail",
      widths: [640, 812],
      width: 812,
      height: 650,
      alt: "Detail am Fenster: Ein breites weißes Band läuft über die Spannstange, deren runde Endkappe an der Laibung anliegt",
    },
    body: (
      <p>
        Eine Spannstange klemmt zwischen den Seiten der Fensterlaibung, zwei breite Halterungen tragen den Kasten. Ob
        dein Fenster geeignet ist, hängt von Breite, Material und Zustand der Laibung ab.
      </p>
    ),
  },
];

const BADGE = "Konzeptionelle Darstellung · Produkt in Entwicklung";

export function TechStory() {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    // Station gilt als aktiv, sobald sie das mittlere Fünftel des Bildschirms kreuzt
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: "-40% 0px -40% 0px" },
    );
    stepRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="tech">
      <div className="tech__stage" aria-hidden="true">
        <div className="tech__frame">
          {STEPS.map((s, i) => (
            <div key={s.id} className={`tech__shot${i === active ? " is-active" : ""}`} style={{ "--pos": s.shot.pos ?? "50% 50%" } as React.CSSProperties}>
              <Picture {...s.shot} alt="" sizes="(min-width: 1024px) 58vw, 1px" className="tech__img" />
            </div>
          ))}
          <p className="tech__badge">{BADGE}</p>
        </div>
        <nav className="tech__nav" aria-label="Stationen">
          {STEPS.map((s, i) => (
            <a key={s.id} href={`#${s.id}`} className={i === active ? "is-active" : undefined} tabIndex={-1}>
              {s.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="tech__steps">
        {STEPS.map((s, i) => (
          <section
            key={s.id}
            id={s.id}
            className="tech__step"
            data-index={i}
            aria-labelledby={`${s.id}-title`}
            ref={(el) => {
              stepRefs.current[i] = el;
            }}
          >
            <figure className="tech__inline">
              <Picture {...(s.mobileShot ?? s.shot)} sizes="(min-width: 1024px) 1px, 100vw" className="tech__img" />
              {i === 1 || i === 2 ? <figcaption className="tech__badge">{BADGE}</figcaption> : null}
            </figure>
            <h3 id={`${s.id}-title`}>{s.title}</h3>
            <div className="tech__body">{s.body}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
