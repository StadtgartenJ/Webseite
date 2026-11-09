"use client";

import dynamic from "next/dynamic";
import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Picture } from "../Picture";
import { MODES, PARTS, type Mode, type PartId } from "./parts";
import { createFilmState } from "./film";
import type { Quality, SceneBridge } from "./PlanterScene";

/**
 * Interaktiver 3D-Viewer (v5): Produkt · Innenleben · Wasserweg · Montage.
 * Das Modell (GLB aus Blender) und three.js werden erst geladen, wenn der Abschnitt in die Nähe kommt.
 * Bis dahin – und ohne WebGL – steht ein Standbild an derselben Stelle.
 */
const PlanterScene = dynamic(() => import("./PlanterScene"), { ssr: false });

type Load = "idle" | "loading" | "ready" | "nowebgl" | "failed";

/** Fängt Ladefehler des 3D-Modells ab (Netz weg, Datei fehlt), damit nie die ganze Seite ausfällt. */
class SceneBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
type Layout = "wide" | "medium" | "narrow";

const LISTED = PARTS.filter((p) => p.listed);
const FILM = createFilmState(); // wird ohne Scroll-Film nicht verändert

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") ||
      c.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** Schwächere Geräte: weniger Pixel, keine Schattenkarten, weniger Tropfen. */
function detectQuality(): Quality {
  const n = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  if (n.connection?.saveData) return "low";
  if ((n.deviceMemory ?? 8) <= 4) return "low";
  if ((n.hardwareConcurrency ?? 8) <= 4) return "low";
  return "high";
}

const layoutFor = (w: number): Layout =>
  w >= 1024 ? "wide" : w > 640 ? "medium" : "narrow";

export function ProductViewer() {
  const [mode, setMode] = useState<Mode>("produkt");
  const [explode, setExplode] = useState(1);
  const [pulled, setPulled] = useState<Partial<Record<PartId, number>>>({});
  const [hovered, setHovered] = useState<PartId | null>(null);
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [zoom, setZoom] = useState<{ n: number; dir: 1 | -1 }>({
    n: 0,
    dir: 1,
  });
  const [load, setLoad] = useState<Load>("idle");
  const [quality, setQuality] = useState<Quality>("high");
  const [layout, setLayout] = useState<Layout>("wide");
  const stageRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const filmTagsRef = useRef<HTMLDivElement>(null);
  const bridge = useRef<SceneBridge>({});

  useEffect(() => {
    setQuality(detectQuality());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setReduced(mq.matches);
      if (mq.matches) setPlaying(false);
    };
    apply();
    const onResize = () => setLayout(layoutFor(window.innerWidth));
    onResize();
    mq.addEventListener("change", apply);
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      mq.removeEventListener("change", apply);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Erst laden, wenn der Abschnitt näher als ~1 Bildschirm ist
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        setLoad(hasWebGL() ? "loading" : "nowebgl");
      },
      { rootMargin: "60% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

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

  const onPull = useCallback(
    (id: PartId, value: number) => setPulled((p) => ({ ...p, [id]: value })),
    [],
  );
  const onReady = useCallback(() => setLoad("ready"), []);
  const onFail = useCallback(() => setLoad("failed"), []);

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

  const current = MODES.find((m) => m.id === mode)!;
  const showScene = load === "loading" || load === "ready";

  return (
    <div className="explorer" data-driver="manual" data-film="off">
      <div className={`explorer__stage is-${load}`} ref={stageRef} data-cta-quiet="">
        <div
          className="explorer__fallback"
          aria-hidden={showScene ? true : undefined}
        >
          {load === "nowebgl" || load === "failed" ? (
            <div className="explorer__fallback-photo">
              <Picture
                name="explosion-gruen"
                widths={[800, 1200, 1640]}
                width={1640}
                height={1312}
                sizes="(min-width: 1024px) 80vw, 100vw"
                alt="Konzept-Explosionsansicht: Spannstange mit zwei Halterungen, Pflanzeinsatz mit Erde, gelochte Trennplatte, zwei Kapillarelemente, Wasserreservoir und Außenschale mit Sichtfenster"
              />
            </div>
          ) : (
            // Standbild aus demselben Blender-Modell, gleiche Kamera wie der Viewer
            <picture className="explorer__preview">
              <source
                type="image/webp"
                srcSet="/images/viewer-preview-900.webp 900w, /images/viewer-preview-1600.webp 1600w"
                sizes="(min-width: 1024px) 90vw, 100vw"
              />
              <img
                src="/images/viewer-preview-1600.webp"
                width={1600}
                height={800}
                alt=""
                loading="lazy"
                decoding="async"
              />
            </picture>
          )}
        </div>
        {showScene ? (
          <div className="explorer__canvas">
            <SceneBoundary onError={onFail}>
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
                driver="manual"
                film={FILM}
                filmTags={filmTagsRef}
                bridge={bridge}
                quality={quality}
                layout={layout}
              />
            </SceneBoundary>
          </div>
        ) : null}
        <div className="explorer__labels" ref={labelsRef} aria-hidden="true" />
        <div ref={filmTagsRef} hidden />

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
        {load === "nowebgl" || load === "failed" ? (
          <p className="explorer__status" role="status">
            {load === "nowebgl"
              ? "Dein Browser zeigt kein 3D. Hier siehst du den geplanten Aufbau als Bild."
              : "Das 3D-Modell konnte gerade nicht geladen werden. Hier siehst du den geplanten Aufbau als Bild."}
          </p>
        ) : null}

        {load === "ready" ? (
          <>
            <p className="explorer__hint" aria-hidden="true">
              <span className="hint-fine">
                Ziehen zum Drehen · Strg + Scrollen zum Zoomen
              </span>
              <span className="hint-coarse">
                Mit einem Finger drehen, mit zwei zoomen
              </span>
            </p>
            <div className="explorer__zoom">
              <button
                type="button"
                className="icon-btn"
                onClick={() => setZoom((z) => ({ n: z.n + 1, dir: 1 }))}
                aria-label="Näher heranzoomen"
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M10 4v12M4 10h12" />
                </svg>
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setZoom((z) => ({ n: z.n + 1, dir: -1 }))}
                aria-label="Herauszoomen"
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M4 10h12" />
                </svg>
              </button>
            </div>
          </>
        ) : null}

        <div
          className="explorer__modes"
          role="group"
          aria-label="Entdecke das Innenleben: Ansicht wählen"
        >
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className="seg"
              aria-pressed={mode === m.id}
              onClick={() => chooseMode(m.id)}
              disabled={
                (load === "nowebgl" || load === "failed") && m.id !== "produkt"
              }
            >
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
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => chooseMode("explosion")}
            >
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
                          <span className="sr-only">
                            {out
                              ? ", herausgezogen"
                              : ", im Modell herausziehen"}
                          </span>
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
                <button
                  type="button"
                  className="btn btn--quiet"
                  onClick={() => setPlaying((p) => !p)}
                  aria-pressed={!playing}
                >
                  <span>
                    {playing ? "Animation anhalten" : "Animation abspielen"}
                  </span>
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
