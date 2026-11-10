"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Scroll-Film „Teardown“: vorgerenderte Blender-Bildsequenz (Cycles, blender/v6/sg_anim.py),
 * per ScrollTrigger (scrub) Bild für Bild auf ein Canvas gezeichnet.
 * - Bilder: public/film/teardown-<Größe>/f000.webp … (jedes zweite Bild der Animation 0–186)
 * - Laden erst in der Nähe des Abschnitts; bis dahin und ohne JavaScript steht das erste Bild.
 * - Anheften per CSS (sticky); GSAP ScrollTrigger liefert nur den Fortschritt (wird erst in der Nähe geladen).
 * - „Bewegung reduzieren“: kein Anheften, kein Scrubbing – Endbild der Explosion und alle Texte untereinander.
 */

const COUNT = 94; // Bilder 0, 2, … 186
const STEP = 2;
const LAST = (COUNT - 1) * STEP;

type Phase = { from: number; title: string; text: string };
// Bereiche in Animationsbildern (24 fps), passend zu TIMING in blender/v6/sg_anim.py
const PHASES: Phase[] = [
  { from: 0, title: "Die fertige Form", text: "Außen eine ruhige Kapsel. Alles Technische liegt innen." },
  { from: 26, title: "Pflanzeinsatz", text: "Der schwarze Einsatz mit Substrat und Wurzeln lässt sich herausheben." },
  { from: 102, title: "Wasserreservoir", text: "Die Schale gibt den Wasserspeicher frei. Vorne zeigt ein schmales Fenster den Wasserstand." },
  { from: 118, title: "Trennplatte und Dochte", text: "Eine gelochte Platte trennt Erde und Wasser. Zwei Dochte sollen das Wasser nach oben zu den Wurzeln leiten." },
  { from: 138, title: "Halterung", text: "Eine Spannstange und zwei breite Bügel: das geplante Befestigungssystem ohne Bohren." },
]

const phaseAt = (frame: number) => {
  let k = 0;
  PHASES.forEach((p, i) => {
    if (frame >= p.from) k = i;
  });
  return k;
};

const srcFor = (size: number, i: number) => `/film/teardown-${size}/f${String(i).padStart(3, "0")}.webp`;

export function TeardownFilm() {
  const section = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const frames = useRef<(HTMLImageElement | null)[]>(Array(COUNT).fill(null));
  const current = useRef(0);
  const [size, setSize] = useState(720);
  const [phase, setPhase] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    const el = canvas.current;
    if (el) {
      const need = el.getBoundingClientRect().width * Math.min(window.devicePixelRatio || 1, 2);
      setSize(need > 780 ? 1080 : 720);
    }
    return () => mq.removeEventListener("change", apply);
  }, []);

  /** nächstes geladenes Bild zeichnen (beim schnellen Scrollen sind noch nicht alle da) */
  const draw = (i: number) => {
    const c = canvas.current;
    if (!c) return;
    let img: HTMLImageElement | null = null;
    for (let d = 0; d < COUNT && !img; d++) {
      img = frames.current[i - d] ?? frames.current[i + d] ?? null;
    }
    if (!img) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    if (c.width !== img.naturalWidth) {
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
    }
    ctx.drawImage(img, 0, 0, c.width, c.height);
  };

  // Bilder laden, sobald der Abschnitt näher als eine Bildschirmhöhe ist (6 parallel)
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    let cancelled = false;
    const order = reduced ? [COUNT - 1] : Array.from({ length: COUNT }, (_, i) => i);
    const start = () => {
      let next = 0;
      const pump = () => {
        if (cancelled || next >= order.length) return;
        const i = order[next++];
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          frames.current[i] = img;
          if (i === current.current || (reduced && i === COUNT - 1)) draw(reduced ? COUNT - 1 : i);
          if (i === 0 || reduced) setReady(true);
          pump();
        };
        img.onerror = pump;
        img.src = srcFor(size, i);
      };
      for (let k = 0; k < 6; k++) pump();
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        start();
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, reduced]);

  // GSAP erst laden, wenn der Abschnitt in die Nähe kommt (hält die Erstladung klein)
  useEffect(() => {
    if (reduced || !stage.current || !section.current) return;
    let st: { kill: () => void } | null = null;
    let cancelled = false;
    const el = section.current;
    const io = new IntersectionObserver(
      async ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
        if (cancelled || !stage.current) return;
        gsap.registerPlugin(ScrollTrigger);
        // Anheften per CSS (position: sticky, Höhe steht schon im HTML) – kein Layoutsprung beim Laden
        st = ScrollTrigger.create({
          trigger: el,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const i = Math.round(self.progress * (COUNT - 1));
            if (i !== current.current) {
              current.current = i;
              draw(i);
            }
            const k = phaseAt(i * STEP);
            setPhase((p) => (p === k ? p : k));
          },
        });
        ScrollTrigger.refresh();
      },
      { rootMargin: "200% 0px" },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
      st?.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  return (
    <div className={`film${reduced ? " film--static" : ""}${ready ? " is-ready" : ""}`} ref={section}>
      <div className="film__stage" ref={stage} data-cta-quiet="">
        <div className="film__frame">
          {/* erstes Bild sofort (auch ohne JavaScript), danach übernimmt das Canvas */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="film__poster"
            src={srcFor(720, reduced ? COUNT - 1 : 0)}
            srcSet={`${srcFor(720, reduced ? COUNT - 1 : 0)} 720w, ${srcFor(1080, reduced ? COUNT - 1 : 0)} 1080w`}
            sizes="(min-width: 1024px) 46vw, 100vw"
            width={1080}
            height={1080}
            alt={reduced ? "Explosionsansicht des Pflanzkastens: Halterung, Pflanzeinsatz, Trennplatte, Dochte, Reservoir und Schale" : "Der Pflanzkasten mit Pflanzen, montiert an der Spannstange"}
            loading="lazy"
            decoding="async"
          />
          <canvas ref={canvas} className="film__canvas" aria-hidden="true" />
          <p className="film__badge">
            <span>Konzeptionelle Darstellung</span>
            <span className="film__badge-sep"> · </span>
            <span>Produkt in Entwicklung</span>
          </p>
        </div>
        <div className="film__copy">
          {reduced ? (
            <ol className="film__list">
              {PHASES.map((p) => (
                <li key={p.title}>
                  <h3>{p.title}</h3>
                  <p>{p.text}</p>
                </li>
              ))}
            </ol>
          ) : (
            <>
              <p className="film__count" aria-hidden="true">
                {String(phase + 1).padStart(2, "0")} / {String(PHASES.length).padStart(2, "0")}
              </p>
              <div className="film__text" aria-live="polite">
                {PHASES.map((p, i) => (
                  <div key={p.title} className={`film__step${i === phase ? " is-on" : ""}`} aria-hidden={i !== phase}>
                    <h3>{p.title}</h3>
                    <p>{p.text}</p>
                  </div>
                ))}
              </div>
              <div className="film__bar" aria-hidden="true">
                {PHASES.map((p, i) => (
                  <span key={p.title} className={i <= phase ? "is-on" : undefined} />
                ))}
              </div>
              <p className="film__hint">Scrolle, um das Produkt Schritt für Schritt zu öffnen.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export const TEARDOWN_LAST_FRAME = LAST;
