"use client";

/**
 * Interaktives KONZEPTMODELL des Pflanzkastens (React Three Fiber).
 * Prozedurale Näherung an die Konzeptbilder – keine Produktions-CAD.
 * Rendert nur bei Bedarf (frameloop="demand").
 *
 * Zwei Treiber, nie gleichzeitig:
 *   film   – die GSAP-Timeline (ScrollTrigger, scrub) schreibt in `film`; jedes Bauteil liest
 *            daraus seinen Versatz, die Kamera ihre Position. Keine Eingaben, keine eigenen Uhren.
 *   manual – Tabs, Regler, Ziehen und Drehen wie bisher.
 * Nur die Bauteil-Gruppen selbst schreiben ihre Transformationen (eine Quelle je Objekt).
 */
import { Suspense, createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Environment, Html, Lightformer, OrbitControls, useGLTF } from "@react-three/drei";
type OrbitControlsImpl = THREE.EventDispatcher<{ start: object; end: object; change: object }> & {
  enabled: boolean;
  target: THREE.Vector3;
  update: () => void;
};
import { DIM, MODEL_Y, rng } from "./geometry";
import { PART_BY_ID, type Mode, type PartId } from "./parts";
import { PARKED, TAG_ORDER, type FilmState, type FilmTagId } from "./film";

export type Driver = "film" | "manual";
type Layout = "wide" | "medium" | "narrow";

/**
 * Platzbedarf im Film (px): rechts die Beschriftungsspalte, oben das Hinweis-Schild,
 * unten links der Kapiteltext (auf dem Handy liegt er unter der Szene).
 */
const ROOM: Record<Layout, { gap: number; col: number; pad: number; top: number; capW: (w: number) => number; capH: number }> = {
  wide: { gap: 44, col: 240, pad: 24, top: 72, capW: (w) => 28 + Math.min(300, 0.26 * w) + 28, capH: 184 },
  medium: { gap: 36, col: 224, pad: 20, top: 72, capW: (w) => 28 + Math.min(300, 0.4 * w) + 24, capH: 196 },
  narrow: { gap: 24, col: 120, pad: 10, top: 90, capW: () => 0, capH: 0 },
};
export type Quality = "high" | "low";
export type SceneBridge = { invalidate?: () => void };

export type SceneProps = {
  mode: Mode;
  explode: number;
  pulled: Partial<Record<PartId, number>>;
  onPull: (id: PartId, value: number) => void;
  hovered: PartId | null;
  onHover: (id: PartId | null) => void;
  playing: boolean;
  reduced: boolean;
  zoom: { n: number; dir: 1 | -1 };
  onReady: () => void;
  /** DOM-Ebene über dem Canvas, in die die Beschriftungen gerendert werden */
  labels: React.RefObject<HTMLDivElement | null>;
  /** wer gerade die Bauteile bewegt */
  driver: Driver;
  /** Zustand des Scroll-Films (wird von GSAP beschrieben, hier nur gelesen) */
  film: FilmState;
  /** Ebene mit den Film-Beschriftungen (Führungslinien) */
  filmTags: React.RefObject<HTMLDivElement | null>;
  /** gibt dem Aufrufer invalidate(), damit GSAP-Updates sofort einen Frame anstoßen */
  bridge: React.MutableRefObject<SceneBridge>;
  quality: Quality;
  /** schmaler Bildschirm: Modell im Film weiter links, Beschriftungen kompakter */
  layout: Layout;
};

// ── Abgeleitete Maße ──────────────────────────────────────────────────────
const { A, B, H, Rx, Rz, rc, t } = DIM;
const GAP = 0.012;
// Maße aus dem Blender-Mastermodell v6 (blender/v6/sg_model.py, Meter × 3 = Viewer-Einheiten)
const INSERT = { x0: -1.15, x1: 1.15, bottom: 0.339, top: 0.801, halfD: 0.33 };
const INSERT_W = INSERT.x1 - INSERT.x0;
const INSERT_CX = (INSERT.x0 + INSERT.x1) / 2;
const SOIL_TOP = 0.747;
const PLATE_Y = 0.297;
const RES_TOP = 0.279;
const WATER_TOP = 0.198;
const WICK_X = 0.615;
const WICK = { w: 0.15, bottom: 0.036, top: 0.45, z: 0, th: 0.009 };
const SHAFT = { x: 1.02, z: -0.04, r: 0.045, bottom: 0.14, top: 0.83 };
const ROD = { y: 0.879, z: -0.41, r: 0.0375 }; // hinter dem oberen Kastenbereich (Spezifikation 5)
const HOOK_X = 0.78;
const STRAP = { w: 0.18, th: 0.012 };
const WALL_INNER = 1.67;

const PRESETS: Record<Mode, { pos: [number, number, number]; target: [number, number, number] }> = {
  produkt: { pos: [2.15, 0.95, 4.25], target: [0, 0, 0] },
  explosion: { pos: [3.9, 2.0, 7.8], target: [0, 0.3, 0] },
  wasser: { pos: [0.9, 0.7, 4.5], target: [0, 0.1, 0] },
  schnitt: { pos: [1.7, 1.05, 4.8], target: [0, 0.12, 0] },
  montage: { pos: [1.5, 2.3, 6.3], target: [0, 0.25, 0] },
};
const MIN_DIST = 2.8;
const MAX_DIST = 10;

// ── Gemeinsamer Zustand ───────────────────────────────────────────────────
type Ctx = SceneProps & {
  clip: THREE.Plane;
  /** zentrale Referenzen auf die Bauteil-Gruppen (für Schatten, Beschriftungen) */
  parts: React.MutableRefObject<Partial<Record<PartId, THREE.Group>>>;
};
const SceneCtx = createContext<Ctx | null>(null);
const useScene = () => useContext(SceneCtx)!;

function damp(current: number, target: number, lambda: number, dt: number) {
  return THREE.MathUtils.damp(current, target, lambda, Math.min(dt, 1 / 10));
}

/** Weich gedämpfte Zahl: ease-out ohne festes Ende, jederzeit unterbrechbar. */
function useDamped(target: number, lambda: number, reduced: boolean) {
  const v = useRef(target);
  const { invalidate } = useThree();
  useFrame((_, dt) => {
    if (reduced) {
      v.current = target;
      return;
    }
    const next = damp(v.current, target, lambda, dt);
    if (Math.abs(next - target) > 1e-4) {
      v.current = next;
      invalidate();
    } else v.current = target;
  });
  useEffect(() => invalidate(), [target, invalidate]);
  return v;
}

