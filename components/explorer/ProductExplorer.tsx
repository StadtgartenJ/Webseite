"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { CutawayFallback } from "./CutawayFallback";
import { MODES, PARTS, type Mode, type PartId } from "./parts";

// Das 3D-Modell (three.js, R3F) wird erst geladen, wenn der Abschnitt in die Nähe kommt.
const PlanterScene = dynamic(() => import("./PlanterScene"), { ssr: false });

type Load = "idle" | "loading" | "ready" | "nowebgl";

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function ProductExplorer() {
  const [mode, setMode] = useState<Mode>("produkt");
  const [explode, setExplode] = useState(1);
  const [pulled, setPulled] = useState<Partial<Record<PartId, number>>>({});
  const [hovered, setHovered] = useState<PartId | null>(null);
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [zoom, setZoom] = useState<{ n: number; dir: 1 | -1 }>({ n: 0, dir: 1 });
  const [load, setLoad] = useState<Load>("idle");
  const stageRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        setLoad(hasWebGL() ? "loading" : "nowebgl");
      },
      { rootMargin: "100% 0px" },
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
    if (mode !== "explosion") {
      setMode("explosion");
      setExplode(1);
      setPulled({ [id]: 1 });
      return;
    }
    setPulled((p) => ({ ...p, [id]: (p[id] ?? 0) > 0.5 ? 0 : 1 }));
  };

  const current = MODES.find((m) => m.id === mode)!;
  const showScene = load === "loading" || load === "ready";

  return (
    <div className="explorer">
      <div className={`explorer__stage is-${load}`} ref={stageRef}>
        <div className="explorer__fallback" aria-hidden={showScene ? true : undefined}>
          <CutawayFallback />
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
            />
          </div>
        ) : null}
        <div className="explorer__labels" ref={labelsRef} aria-hidden="true" />

        <p className="explorer__badge">Konzeptmodell, keine finale Konstruktion</p>
        {load === "loading" ? (
          <p className="explorer__status" role="status">
            3D-Modell wird geladen …
          </p>
        ) : null}
        {load === "nowebgl" ? (
          <p className="explorer__status" role="status">
            Dein Browser zeigt kein 3D. Hier siehst du den Aufbau als Schnittzeichnung.
          </p>
        ) : null}

        {load === "ready" ? (
          <>
            <p className="explorer__hint" aria-hidden="true">
              <span className="hint-fine">Ziehen zum Drehen · Strg + Scrollen zum Zoomen</span>
              <span className="hint-coarse">Mit einem Finger drehen · mit zwei zoomen</span>
            </p>
            <div className="explorer__zoom">
              <button type="button" className="icon-btn" onClick={() => setZoom((z) => ({ n: z.n + 1, dir: 1 }))} aria-label="Näher heranzoomen">
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12" /></svg>
              </button>
              <button type="button" className="icon-btn" onClick={() => setZoom((z) => ({ n: z.n + 1, dir: -1 }))} aria-label="Herauszoomen">
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12" /></svg>
              </button>
            </div>
          </>
        ) : null}

        <div className="explorer__modes" role="group" aria-label="Ansicht wählen">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className="seg"
              aria-pressed={mode === m.id}
              onClick={() => chooseMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="explorer__panel">
        <div className="explorer__copy" aria-live="polite">
          <h3>{current.title}</h3>
          {current.text.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>

        {mode === "explosion" ? (
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
        ) : null}

        {mode === "wasser" && !reduced ? (
          <div className="explorer__controls">
            <button type="button" className="btn btn--quiet" onClick={() => setPlaying((p) => !p)} aria-pressed={!playing}>
              <span>{playing ? "Animation anhalten" : "Animation abspielen"}</span>
            </button>
          </div>
        ) : null}

        <h3 className="parts__title">Die Bauteile</h3>
        <ol className="parts">
          {PARTS.map((p) => {
            const out = mode === "explosion" && (pulled[p.id] ?? 0) > 0.5;
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
                    onPointerEnter={() => mode === "explosion" && setHovered(p.id)}
                    onPointerLeave={() => setHovered(null)}
                    onFocus={() => mode === "explosion" && setHovered(p.id)}
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
      </div>
    </div>
  );
}
