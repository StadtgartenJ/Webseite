"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { CutawayFallback } from "./CutawayFallback";
import { Picture } from "../Picture";
import { MODES, PARTS, type Mode, type PartId } from "./parts";
import {
  CAM_KEYS,
  CHAPTERS,
  CLIP_KEYS,
  FILM_LENGTH,
  FLOW_KEYS,
  FLOW_T_KEYS,
  PART_KEYS,
  TAG_ORDER,
  TAG_TEXT,
  TAG_TIMES,
  WET_KEYS,
  createFilmState,
  resetFilmState,
  type FilmState,
  type Key,
} from "./film";
import type { Driver, Quality, SceneBridge } from "./PlanterScene";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Das 3D-Modell (three.js, R3F) wird erst geladen, wenn der Abschnitt in die Nähe kommt.
const PlanterScene = dynamic(() => import("./PlanterScene"), { ssr: false });

type Load = "idle" | "loading" | "ready" | "nowebgl";
type Layout = "wide" | "medium" | "narrow";

const LISTED = PARTS.filter((p) => p.listed);

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** Schwächere Geräte bekommen weniger Pixel, kleinere Schatten und weniger Tropfen. */
function detectQuality(): Quality {
  const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (n.connection?.saveData) return "low";
  if ((n.deviceMemory ?? 8) <= 4) return "low";
  if ((n.hardwareConcurrency ?? 8) <= 4) return "low";
  return "high";
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Eine Spur aus Schlüsselwerten als lückenlose fromTo-Kette: jeder Zeitpunkt hat genau einen Wert. */
function track(tl: gsap.core.Timeline, target: object, prop: string, keys: Key[]) {
  for (let i = 1; i < keys.length; i++) {
    const [t0, v0] = keys[i - 1];
    const [t1, v1, ease] = keys[i];
    if (v0 === v1) continue;
    tl.fromTo(target, { [prop]: v0 }, { [prop]: v1, duration: t1 - t0, ease: ease ?? "none", immediateRender: false }, t0);
  }
}

function buildFilm(tl: gsap.core.Timeline, film: FilmState) {
  for (const [id, keys] of Object.entries(PART_KEYS)) track(tl, film.off, id, keys);
  for (const [prop, keys] of Object.entries(CAM_KEYS)) track(tl, film.cam, prop, keys);
  track(tl, film, "clip", CLIP_KEYS);
  track(tl, film, "flow", FLOW_KEYS);
  track(tl, film, "flowT", FLOW_T_KEYS);
  track(tl, film, "wet", WET_KEYS);
  for (const id of TAG_ORDER) {
    const [on, off] = TAG_TIMES[id];
    track(tl, film.tags, id, [
      [on, 0],
      [on + 0.3, 1, "power2.out"],
      [off, 1],
      [off + 0.3, 0, "power2.in"],
    ]);
  }
  // feste Länge, damit 1 Einheit immer 10 % Scrollweg entspricht
  tl.set({}, {}, FILM_LENGTH);
}

/**
 * Konzeptmodell mit zwei Wegen:
 *  1. Scroll-Film (Standard): die Bühne bleibt stehen, beim Scrollen öffnet sich der Kasten.
 *  2. Danach (oder bei „Bewegung reduzieren“): Tabs Produkt / Innenleben / Wasserweg / Montage.
 */
export function ProductExplorer() {
  const [mode, setMode] = useState<Mode>("produkt");
  const [explode, setExplode] = useState(1);
  const [pulled, setPulled] = useState<Partial<Record<PartId, number>>>({});
  const [hovered, setHovered] = useState<PartId | null>(null);
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [zoom, setZoom] = useState<{ n: number; dir: 1 | -1 }>({ n: 0, dir: 1 });
  const [load, setLoad] = useState<Load>("idle");
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [quality, setQuality] = useState<Quality>("high");
  const [driver, setDriver] = useState<Driver>("film");
  const [filmOn, setFilmOn] = useState(false);
  const [layout, setLayout] = useState<Layout>("wide");

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const filmTagsRef = useRef<HTMLDivElement>(null);
  const captionEls = useRef<(HTMLDivElement | null)[]>([]);
  const barRef = useRef<HTMLSpanElement>(null);
  const filmRef = useRef<FilmState | null>(null);
  if (!filmRef.current) filmRef.current = createFilmState();
  const film = filmRef.current;
  const bridge = useRef<SceneBridge>({});
  const driverRef = useRef<Driver>("film");
  const stRef = useRef<ScrollTrigger | null>(null);

  useEffect(() => {
    setWebgl(hasWebGL());
    setQuality(detectQuality());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setReduced(mq.matches);
      if (mq.matches) setPlaying(false);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Erst laden, wenn der Abschnitt näher als ~1 Bildschirm ist
  useEffect(() => {
    const el = stageRef.current;
    if (!el || webgl === null) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        setLoad(webgl ? "loading" : "nowebgl");
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [webgl]);

  // Mausrad scrollt die Seite; nur Strg/⌘ + Rad (oder Trackpad-Pinch) zoomt das Modell
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) e.stopPropagation();
    };
    el.addEventListener("wheel", onWheel, { capture: true });
    return () => el.removeEventListener("wheel", onWheel, { capture: true });
  }, []);

  const setDriverOnce = useCallback((d: Driver) => {
    if (driverRef.current === d) return;
    driverRef.current = d;
    setDriver(d);
  }, []);

  /** Kapiteltexte und Fortschritt folgen direkt der Timeline-Zeit (ohne React-Render). */
  const paint = useCallback((time: number) => {
    CHAPTERS.forEach((c, i) => {
      const el = captionEls.current[i];
      if (!el) return;
      const a = Math.min(clamp01((time - c.from) / 0.3), clamp01((c.to - time) / 0.3));
      el.style.opacity = a.toFixed(3);
      el.style.transform = `translate3d(0, ${((1 - a) * 8).toFixed(1)}px, 0)`;
      el.style.visibility = a > 0.001 ? "visible" : "hidden";
    });
    if (barRef.current) barRef.current.style.transform = `scaleX(${(time / FILM_LENGTH).toFixed(4)})`;
  }, []);

  // ── Scroll-Film: eine Timeline, ein ScrollTrigger (pin + scrub) je Bildschirmklasse ──
  useGSAP(
    () => {
      if (webgl !== true) {
        setDriverOnce("manual");
        return;
      }
      const mm = gsap.matchMedia();
      mm.add(
        {
          wide: "(min-width: 1024px)",
          medium: "(min-width: 641px) and (max-width: 1023px)",
          narrow: "(max-width: 640px)",
          motion: "(prefers-reduced-motion: no-preference)",
        },
        (ctx) => {
          const { wide, medium, motion } = ctx.conditions as Record<string, boolean>;
          setLayout(wide ? "wide" : medium ? "medium" : "narrow");
          const stage = stageRef.current;
          if (!motion || !stage) {
            // Bewegung reduzieren: keine erzwungene Kamerafahrt, die Tabs erklären Schritt für Schritt
            setDriverOnce("manual");
            return;
          }

          resetFilmState(film);
          const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
          buildFilm(tl, film);
          tl.eventCallback("onUpdate", () => {
            bridge.current.invalidate?.();
            paint(tl.time());
          });

          const pinTop = () => {
            const header = document.querySelector<HTMLElement>(".site-header");
            return Math.round((header?.getBoundingClientRect().height ?? 64) + (wide ? 12 : 8));
          };
          const sync = (progress: number) => setDriverOnce(progress > 0.999 ? "manual" : "film");
          const st = ScrollTrigger.create({
            trigger: stage,
            start: () => `top ${pinTop()}px`,
            end: () => `+=${Math.round(window.innerHeight * (wide ? 2.9 : medium ? 2.5 : 2.2))}`,
            pin: true,
            scrub: 0.6,
            animation: tl,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => sync(self.progress),
            onRefresh: (self) => sync(self.progress),
          });
          stRef.current = st;
          paint(tl.time());
          setFilmOn(true);
          sync(st.progress);

          return () => {
            stRef.current = null;
            resetFilmState(film);
            setFilmOn(false);
            setDriverOnce("manual");
            bridge.current.invalidate?.();
          };
        },
      );
      // Schriften verschieben den Text über der Bühne minimal – danach Positionen neu messen
      document.fonts?.ready.then(() => ScrollTrigger.refresh());
    },
    { scope: rootRef, dependencies: [webgl] },
  );

  // Zurück in den Film: Tabs auf den Ausgangszustand, damit die Übergabe am Ende nahtlos ist
  useEffect(() => {
    if (driver !== "film") return;
    setMode("produkt");
    setPulled({});
    setHovered(null);
    setExplode(1);
  }, [driver]);

  const onPull = useCallback((id: PartId, value: number) => setPulled((p) => ({ ...p, [id]: value })), []);
  const onReady = useCallback(() => setLoad("ready"), []);

  const chooseMode = (m: Mode) => {
    setMode(m);
    setHovered(null);
    if (m === "explosion") {
      setExplode(1);
      setPulled({});
    }
  };

  const showPart = (id: PartId) => {
    const info = PARTS.find((p) => p.id === id)!;
    if (!info.draggable) return;
    if (mode !== "explosion") {
      chooseMode("explosion");
      setPulled({ [id]: 1 });
      return;
    }
    setPulled((p) => ({ ...p, [id]: (p[id] ?? 0) > 0.5 ? 0 : 1 }));
  };

  const skipFilm = () => {
    const st = stRef.current;
    if (st) window.scrollTo({ top: st.end + 2, behavior: "instant" });
  };

  const current = MODES.find((m) => m.id === mode)!;
  const showScene = load === "loading" || load === "ready";
  const inFilm = filmOn && driver === "film";

  return (
    <div
      className="explorer"
      ref={rootRef}
      data-driver={inFilm ? "film" : "manual"}
      data-film={webgl === false ? "off" : filmOn ? "on" : undefined}
    >
      <div className={`explorer__stage is-${load}`} ref={stageRef} data-cta-quiet="">
        <div className="explorer__fallback" aria-hidden={showScene ? true : undefined}>
          {load === "nowebgl" ? (
            <div className="explorer__fallback-photo">
              <Picture
                name="exploded"
                widths={[640, 1122]}
                width={1122}
                height={1402}
                sizes="(min-width: 1024px) 60vw, 100vw"
                alt="Konzept-Explosionsansicht: Pflanzeinsatz mit Erde, gelochte Platte, zwei Kapillarelemente, Wasserreservoir und Außenschale mit Sichtfenster"
              />
            </div>
          ) : (
            <CutawayFallback />
          )}
        </div>
        {showScene ? (
          <div className="explorer__canvas">
            <PlanterScene
              mode={mode}
              explode={explode}
              pulled={pulled}
              onPull={onPull}
              hovered={hovered}
              onHover={setHovered}
              playing={playing}
              reduced={reduced}
              zoom={zoom}
              onReady={onReady}
              labels={labelsRef}
              driver={inFilm ? "film" : "manual"}
              film={film}
              filmTags={filmTagsRef}
              bridge={bridge}
              quality={quality}
              layout={layout}
            />
          </div>
        ) : null}
        <div className="explorer__labels" ref={labelsRef} aria-hidden="true" />

        {/* Beschriftungen des Scroll-Films: Positionen schreibt die Szene in jedem Frame */}
        <div className="film-tags" ref={filmTagsRef} aria-hidden="true">
          <svg className="film-tags__lines">
            {TAG_ORDER.map((id) => (
              <g key={id}>
                <line data-for={id} />
                <circle data-for={id} r="4" />
              </g>
            ))}
          </svg>
          {TAG_ORDER.map((id) => {
            const t = TAG_TEXT[id];
            return (
              <div key={id} className={`film-tag${t.step ? " film-tag--step" : ""}`} data-tag={id}>
                {t.step ? <b className="film-tag__step">{t.step}</b> : null}
                <span className="film-tag__name">
                  {t.short ? (
                    <>
                      <span className="film-tag__long">{t.name}</span>
                      <span className="film-tag__short">{t.short}</span>
                    </>
                  ) : (
                    t.name
                  )}
                </span>
                {t.spec ? <span className="film-tag__spec">{t.spec}</span> : null}
              </div>
            );
          })}
        </div>

        <p className="explorer__badge">
          <span>Konzeptionelle Darstellung</span>
          <span className="explorer__badge-sep"> · </span>
          <span>Produkt in Entwicklung</span>
        </p>
        {load === "loading" ? (
          <p className="explorer__status" role="status">
            3D-Modell wird geladen …
          </p>
        ) : null}
        {load === "nowebgl" ? (
          <p className="explorer__status" role="status">
            Dein Browser zeigt kein 3D. Hier siehst du den geplanten Aufbau als Bild.
          </p>
        ) : null}

        {/* Kapitel des Films */}
        <div className="film-ui" aria-hidden={inFilm ? undefined : true} inert={inFilm ? undefined : true}>
          <div className="film-ui__captions">
            {CHAPTERS.map((c, i) => (
              <div
                key={c.id}
                className={`film-cap film-cap--${c.id}`}
                ref={(el) => {
                  captionEls.current[i] = el;
                }}
              >
                {c.title ? <p className="film-cap__title">{c.title}</p> : null}
                <p className="film-cap__text">{c.text}</p>
              </div>
            ))}
          </div>
          <div className="film-ui__foot">
            <span className="film-ui__bar" aria-hidden="true">
              <span ref={barRef} />
            </span>
            <button type="button" className="film-ui__skip" onClick={skipFilm}>
              Überspringen
            </button>
          </div>
        </div>

        {load === "ready" ? (
          <>
            <p className="explorer__hint" aria-hidden="true">
              <span className="hint-fine">Ziehen zum Drehen · Strg + Scrollen zum Zoomen</span>
              <span className="hint-coarse">Mit einem Finger drehen, mit zwei zoomen</span>
            </p>
            <div className="explorer__zoom" inert={inFilm ? true : undefined}>
              <button type="button" className="icon-btn" onClick={() => setZoom((z) => ({ n: z.n + 1, dir: 1 }))} aria-label="Näher heranzoomen">
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12" /></svg>
              </button>
              <button type="button" className="icon-btn" onClick={() => setZoom((z) => ({ n: z.n + 1, dir: -1 }))} aria-label="Herauszoomen">
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12" /></svg>
              </button>
            </div>
          </>
        ) : null}

        <div className="explorer__modes" role="group" aria-label="Entdecke das Innenleben: Ansicht wählen" inert={inFilm ? true : undefined}>
          {MODES.map((m) => (
            <button key={m.id} type="button" className="seg" aria-pressed={mode === m.id} onClick={() => chooseMode(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`explorer__info explorer__info--${mode}`}>
        <div className="explorer__copy" aria-live="polite">
          <h3>{current.title}</h3>
          {current.text.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>

        <div className="explorer__side">
          {mode === "produkt" ? (
            <button type="button" className="btn btn--outline" onClick={() => chooseMode("explosion")}>
              <span className="btn__dot" aria-hidden="true" />
              <span>Entdecke das Innenleben</span>
            </button>
          ) : null}

          {mode === "explosion" ? (
            <>
              <div className="explorer__controls">
                <label className="range">
                  <span>Auseinanderziehen</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round(explode * 100)}
                    onChange={(e) => setExplode(Number(e.target.value) / 100)}
                  />
                </label>
                <button
                  type="button"
                  className="btn btn--quiet"
                  onClick={() => {
                    setExplode(0);
                    setPulled({});
                  }}
                >
                  <span>Zusammensetzen</span>
                </button>
              </div>
              <ol className="parts" aria-label="Bauteile">
                {LISTED.map((p) => {
                  const out = (pulled[p.id] ?? 0) > 0.5;
                  const body = (
                    <>
                      <span className="parts__letter" aria-hidden="true">
                        {p.letter}
                      </span>
                      <span className="parts__name">{p.name}</span>
                      <span className="parts__text">{p.text}</span>
                    </>
                  );
                  return (
                    <li key={p.id}>
                      {p.draggable ? (
                        <button
                          type="button"
                          className={`parts__item${hovered === p.id ? " is-hot" : ""}`}
                          aria-pressed={out}
                          onClick={() => showPart(p.id)}
                          onPointerEnter={() => setHovered(p.id)}
                          onPointerLeave={() => setHovered(null)}
                          onFocus={() => setHovered(p.id)}
                          onBlur={() => setHovered(null)}
                        >
                          {body}
                          <span className="sr-only">{out ? ", herausgezogen" : ", im Modell herausziehen"}</span>
                        </button>
                      ) : (
                        <div className="parts__item">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </>
          ) : null}

          {mode === "wasser" ? (
            <div className="explorer__controls">
              {!reduced ? (
                <button type="button" className="btn btn--quiet" onClick={() => setPlaying((p) => !p)} aria-pressed={!playing}>
                  <span>{playing ? "Animation anhalten" : "Animation abspielen"}</span>
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