// ── Modell (GLB aus blender/v6/sg_export.py) und Materialien ──────────────
export const MODEL_URL = "/models/stadtgarden-v7.glb";

type Asset = {
  nodes: Record<string, THREE.Object3D>;
  mats: ReturnType<typeof buildMaterials>;
};
const AssetCtx = createContext<Asset | null>(null);
const useAsset = () => useContext(AssetCtx)!;

/**
 * Materialien aus dem GLB übernehmen und für das Echtzeitbild abstimmen:
 * Schnittebene, Alpha-Test statt Transparenz bei Blättern, keine Tiefenschreibung bei Wasser.
 */
function buildMaterials(src: Record<string, THREE.Material>, clip: THREE.Plane, quality: Quality) {
  const clipping = [clip];
  type Extra = Omit<Partial<THREE.MeshPhysicalMaterial>, "color" | "emissive"> & { color?: string; emissive?: string };
  const std = (name: string, extra: Extra = {}) => {
    const base = src[name] as THREE.MeshPhysicalMaterial | undefined;
    const m = base ? (base.clone() as THREE.MeshPhysicalMaterial) : new THREE.MeshPhysicalMaterial();
    // Glas/Wasser im Echtzeitbild als einfache Transparenz (Transmission wäre auf Handys zu teuer)
    m.transmission = 0;
    const { color, emissive, ...rest } = extra;
    Object.assign(m, { side: THREE.DoubleSide, clippingPlanes: clipping }, rest);
    if (color) m.color = new THREE.Color(color);
    if (emissive) m.emissive = new THREE.Color(emissive);
    m.needsUpdate = true;
    return m;
  };
  const leafy = (name: string, lift: number) => {
    const m = std(name, { transparent: false, alphaTest: 0.5, depthWrite: true, alphaToCoverage: quality === "high", envMapIntensity: 1.2 });
    // Echtzeit-Licht ist härter als Cycles: Blattfarben leicht anheben, damit sie zum Rendering passen
    m.color.setScalar(lift);
    // Ersatz für Transluzenz: ein wenig Eigenleuchten aus der Blattfarbe (dünne Blätter wirken sonst zu dunkel)
    m.emissiveMap = m.map;
    m.emissive = new THREE.Color("#ffffff");
    m.emissiveIntensity = lift > 1.5 ? 0.45 : 0.24;
    m.userData.keepEmissive = true;
    return m;
  };
  const shell = std("SG_Kunststoff_Weiss", { color: "#f8f7f3", roughness: 0.42, clearcoat: 0.1, clearcoatRoughness: 0.3, envMapIntensity: 1.0 });
  const gaugeWater = std("SG_Anzeige_Fluessigkeit", { color: "#6FAFAA", emissive: "#000000", emissiveIntensity: 0, roughness: 0.2 });
  gaugeWater.userData.keepEmissive = true;
  return {
    shell,
    plastic: shell,
    powder: std("SG_Pulverlack_Weiss", { color: "#f2f0eb", roughness: 0.5, clearcoat: 0.15, clippingPlanes: [] }),
    cap: std("SG_Kunststoff_Endkappe", { color: "#eeece6", roughness: 0.45, clippingPlanes: [] }),
    rubber: std("SG_Gummi_Grau", { color: "#8e908b", roughness: 0.85, clippingPlanes: [] }),
    insert: std("SG_Kunststoff_Schwarz", { color: "#1f211e", roughness: 0.55 }),
    soil: std("SG_Erde", { color: "#3b2a1c", roughness: 0.96 }),
    plate: std("SG_Kunststoff_Platte", { color: "#e7e4dc", roughness: 0.5 }),
    wick: std("SG_Docht", { color: "#ece7da", roughness: 0.95, sheen: 0.5, sheenRoughness: 0.5, sheenColor: new THREE.Color("#ffffff") }),
    reservoir: std("SG_Kunststoff_Klar", { color: "#eef6f7", roughness: 0.08, transparent: true, opacity: 0.28, depthWrite: false }),
    water: std("SG_Wasser", { color: "#B7DCD7", roughness: 0.08, transparent: true, opacity: 0.5, depthWrite: false }),
    gauge: std("SG_Fenster", { color: "#ffffff", roughness: 0.05, transparent: true, opacity: 0.2, depthWrite: false }),
    gaugeWater,
    leaf: leafy("SG_Blatt", 1.1),
    anth: leafy("SG_Blatt", 1.1),
  };
}

type MatKey = keyof ReturnType<typeof buildMaterials>;

/** Ein Mesh aus dem GLB mit eigener Materialzuweisung; Transformation des Knotens bleibt erhalten. */
function G({ name, mat, shadows = true, refFn, renderOrder }: { name: string; mat: MatKey; shadows?: boolean; refFn?: (o: THREE.Mesh | null) => void; renderOrder?: number }) {
  const { nodes, mats } = useAsset();
  const n = nodes[name] as THREE.Mesh | undefined;
  const s = useScene();
  if (!n) return null;
  const cast = shadows && s.quality === "high";
  return (
    <mesh
      ref={refFn}
      geometry={n.geometry}
      material={mats[mat]}
      position={n.position}
      quaternion={n.quaternion}
      scale={n.scale}
      castShadow={cast}
      receiveShadow={cast}
      renderOrder={renderOrder}
    />
  );
}

// ── Bauteil-Gruppe: Explosion, Herausziehen, Hover ───────────────────────
function Part({ id, follow, children }: { id: PartId; follow?: PartId; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const s = useScene();
  const { invalidate, controls } = useThree() as unknown as { invalidate: () => void; controls: OrbitControlsImpl | null };
  const info = PART_BY_ID[id];
  const pullId = follow ?? id;
  const filmDriven = s.driver === "film";
  const active = !filmDriven && s.mode === "explosion";
  const e = active ? s.explode : 0;
  const p = active ? (s.pulled[pullId] ?? 0) : 0;
  const manualTarget = useMemo(
    () => new THREE.Vector3(...info.explode).multiplyScalar(e).add(new THREE.Vector3(...info.pull).multiplyScalar(p)),
    [info, e, p],
  );
  const filmTarget = useMemo(() => new THREE.Vector3(), []);

  useLayoutEffect(() => {
    const parts = s.parts.current;
    if (ref.current) parts[id] = ref.current;
    return () => {
      delete parts[id];
    };
  }, [id, s.parts]);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    // Im Film kommt der Versatz allein aus der Timeline; manuell aus Tabs/Regler/Ziehen.
    const target = filmDriven ? filmTarget.set(0, s.film.off[id], 0) : manualTarget;
    // geparkte Teile (weit außerhalb des Bildes) gar nicht erst zeichnen
    const show = !filmDriven || Math.abs(g.position.y) < PARKED;
    if (g.visible !== show) {
      g.visible = show;
      invalidate();
    }
    if (s.reduced) {
      if (!g.position.equals(target)) {
        g.position.copy(target);
        invalidate();
      }
      return;
    }
    // Im Film folgt das Teil fast unmittelbar (der Scrub glättet schon); der Rest fängt nur
    // Sprünge beim Wechsel zwischen Film und Tabs ab.
    const lambda = filmDriven ? 18 : 6.5;
    g.position.set(
      damp(g.position.x, target.x, lambda, dt),
      damp(g.position.y, target.y, lambda, dt),
      damp(g.position.z, target.z, lambda, dt),
    );
    if (g.position.distanceToSquared(target) > 1e-8) invalidate();
    else g.position.copy(target);
  });
  useEffect(() => invalidate(), [manualTarget, filmDriven, invalidate]);

  // Hover-Hervorhebung über einen dezenten Emissive-Ton
  const hot = active && s.hovered === pullId;
  useEffect(() => {
    ref.current?.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m && "emissive" in m && !m.userData.keepEmissive) {
        m.emissive.set(hot ? "#4f6b55" : "#000000");
        m.emissiveIntensity = hot ? 0.22 : 0;
      }
    });
    invalidate();
  }, [hot, invalidate]);

  const draggable = active && PART_BY_ID[pullId].draggable;

  const onPointerDown = (ev: ThreeEvent<PointerEvent>) => {
    if (!draggable) return;
    ev.stopPropagation();
    const startY = ev.nativeEvent.clientY;
    const startX = ev.nativeEvent.clientX;
    const start = s.pulled[pullId] ?? 0;
    let moved = false;
    if (controls) controls.enabled = false;
    document.body.style.cursor = "grabbing";
    const move = (pe: PointerEvent) => {
      const dy = startY - pe.clientY;
      if (Math.abs(dy) + Math.abs(pe.clientX - startX) > 5) moved = true;
      if (moved) s.onPull(pullId, THREE.MathUtils.clamp(start + dy / 170, 0, 1));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (controls) controls.enabled = true;
      document.body.style.cursor = "";
      if (!moved) s.onPull(pullId, start > 0.5 ? 0 : 1);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  return (
    <group
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerOver={(ev) => {
        if (!draggable) return;
        ev.stopPropagation();
        s.onHover(pullId);
        document.body.style.cursor = "grab";
      }}
      onPointerOut={() => {
        if (!draggable) return;
        s.onHover(null);
        document.body.style.cursor = "";
      }}
    >
      {children}
    </group>
  );
}

// ── Beschriftungen ────────────────────────────────────────────────────────
const LABEL_MODES: Record<PartId, Mode[]> = {
  shell: ["explosion"],
  insert: ["explosion"],
  reservoir: ["explosion"],
  wick: ["explosion"],
  plate: [],
  service: [],
  indicator: ["explosion"],
  mount: ["explosion"],
};

const tagV = new THREE.Vector3();
const EDGE = 8;

function Tag({
  position,
  visible,
  hot,
  side = "right",
  children,
}: {
  position: [number, number, number];
  visible: boolean;
  hot?: boolean;
  side?: "left" | "right" | "up";
  children: React.ReactNode;
}) {
  const { labels } = useScene();
  const box = useRef<HTMLDivElement>(null);
  const width = useRef(0);
  // Wie drei, aber das Schild bleibt ganz im Bild (schmale Bildschirme)
  const place = (el: THREE.Object3D, camera: THREE.Camera, size: { width: number; height: number }) => {
    tagV.setFromMatrixPosition(el.matrixWorld).project(camera);
    let x = (tagV.x * 0.5 + 0.5) * size.width;
    const y = (-tagV.y * 0.5 + 0.5) * size.height;
    if (!width.current && box.current) width.current = box.current.offsetWidth;
    const w = width.current;
    if (w) {
      const dx = side === "right" ? 10 : side === "left" ? -10 - w : -w / 2;
      const lo = EDGE - dx;
      const hi = size.width - EDGE - w - dx;
      x = lo > hi ? lo : THREE.MathUtils.clamp(x, lo, hi);
    }
    return [x, y];
  };
  return (
    <Html
      position={position}
      portal={labels as React.MutableRefObject<HTMLElement>}
      zIndexRange={[20, 0]}
      style={{ pointerEvents: "none" }}
      calculatePosition={place}
    >
      <div ref={box} className={`tag tag--${side}${visible ? " is-on" : ""}${hot ? " is-hot" : ""}`} aria-hidden="true">
        {children}
      </div>
    </Html>
  );
}

function PartTag({ id, position, side }: { id: PartId; position: [number, number, number]; side?: "left" | "right" }) {
  const s = useScene();
  const info = PART_BY_ID[id];
  // Handy: die Füllstandsanzeige nicht beschriften (zu eng neben dem Reservoir; sie steht in der Teileliste)
  const crowded = s.layout === "narrow" && id === "indicator";
  const visible = !crowded && s.driver === "manual" && LABEL_MODES[id].includes(s.mode) && (s.mode !== "explosion" || s.explode > 0.45);
  return (
    <Tag position={position} visible={visible} hot={s.hovered === id} side={side}>
      <b>{info.letter}</b>
      {info.name}
    </Tag>
  );
}

// ── Bauteile ──────────────────────────────────────────────────────────────
function Shell() {
  return (
    <Part id="shell">
      <G name="SG_Schale" mat="shell" />
      <G name="SG_Halterung_L_Aufnahme" mat="shell" />
      <G name="SG_Halterung_R_Aufnahme" mat="shell" />
      <PartTag id="shell" position={[-1.14, 0.2, 0.3]} side="left" />
    </Part>
  );
}

function Indicator() {
  return (
    <Part id="indicator" follow="shell">
      <G name="SG_Anzeige_Rueckwand" mat="shell" shadows={false} />
      <G name="SG_Anzeige_Wasser" mat="gaugeWater" shadows={false} />
      <G name="SG_Anzeige_Fenster" mat="gauge" shadows={false} renderOrder={3} />
      <PartTag id="indicator" position={[0.08, 0.6, B + 0.02]} />
    </Part>
  );
}

function Insert() {
  const { mats } = useAsset();
  const s = useScene();
  const { invalidate } = useThree();
  // In der Montage-Ansicht treten die Pflanzen zurück, damit Stange und Halterungen frei liegen
  const show = useDamped(s.driver === "manual" && s.mode === "montage" ? 0 : 1, 5, s.reduced);
  const plants = useRef<(THREE.Mesh | null)[]>([]);
  const last = useRef(1);
  useFrame(() => {
    const v = show.current;
    if (Math.abs(v - last.current) < 1e-4) return;
    last.current = v;
    for (const m of [mats.leaf, mats.anth]) {
      const fading = v < 0.999;
      if (m.transparent !== fading) {
        m.transparent = fading;
        m.needsUpdate = true;
      }
      m.opacity = v;
    }
    plants.current.forEach((o) => o && (o.visible = v > 0.02));
    invalidate();
  });
  const keep = (i: number) => (o: THREE.Mesh | null) => {
    plants.current[i] = o;
  };
  const { nodes } = useAsset();
  const crown = useMemo(() => Object.keys(nodes).filter((k) => k.startsWith("SG_Pflanze_Krone")), [nodes]);
  return (
    <Part id="insert">
      <G name="SG_Pflanzeinsatz" mat="insert" />
      <G name="SG_Erde" mat="soil" />
      <G name="SG_Pflanze_Ranken_Staengel" mat="leaf" refFn={keep(0)} />
      <G name="SG_Pflanze_Ranken_Blaetter" mat="leaf" refFn={keep(1)} />
      {crown.map((k, i) => (
        <G key={k} name={k} mat="anth" refFn={keep(2 + i)} />
      ))}
      <PartTag id="insert" position={[-1.12, 0.62, 0.28]} side="left" />
    </Part>
  );
}

function Plate() {
  return (
    <Part id="plate">
      <G name="SG_Trennplatte" mat="plate" />
      <PartTag id="plate" position={[0.25, PLATE_Y + 0.02, 0.3]} />
    </Part>
  );
}

function Reservoir() {
  return (
    <Part id="reservoir">
      <G name="SG_Wasser" mat="water" shadows={false} renderOrder={1} />
      <G name="SG_Reservoir" mat="reservoir" shadows={false} renderOrder={2} />
      <PartTag id="reservoir" position={[0.62, 0.1, 0.32]} />
    </Part>
  );
}

function Wicks() {
  const { mats } = useAsset();
  const s = useScene();
  const manual = s.driver === "manual";
  const wet = useDamped(manual && s.mode === "wasser" ? 1 : 0, 5, s.reduced);
  const dry = useMemo(() => mats.wick.color.clone(), [mats]);
  const wetC = useMemo(() => new THREE.Color("#BFDDD8"), []);
  useFrame(() => {
    mats.wick.color.copy(dry).lerp(wetC, manual ? wet.current : s.film.wet);
  });
  return (
    <Part id="wick">
      <G name="SG_Docht_L" mat="wick" />
      <G name="SG_Docht_R" mat="wick" />
      <PartTag id="wick" position={[-WICK_X - 0.09, WICK.top - 0.1, 0.02]} side="left" />
      <WaterFlow />
    </Part>
  );
}

/** v6: kein Einfüllschacht (nicht Teil des festgelegten Produkts). */
function Service() {
  return null;
}

const ROD_HALF = 1.5; // Spannweite im GLB (halbe Länge bis Endkappe)

function Mount() {
  const s = useScene();
  const montage = s.driver === "manual" && s.mode === "montage";
  const half = useDamped(montage ? WALL_INNER - 0.05 : ROD_HALF, 3.2, s.reduced);
  const arrows = useDamped(montage ? 1 : 0, 4, s.reduced);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const arrowRefs = useRef<(THREE.Object3D | null)[]>([]);

  // Teleskop: Außenrohr (links) und Innenrohr (rechts) gleiten auseinander, die Endkappen wandern mit
  useFrame(() => {
    const d = half.current - ROD_HALF;
    if (left.current) left.current.position.x = -d;
    if (right.current) right.current.position.x = d;
    arrowRefs.current.forEach((o, i) => {
      if (!o) return;
      const side = i === 0 ? -1 : 1;
      o.position.x = side * (half.current - 0.32);
      o.scale.setScalar(Math.max(0.0001, arrows.current));
      o.visible = arrows.current > 0.01;
    });
  });

  return (
    <Part id="mount">
      <group ref={left}>
        <G name="SG_Stange_Aussen" mat="powder" />
        <G name="SG_Stange_Klemmring" mat="cap" />
        <G name="SG_Endkappe_L" mat="cap" />
        <G name="SG_Endkappe_L_Gummi" mat="rubber" />
      </group>
      <group ref={right}>
        <G name="SG_Stange_Innen" mat="powder" />
        <G name="SG_Endkappe_R" mat="cap" />
        <G name="SG_Endkappe_R_Gummi" mat="rubber" />
      </group>
      <G name="SG_Halterung_L" mat="powder" />
      <G name="SG_Halterung_R" mat="powder" />
      {/* Druckpfeile in der Montage-Ansicht */}
      <group position={[0, ROD.y, ROD.z]}>
        {[-1, 1].map((side, i) => (
          <group
            key={side}
            ref={(o) => {
              arrowRefs.current[i] = o;
            }}
            position={[side * 1.3, 0.16, 0]}
          >
            <mesh rotation={[0, 0, side * -Math.PI / 2]} position={[side * 0.1, 0, 0]}>
              <coneGeometry args={[0.035, 0.08, 20]} />
              <meshStandardMaterial color="#173F35" roughness={0.5} />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.009, 0.009, 0.14, 12]} />
              <meshStandardMaterial color="#173F35" roughness={0.5} />
            </mesh>
          </group>
        ))}
      </group>
      <PartTag id="mount" position={[0.55, ROD.y + 0.1, ROD.z]} />
      <Tag position={[-HOOK_X - STRAP.w / 2, ROD.y - 0.2, ROD.z + 0.05]} visible={montage} side="left">
        Halterung
      </Tag>
      <Tag position={[0.15, ROD.y + 0.14, ROD.z]} visible={montage} side="up">
        Spannstange, verstellbar
      </Tag>
      <Tag position={[WALL_INNER - 0.55, ROD.y - 0.2, ROD.z + 0.1]} visible={montage}>
        Endkappe an der Laibung
      </Tag>
    </Part>
  );
}

// ── Wasserweg: Partikel vom Reservoir über die Dochte ins Substrat ─────────
const DROPS = 72;
function WaterFlow() {
  const s = useScene();
  const ref = useRef<THREE.InstancedMesh>(null);
  const time = useRef(0);
  const { invalidate } = useThree();
  const manual = s.driver === "manual";
  const vis = useDamped(manual && s.mode === "wasser" ? 1 : 0, 5, s.reduced);
  const count = s.quality === "low" ? 40 : DROPS;
  const seeds = useMemo(() => {
    const r = rng(42);
    return Array.from({ length: count }, (_, i) => ({
      side: i % 2 ? 1 : -1,
      phase: i / count + r() * 0.01,
      x0: (r() - 0.5) * 0.7,
      z0: (r() - 0.5) * 0.2,
      jx: (r() - 0.5) * 0.11,
      sx: (r() - 0.5) * 0.8,
      sy: 0.04 + r() * 0.2,
      sz: -0.04 - r() * 0.16,
    }));
  }, [count]);
  const geo = useMemo(() => new THREE.SphereGeometry(0.014, 10, 8), []);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#7FBDB7", emissive: "#3E7F7A", emissiveIntensity: 0.35, roughness: 0.25 }),
    [],
  );
  const o = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    // Im Film kommen Sichtbarkeit und Phase aus der Scroll-Position (rückwärts genauso),
    // manuell läuft eine eigene, anhaltbare Schleife.
    const v = manual ? vis.current : s.film.flow;
    mesh.visible = v > 0.01;
    if (!mesh.visible) return;
    const animate = manual && s.playing && !s.reduced && s.mode === "wasser";
    if (animate) time.current += Math.min(dt, 1 / 20) / 3.4;
    const phase = manual ? time.current : s.film.flowT;
    const ease = (x: number) => x * x * (3 - 2 * x);
    seeds.forEach((d, i) => {
      const u = (((d.phase + phase) % 1) + 1) % 1;
      const wx = d.side * WICK_X;
      const front = WICK.z + 0.014;
      let x: number, y: number, z: number;
      if (u < 0.22) {
        const k = ease(u / 0.22);
        x = wx + d.x0 * (1 - k) + d.jx * k;
        y = 0.07 + 0.05 * k;
        z = d.z0 * (1 - k) + front * k;
      } else if (u < 0.66) {
        const k = (u - 0.22) / 0.44;
        x = wx + d.jx;
        y = 0.12 + (WICK.top - 0.12) * k;
        z = front;
      } else {
        const k = ease((u - 0.66) / 0.34);
        x = wx + d.jx + d.sx * k * (d.side === 1 ? -1 : 1) * 0.6;
        y = WICK.top + d.sy * k;
        z = front + (d.sz - front) * k;
      }
      const grow = Math.min(1, u / 0.06) * Math.min(1, (1 - u) / 0.14);
      o.position.set(x, y, z);
      o.scale.setScalar(Math.max(0.0001, grow * v));
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (animate) invalidate();
  });

  const on = manual && s.mode === "wasser";
  return (
    <group>
      <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} />
      <Tag position={[0.5, 0.13, 0.05]} visible={on}>
        <b>1</b>Wasser im Reservoir
      </Tag>
      <Tag position={[-WICK_X - 0.09, 0.34, 0.02]} visible={on} side="left">
        <b>2</b>Kapillarelemente leiten es nach oben
      </Tag>
      <Tag position={[0.05, 0.68, 0.0]} visible={on}>
        <b>3</b>Das Substrat nimmt es auf
      </Tag>
    </group>
  );
}

// ── Montage-Umgebung: Laibung, Fensterbank, Fenster ──────────────────────
function Surroundings() {
  const s = useScene();
  const show = useDamped(s.driver === "manual" && s.mode === "montage" ? 1 : 0, 4, s.reduced);
  const group = useRef<THREE.Group>(null);
  const mats = useMemo(() => {
    const mk = (color: string, roughness: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
      new THREE.MeshStandardMaterial({ color, roughness, transparent: true, opacity: 0, ...extra });
    return {
      plaster: mk("#efeae1", 0.95),
      stone: mk("#dcd6cb", 0.85),
      frame: mk("#f6f5f1", 0.4),
      glass: mk("#9fb1b8", 0.08, { metalness: 0.1 }),
    };
  }, []);
  useFrame(() => {
    const v = show.current;
    if (group.current) {
      group.current.visible = v > 0.01;
      group.current.position.y = (1 - v) * -0.15;
    }
    mats.plaster.opacity = v;
    mats.stone.opacity = v;
    mats.frame.opacity = v;
    mats.glass.opacity = v * 0.35;
    const opaque = v > 0.99;
    for (const m of [mats.plaster, mats.stone, mats.frame]) {
      if (m.transparent === opaque) {
        m.transparent = !opaque;
        m.needsUpdate = true;
      }
    }
  });
  const wallW = 0.6;
  const wallX = WALL_INNER + wallW / 2;
  return (
    <group ref={group} visible={false}>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * wallX, 0.62, -0.25]} material={mats.plaster}>
          <boxGeometry args={[wallW, 2.9, 1.1]} />
        </mesh>
      ))}
      {/* Außensims: der Kasten steht darauf (Oberkante = Kastenboden, Spezifikation 5) */}
      <mesh position={[0, -0.03, -0.15]} material={mats.stone}>
        <boxGeometry args={[2 * WALL_INNER + 0.5, 0.06, 1.25]} />
      </mesh>
      {/* Fenster hinter dem Kasten */}
      <mesh position={[0, 0.85, -0.78]} material={mats.glass}>
        <planeGeometry args={[2 * WALL_INNER, 2.1]} />
      </mesh>
      {[
        [0, 0.04, -0.76, 2 * WALL_INNER, 0.08, 0.06],
        // kein Kämpfer auf Stangenhöhe: sonst liest sich der Rahmen wie eine zweite Stange
        [0, 0.85, -0.76, 0.07, 2.1, 0.06],
      ].map(([x, y, z, w, h, d], i) => (
        <mesh key={i} position={[x, y, z]} material={mats.frame}>
          <boxGeometry args={[w, h, d]} />
        </mesh>
      ))}
    </group>
  );
}

// ── Kamera ────────────────────────────────────────────────────────────────
const DEG = Math.PI / 180;

function CameraRig() {
  const s = useScene();
  const { camera, invalidate, controls, size } = useThree() as unknown as {
    camera: THREE.PerspectiveCamera;
    invalidate: () => void;
    controls: OrbitControlsImpl | null;
    size: { width: number; height: number };
  };
  const film = s.driver === "film";
  const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const look = useMemo(() => new THREE.Vector3(), []);
  const want = useMemo(() => ({ pos: new THREE.Vector3(), target: new THREE.Vector3() }), []);

  // Wechsel zwischen Film und Tabs: Blickpunkt übergeben, keine Restbewegung mitnehmen
  useEffect(() => {
    goal.current = null;
    if (controls) {
      if (film) look.copy(controls.target);
      else {
        controls.target.copy(look);
        controls.update();
      }
    }
    invalidate();
  }, [film, controls, look, invalidate]);

  useEffect(() => {
    if (film) return;
    const p = PRESETS[s.mode];
    const pos = new THREE.Vector3(...p.pos);
    const target = new THREE.Vector3(...p.target);
    // Explosion auf dem Handy etwas weiter weg, damit die Beschriftungen ins Bild passen
    if (s.mode === "explosion" && s.layout === "narrow") pos.sub(target).multiplyScalar(1.22).add(target);
    goal.current = { pos, target };
    invalidate();
  }, [s.mode, s.layout, film, invalidate]);

  useEffect(() => {
    if (film || !s.zoom.n || !controls) return;
    const target = controls.target.clone();
    const off = camera.position.clone().sub(target);
    const len = THREE.MathUtils.clamp(off.length() * (s.zoom.dir > 0 ? 0.82 : 1.22), MIN_DIST, MAX_DIST);
    goal.current = { pos: target.clone().add(off.setLength(len)), target };
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.zoom]);

  useEffect(() => {
    if (!controls) return;
    const stop = () => {
      goal.current = null;
    };
    controls.addEventListener("start", stop);
    return () => controls.removeEventListener("start", stop);
  }, [controls]);

  /** Modellmitte im Bild verschieben, ohne die Perspektive zu ändern (Platz für Beschriftungen). */
  const setOffset = (cx: number, cy: number) => {
    const W = size.width;
    const H = size.height;
    const ox = (0.5 - cx) * W;
    const oy = (0.5 - cy) * H;
    const v = camera.view;
    if (Math.abs(ox) < 0.5 && Math.abs(oy) < 0.5) {
      if (v?.enabled) camera.clearViewOffset();
      return;
    }
    if (!v?.enabled || v.fullWidth !== W || v.fullHeight !== H || Math.abs(v.offsetX - ox) > 0.2 || Math.abs(v.offsetY - oy) > 0.2) {
      camera.setViewOffset(W, H, ox, oy, W, H);
    }
  };

  useFrame((_, dt) => {
    if (film) {
      const c = s.film.cam;
      const az = c.az * DEG;
      const el = c.el * DEG;
      // Bildaufbau: den Bereich ew × eh in die freie Fläche neben Beschriftungen und Kapiteltext einpassen.
      // Zwei Möglichkeiten (über dem Kapiteltext oder rechts daneben) – die mit dem größeren Modell gewinnt.
      const W = size.width;
      const H = size.height;
      const R = ROOM[s.layout];
      const tanV = Math.tan((camera.fov * DEG) / 2);
      const tanH = tanV * (W / H);
      const fill = 0.92;
      // Handy: im Bildaufbau etwas mehr von der Seite – die Teile werden schmaler und dafür größer
      const narrow = s.layout === "narrow";
      const azEff = az + (narrow ? 30 * DEG * c.frame : 0);
      const ew = c.ew * (narrow ? 1 - 0.19 * c.frame : 1);
      const right = W - (R.gap + R.col + R.pad);
      const fit = (rx: number, ry: number, rw: number, rh: number) => {
        rw = Math.max(rw, 40);
        rh = Math.max(rh, 40);
        const d = Math.max((ew * W) / (2 * tanH * rw * fill), (c.eh * H) / (2 * tanV * rh * fill));
        return { d, cx: (rx + rw / 2) / W, cy: (ry + rh / 2) / H };
      };
      const above = fit(R.pad, R.top, right - R.pad, H - R.top - Math.max(R.pad, R.capH));
      const capW = R.capW(W);
      const beside = capW > 0 ? fit(capW, R.top, right - capW, H - R.top - R.pad) : above;
      const best = beside.d < above.d ? beside : above;
      const f = c.frame;
      const dist = c.dist + (best.d - c.dist) * f;
      const cx = 0.5 + (best.cx - 0.5) * f;
      const cy = 0.5 + (best.cy - 0.5) * f;
      want.target.set(c.tx, c.ty, 0);
      want.pos.set(c.tx + dist * Math.cos(el) * Math.sin(azEff), c.ty + dist * Math.sin(el), dist * Math.cos(el) * Math.cos(azEff));
      if (s.reduced) {
        camera.position.copy(want.pos);
        look.copy(want.target);
      } else {
        const k = 1 - Math.exp(-18 * Math.min(dt, 1 / 20));
        camera.position.lerp(want.pos, k);
        look.lerp(want.target, k);
      }
      camera.lookAt(look);
      if (controls) controls.target.copy(look);
      setOffset(cx, cy);
      if (camera.position.distanceToSquared(want.pos) > 1e-8 || look.distanceToSquared(want.target) > 1e-8) invalidate();
      return;
    }

    if (camera.view?.enabled) {
      camera.clearViewOffset();
      invalidate();
    }
    const g = goal.current;
    if (!g || !controls) return;
    if (s.reduced) {
      camera.position.copy(g.pos);
      controls.target.copy(g.target);
      goal.current = null;
      controls.update();
      return;
    }
    const k = 1 - Math.exp(-4.2 * Math.min(dt, 1 / 10));
    camera.position.lerp(g.pos, k);
    controls.target.lerp(g.target, k);
    controls.update();
    if (camera.position.distanceTo(g.pos) < 0.004 && controls.target.distanceTo(g.target) < 0.004) goal.current = null;
    invalidate();
  });
  return null;
}

/** Hält den horizontalen Bildwinkel auf schmalen Bildschirmen konstant, damit das Modell hineinpasst. */
function ResponsiveFov() {
  const { camera, size, invalidate } = useThree() as unknown as {
    camera: THREE.PerspectiveCamera;
    size: { width: number; height: number };
    invalidate: () => void;
  };
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const ref = 1.3;
    const base = 30;
    const fov =
      aspect >= ref
        ? base
        : THREE.MathUtils.radToDeg(2 * Math.atan((Math.tan(THREE.MathUtils.degToRad(base / 2)) * ref) / aspect));
    camera.fov = Math.min(fov, 58);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, invalidate]);
  return null;
}

/** Schnittebene: blendet die vordere Hälfte aus (Schnitt- und Wasserweg-Ansicht). */
/** Im Film bleiben Schale und Sichtfenster ganz; der Schnitt gilt nur für das Innenleben. */
function ShellClip() {
  const s = useScene();
  const m = useAsset().mats;
  const film = s.driver === "film";
  useEffect(() => {
    for (const mat of [m.shell, m.gauge, m.gaugeWater]) {
      mat.clippingPlanes = film ? [] : [s.clip];
      mat.needsUpdate = true;
    }
  }, [film, m, s.clip]);
  return null;
}

function ClipDriver() {
  const s = useScene();
  const manual = s.driver === "manual";
  const cut = useDamped(manual && (s.mode === "schnitt" || s.mode === "wasser") ? 0 : 1, 4.5, s.reduced);
  useFrame(() => {
    s.clip.constant = 0.02 + (manual ? cut.current : s.film.clip) * 2.2;
  });
  return null;
}

function Ready({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    const id = requestAnimationFrame(() => onReady());
    return () => cancelAnimationFrame(id);
  }, [onReady]);
  return null;
}

function Model() {
  const s = useScene();
  const gltf = useGLTF(MODEL_URL);
  const asset = useMemo<Asset>(
    () => ({ nodes: gltf.nodes, mats: buildMaterials(gltf.materials, s.clip, s.quality) }),
    [gltf, s.clip, s.quality],
  );
  return (
    <AssetCtx.Provider value={asset}>
      <group position={[0, MODEL_Y, 0]}>
        <Shell />
        <Indicator />
        <Reservoir />
        <Wicks />
        <Plate />
        <Service />
        <Insert />
        <Mount />
        <Surroundings />
        <ShellClip />
      </group>
      <Ready onReady={s.onReady} />
    </AssetCtx.Provider>
  );
}

/** Kontaktschatten wandert mit der Außenschale (dem untersten Teil), damit nichts in den Boden sinkt. */
function Shadows() {
  const s = useScene();
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    const shell = s.parts.current.shell;
    if (g.current && shell) g.current.position.y = Math.min(0, shell.position.y);
  });
  if (s.driver === "manual" && s.mode === "montage") return null;
  return (
    // Schatten direkt unter dem Boden; wandert beim Auseinanderziehen mit der Schale nach unten
    <group ref={g}>
      <ContactShadows
        position={[0, MODEL_Y - 0.005, 0]}
        scale={7}
        far={3.2}
        blur={2.6}
        opacity={0.38}
        resolution={s.quality === "low" ? 256 : 512}
        color="#21402f"
      />
    </group>
  );
}

// ── Film-Beschriftungen: Punkt am Bauteil, Führungslinie, Text in einer Spalte ──
const ANCHORS: Record<FilmTagId, { part: PartId; at: [number, number, number] }> = {
  mount: { part: "mount", at: [1.56, ROD.y, ROD.z] },
  insert: { part: "insert", at: [INSERT.x1, 0.56, 0.16] },
  plate: { part: "plate", at: [INSERT.x1 + 0.01, PLATE_Y, 0.22] },
  wick: { part: "wick", at: [WICK_X + WICK.w / 2, 0.36, WICK.z] },
  reservoir: { part: "reservoir", at: [A - 0.1, 0.15, 0.2] },
  shell: { part: "shell", at: [A - 0.02, 0.46, 0.22] },
  w1: { part: "reservoir", at: [0.98, 0.1, 0] },
  w2: { part: "wick", at: [WICK_X + WICK.w / 2, 0.33, WICK.z] },
  w3: { part: "insert", at: [0.72, 0.62, -0.02] },
};
const TAG_GROUPS: FilmTagId[][] = [
  ["mount", "insert", "plate", "wick", "reservoir", "shell"],
  ["w1", "w2", "w3"],
];

type TagEls = { box: HTMLElement; line: SVGLineElement; dot: SVGCircleElement; h: number };

function FilmLabels() {
  const s = useScene();
  const { camera, size } = useThree();
  const els = useRef<Partial<Record<FilmTagId, TagEls>>>({});
  const cleared = useRef(false);
  const v = useMemo(() => new THREE.Vector3(), []);

  useLayoutEffect(() => {
    const root = s.filmTags.current;
    if (!root) return;
    const map: Partial<Record<FilmTagId, TagEls>> = {};
    for (const id of TAG_ORDER) {
      const box = root.querySelector<HTMLElement>(`[data-tag="${id}"]`);
      const line = root.querySelector<SVGLineElement>(`line[data-for="${id}"]`);
      const dot = root.querySelector<SVGCircleElement>(`circle[data-for="${id}"]`);
      if (box && line && dot) map[id] = { box, line, dot, h: 0 };
    }
    els.current = map;
  }, [s.filmTags]);

  // nach Größenwechsel neu messen
  useEffect(() => {
    for (const e of Object.values(els.current)) if (e) e.h = 0;
  }, [size.width, size.height, s.layout]);

  const hide = (e: TagEls) => {
    e.box.style.opacity = "0";
    e.line.style.opacity = "0";
    e.dot.style.opacity = "0";
  };

  useFrame(() => {
    const E = els.current;
    if (s.driver !== "film") {
      if (!cleared.current) {
        for (const e of Object.values(E)) if (e) hide(e);
        cleared.current = true;
      }
      return;
    }
    cleared.current = false;
    // Matrizen dieses Frames verwenden, sonst hängen die Linien einen Frame hinterher
    camera.updateMatrixWorld();
    const W = size.width;
    const H = size.height;
    const narrow = s.layout === "narrow";
    const { pad, gap, col: colW } = ROOM[s.layout];
    const space = narrow ? 6 : 10;

    for (const group of TAG_GROUPS) {
      if (!group.some((id) => s.film.tags[id] > 0.003)) {
        for (const id of group) {
          const e = E[id];
          if (e && e.box.style.opacity !== "0") hide(e);
        }
        continue;
      }
      const items: { id: FilmTagId; ax: number; ay: number; y: number; h: number; t: number; e: TagEls }[] = [];
      for (const id of group) {
        const e = E[id];
        const a = ANCHORS[id];
        const part = s.parts.current[a.part];
        if (!e || !part) continue;
        part.updateWorldMatrix(true, false);
        v.set(a.at[0], a.at[1], a.at[2]);
        part.localToWorld(v);
        v.project(camera);
        if (!e.h) e.h = e.box.offsetHeight || 40;
        items.push({ id, ax: (v.x * 0.5 + 0.5) * W, ay: (-v.y * 0.5 + 0.5) * H, y: 0, h: e.h, t: s.film.tags[id], e });
      }
      if (!items.length) continue;
      // eine Spalte rechts vom Modell; alle Teile der Gruppe reservieren ihren Platz (nichts springt)
      const colX = THREE.MathUtils.clamp(Math.max(...items.map((i) => i.ax)) + gap, pad, W - colW - pad);
      items.sort((a, b) => a.ay - b.ay);
      let edge = -Infinity;
      for (const it of items) {
        it.y = Math.max(it.ay - 11, edge + space);
        edge = it.y + it.h;
      }
      let limit = H - pad;
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        if (it.y + it.h > limit) it.y = limit - it.h;
        limit = it.y - space;
      }
      let top = pad;
      for (const it of items) {
        if (it.y < top) it.y = top;
        top = it.y + it.h + space;
      }
      for (const it of items) {
        const { e, t } = it;
        const lineT = THREE.MathUtils.clamp(t / 0.55, 0, 1);
        const textT = THREE.MathUtils.clamp((t - 0.3) / 0.7, 0, 1);
        const ex = colX - 10;
        const ey = it.y + 11;
        const len = Math.hypot(ex - it.ax, ey - it.ay);
        e.line.setAttribute("x1", it.ax.toFixed(1));
        e.line.setAttribute("y1", it.ay.toFixed(1));
        e.line.setAttribute("x2", ex.toFixed(1));
        e.line.setAttribute("y2", ey.toFixed(1));
        e.line.style.strokeDasharray = `${len.toFixed(1)}`;
        e.line.style.strokeDashoffset = `${(len * (1 - lineT)).toFixed(1)}`;
        e.line.style.opacity = lineT > 0 ? "1" : "0";
        e.dot.setAttribute("cx", it.ax.toFixed(1));
        e.dot.setAttribute("cy", it.ay.toFixed(1));
        e.dot.style.opacity = THREE.MathUtils.clamp(t / 0.2, 0, 1).toFixed(3);
        e.box.style.transform = `translate3d(${colX.toFixed(1)}px, ${(it.y + (1 - textT) * 10).toFixed(1)}px, 0)`;
        e.box.style.opacity = textT.toFixed(3);
      }
    }
  });
  return null;
}

/** Reicht invalidate() nach draußen, damit jede Änderung der Timeline sofort einen Frame bekommt. */
function Bridge() {
  const s = useScene();
  const { invalidate } = useThree();
  useEffect(() => {
    const b = s.bridge.current;
    b.invalidate = invalidate;
    return () => {
      if (b.invalidate === invalidate) b.invalidate = undefined;
    };
  }, [invalidate, s.bridge]);
  useEffect(() => invalidate(), [s.driver, invalidate]);
  return null;
}

export default function PlanterScene(props: SceneProps) {
  const clip = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, -1), 2), []);
  const parts = useRef<Partial<Record<PartId, THREE.Group>>>({});
  const ctx = useMemo(() => ({ ...props, clip, parts }), [props, clip]);
  const p = PRESETS.produkt;
  const low = props.quality === "low";
  return (
    <Canvas
      frameloop="demand"
      dpr={low ? [1, 1.25] : [1, 1.75]}
      shadows={low ? false : { type: THREE.PCFSoftShadowMap }}
      camera={{ position: p.pos, fov: 30, near: 0.1, far: 60 }}
      gl={{ antialias: true, alpha: true, powerPreference: low ? "default" : "high-performance" }}
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true;
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 1.1;
      }}
      aria-hidden="true"
    >
      <SceneCtx.Provider value={ctx}>
        <hemisphereLight args={["#ffffff", "#e3e8dc", 1.05]} />
        {/* Hauptlicht warm von links oben (wirft weiche Schatten: Blätter auf die Schale) */}
        <directionalLight
          position={[-3, 5, 4]}
          intensity={2.4}
          color="#fff8f0"
          castShadow={props.quality === "high"}
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
          shadow-radius={8}
          shadow-intensity={0.55}
          shadow-camera-left={-2.4}
          shadow-camera-right={2.4}
          shadow-camera-top={2.6}
          shadow-camera-bottom={-2.4}
          shadow-camera-near={1}
          shadow-camera-far={14}
        />
        {/* kühles Fülllicht und warmes Kantenlicht */}
        <directionalLight position={[4, 1.5, -3]} intensity={0.55} color="#e3edf2" />
        <directionalLight position={[2.5, 2.5, -4]} intensity={0.6} color="#fff6e8" />
        <Environment resolution={low ? 128 : 256} frames={1}>
          <Lightformer form="rect" intensity={2.4} position={[0, 4, 1.5]} rotation-x={Math.PI / 2} scale={[8, 3, 1]} />
          <Lightformer form="rect" intensity={1.2} position={[-5, 1, 2]} rotation-y={Math.PI / 2} scale={[4, 3, 1]} />
          <Lightformer form="rect" intensity={0.7} position={[5, 1, -1]} rotation-y={-Math.PI / 2} scale={[4, 3, 1]} />
          <Lightformer form="rect" intensity={0.5} position={[0, 1, 6]} scale={[6, 2, 1]} color="#fff6ea" />
        </Environment>
        <Suspense fallback={null}>
          <Model />
        </Suspense>
        <Shadows />
        <CameraRig />
        <ResponsiveFov />
        <ClipDriver />
        <FilmLabels />
        <Bridge />
        <OrbitControls
          makeDefault
          enabled={props.driver === "manual"}
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.7}
          zoomSpeed={0.6}
          minDistance={MIN_DIST}
          maxDistance={MAX_DIST}
          minPolarAngle={0.95}
          maxPolarAngle={1.78}
          target={p.target}
        />
      </SceneCtx.Provider>
    </Canvas>
  );
}

useGLTF.preload(MODEL_URL);
