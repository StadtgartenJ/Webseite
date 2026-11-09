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
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Environment, Html, Lightformer, OrbitControls } from "@react-three/drei";
type OrbitControlsImpl = THREE.EventDispatcher<{ start: object; end: object; change: object }> & {
  enabled: boolean;
  target: THREE.Vector3;
  update: () => void;
};
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  DIM,
  MODEL_Y,
  closedBody,
  flatPlate,
  roundedRectShape,
  holeTexture,
  leafGeometry,
  openVessel,
  rng,
  smallLeafGeometry,
  soilBlock,
  strapGeometry,
  weaveTexture,
} from "./geometry";
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
const INSERT = { x0: -(A - t - GAP), x1: 0.88, bottom: 0.34, top: 0.8, halfD: B - t - 0.03 };
const INSERT_W = INSERT.x1 - INSERT.x0;
const INSERT_CX = (INSERT.x0 + INSERT.x1) / 2;
const SOIL_TOP = 0.76;
const PLATE_Y = 0.31;
const RES_TOP = 0.285;
const WATER_TOP = 0.2;
const WICK_X = 0.62;
const WICK = { w: 0.15, bottom: 0.045, top: 0.5, z: -0.03, th: 0.012 };
const SHAFT = { x: 1.02, z: -0.04, r: 0.045, bottom: 0.14, top: 0.83 };
const ROD = { y: H + 0.08, z: -B, r: 0.032 };
const HOOK_X = 0.78;
const STRAP = { w: 0.18, th: 0.016 };
const WALL_INNER = 1.67;

const PRESETS: Record<Mode, { pos: [number, number, number]; target: [number, number, number] }> = {
  produkt: { pos: [2.5, 1.05, 4.9], target: [0, 0, 0] },
  explosion: { pos: [3.9, 2.0, 7.8], target: [0, 0.3, 0] },
  wasser: { pos: [0.9, 0.7, 4.5], target: [0, 0.1, 0] },
  schnitt: { pos: [1.7, 1.05, 4.8], target: [0, 0.12, 0] },
  montage: { pos: [1.1, 0.9, 6.6], target: [0, 0.15, 0] },
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
  return THREE.MathUtils.damp(current, target, lambda, Math.min(dt, 1 / 20));
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

// ── Materialien ───────────────────────────────────────────────────────────
function useMaterials() {
  const { clip } = useScene();
  return useMemo(() => {
    const clipping = [clip];
    const plastic = new THREE.MeshPhysicalMaterial({
      color: "#fbfaf6",
      roughness: 0.4,
      clearcoat: 0.35,
      clearcoatRoughness: 0.45,
      side: THREE.DoubleSide,
      clippingPlanes: clipping,
    });
    // eigene Instanz für die Schale: im Film bleibt sie ganz, nur die Tabs schneiden sie
    const shell = plastic.clone();
    const insert = new THREE.MeshStandardMaterial({ color: "#2b2e2a", roughness: 0.72, side: THREE.DoubleSide, clippingPlanes: clipping });
    const soil = new THREE.MeshStandardMaterial({ color: "#3a2c22", roughness: 1, side: THREE.DoubleSide, clippingPlanes: clipping });
    const reservoir = new THREE.MeshPhysicalMaterial({
      color: "#d9ecf2",
      roughness: 0.08,
      clearcoat: 1,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      side: THREE.DoubleSide,
      clippingPlanes: clipping,
    });
    const water = new THREE.MeshPhysicalMaterial({
      color: "#69a9c6",
      roughness: 0.05,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      side: THREE.DoubleSide,
      clippingPlanes: clipping,
    });
    const holes = holeTexture();
    const plate = new THREE.MeshStandardMaterial({
      color: "#dedcd4",
      roughness: 0.6,
      alphaMap: holes,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      clippingPlanes: clipping,
    });
    const wick = new THREE.MeshStandardMaterial({ color: "#ffffff", map: weaveTexture(), roughness: 1, clippingPlanes: clipping });
    const rubber = new THREE.MeshStandardMaterial({ color: "#e4e1d9", roughness: 0.85 });
    const rod = new THREE.MeshPhysicalMaterial({ color: "#f4f2ed", roughness: 0.25, clearcoat: 0.6, clearcoatRoughness: 0.3 });
    const gauge = new THREE.MeshStandardMaterial({ color: "#dedbd3", roughness: 0.5, clippingPlanes: clipping });
    const gaugeWater = new THREE.MeshStandardMaterial({ color: "#7db4cc", roughness: 0.3, emissive: "#2e6f8c", emissiveIntensity: 0.15, clippingPlanes: clipping });
    gaugeWater.userData.keepEmissive = true;
    const hole = new THREE.MeshStandardMaterial({ color: "#575a55", roughness: 0.8, clippingPlanes: clipping });
    const plateRim = new THREE.MeshStandardMaterial({ color: "#e8e6df", roughness: 0.55, clippingPlanes: clipping });
    return { plastic, shell, insert, soil, reservoir, water, plate, plateRim, wick, rubber, rod, gauge, gaugeWater, hole };
  }, [clip]);
}

type Materials = ReturnType<typeof useMaterials>;
const MatCtx = createContext<Materials | null>(null);
const useMats = () => useContext(MatCtx)!;

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
  side?: "left" | "right";
  children: React.ReactNode;
}) {
  const { labels } = useScene();
  return (
    <Html position={position} portal={labels as React.MutableRefObject<HTMLElement>} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
      <div className={`tag tag--${side}${visible ? " is-on" : ""}${hot ? " is-hot" : ""}`} aria-hidden="true">
        {children}
      </div>
    </Html>
  );
}

function PartTag({ id, position, side }: { id: PartId; position: [number, number, number]; side?: "left" | "right" }) {
  const s = useScene();
  const info = PART_BY_ID[id];
  const visible = s.driver === "manual" && LABEL_MODES[id].includes(s.mode) && (s.mode !== "explosion" || s.explode > 0.45);
  return (
    <Tag position={position} visible={visible} hot={s.hovered === id} side={side}>
      <b>{info.letter}</b>
      {info.name}
    </Tag>
  );
}

// ── Bauteile ──────────────────────────────────────────────────────────────
function Shell() {
  const m = useMats();
  const geo = useMemo(() => openVessel({ A, B, H, Rx, Rz, rc }, t), []);
  return (
    <Part id="shell">
      <mesh geometry={geo} material={m.shell} />
      {/* Überlauf am rechten Ende (Konzept) */}
      <mesh position={[A - 0.024, RES_TOP - 0.03, 0]} rotation={[0, 0, Math.PI / 2]} material={m.hole}>
        <cylinderGeometry args={[0.022, 0.022, 0.012, 20]} />
      </mesh>
      <PartTag id="shell" position={[-1.14, 0.2, 0.3]} side="left" />
    </Part>
  );
}

function Indicator() {
  const m = useMats();
  const frame = useMemo(() => new THREE.CapsuleGeometry(0.03, 0.17, 6, 16), []);
  const fill = useMemo(() => new THREE.CapsuleGeometry(0.017, 0.07, 6, 12), []);
  return (
    <Part id="indicator" follow="shell">
      <group position={[0, 0.47, B]}>
        <mesh geometry={frame} material={m.gauge} scale={[1, 1, 0.12]} position={[0, 0, 0.002]} />
        <mesh geometry={fill} material={m.gaugeWater} scale={[1, 1, 0.14]} position={[0, -0.045, 0.005]} />
      </group>
      <PartTag id="indicator" position={[0.08, 0.6, B + 0.02]} />
    </Part>
  );
}

function Insert() {
  const m = useMats();
  const geo = useMemo(
    () =>
      openVessel(
        { A: INSERT_W / 2, B: INSERT.halfD, H: INSERT.top - INSERT.bottom, Rx: 0.05, Rz: 0.05, rc: rc - t - 0.02 },
        0.014,
      ),
    [],
  );
  const soil = useMemo(() => soilBlock(INSERT_W - 0.04, INSERT.halfD * 2 - 0.04, 0.22, SOIL_TOP - INSERT.bottom - 0.02), []);
  return (
    <Part id="insert">
      <group position={[INSERT_CX, INSERT.bottom, 0]}>
        <mesh geometry={geo} material={m.insert} />
        <mesh geometry={soil} material={m.soil} position={[0, 0.014, 0]} />
      </group>
      <Plants />
      <PartTag id="insert" position={[-1.12, 0.62, 0.28]} side="left" />
    </Part>
  );
}

function Plate() {
  const m = useMats();
  const geo = useMemo(() => flatPlate(INSERT_W + 0.02, INSERT.halfD * 2 + 0.02, 0.22), []);
  // umlaufender, voller Rand: macht die dünne Lochplatte auch von der Seite lesbar
  const rim = useMemo(() => {
    const w = INSERT_W + 0.02;
    const d = INSERT.halfD * 2 + 0.02;
    const outer = roundedRectShape(w, d, 0.22);
    outer.holes.push(roundedRectShape(w - 0.05, d - 0.05, 0.2));
    const g = new THREE.ExtrudeGeometry(outer, { depth: 0.016, bevelEnabled: false, curveSegments: 8 });
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  return (
    <Part id="plate">
      <mesh geometry={geo} material={m.plate} position={[INSERT_CX, PLATE_Y, 0]} />
      <mesh geometry={rim} material={m.plateRim} position={[INSERT_CX, PLATE_Y - 0.008, 0]} />
      <PartTag id="plate" position={[0.25, PLATE_Y + 0.02, 0.3]} />
    </Part>
  );
}

function Reservoir() {
  const m = useMats();
  const inset = t + GAP;
  const body = useMemo(
    () => closedBody({ A: A - inset, B: B - inset, H: RES_TOP - inset, Rx: Rx - inset, Rz: Rz - inset, rc: rc - inset }),
    [inset],
  );
  const water = useMemo(() => {
    const i2 = inset + 0.01;
    return closedBody({ A: A - i2, B: B - i2, H: WATER_TOP - i2, Rx: Rx - i2, Rz: Rz - i2, rc: rc - i2 });
  }, [inset]);
  return (
    <Part id="reservoir">
      <mesh geometry={water} material={m.water} position={[0, inset + 0.01, 0]} renderOrder={1} />
      <mesh geometry={body} material={m.reservoir} position={[0, inset, 0]} renderOrder={2} />
      <PartTag id="reservoir" position={[0.62, 0.1, 0.32]} />
    </Part>
  );
}

function Wicks() {
  const m = useMats();
  const s = useScene();
  const manual = s.driver === "manual";
  const wet = useDamped(manual && s.mode === "wasser" ? 1 : 0, 5, s.reduced);
  const dry = useMemo(() => new THREE.Color("#ffffff"), []);
  const wetC = useMemo(() => new THREE.Color("#bcdbe8"), []);
  useFrame(() => {
    m.wick.color.copy(dry).lerp(wetC, manual ? wet.current : s.film.wet);
  });
  const h = WICK.top - WICK.bottom;
  return (
    <Part id="wick">
      {[-WICK_X, WICK_X].map((x) => (
        <mesh key={x} position={[x, WICK.bottom + h / 2, WICK.z]} material={m.wick}>
          <boxGeometry args={[WICK.w, h, WICK.th]} />
        </mesh>
      ))}
      <PartTag id="wick" position={[-WICK_X - 0.09, WICK.top - 0.1, 0.02]} side="left" />
      <WaterFlow />
    </Part>
  );
}

function Service() {
  const m = useMats();
  const len = SHAFT.top - SHAFT.bottom;
  return (
    <Part id="service">
      <group position={[SHAFT.x, 0, SHAFT.z]}>
        <mesh position={[0, SHAFT.bottom + len / 2, 0]} material={m.plastic}>
          <cylinderGeometry args={[SHAFT.r, SHAFT.r, len, 28, 1, true]} />
        </mesh>
        <mesh position={[0, SHAFT.top + 0.01, 0]} material={m.plastic}>
          <cylinderGeometry args={[SHAFT.r + 0.018, SHAFT.r + 0.018, 0.02, 32]} />
        </mesh>
        <mesh position={[0, SHAFT.top + 0.021, 0]} material={m.hole}>
          <torusGeometry args={[SHAFT.r * 0.55, 0.006, 8, 28]} />
        </mesh>
      </group>
      <PartTag id="service" position={[SHAFT.x - 0.06, SHAFT.top + 0.16, 0]} side="left" />
    </Part>
  );
}

function Mount() {
  const m = useMats();
  const s = useScene();
  const montage = s.driver === "manual" && s.mode === "montage";
  const half = useDamped(montage ? WALL_INNER - 0.05 : 1.5, 3.2, s.reduced);
  const arrows = useDamped(montage ? 1 : 0, 4, s.reduced);
  const tube = useRef<THREE.Mesh>(null);
  const ends = useRef<(THREE.Object3D | null)[]>([]);
  const arrowRefs = useRef<(THREE.Object3D | null)[]>([]);
  // Breite, flache Halterung: Lasche hinter der Stange, Bogen darüber, Band innen an der Rückwand hinab
  const strap = useMemo(() => {
    const R = ROD.r + STRAP.th / 2 + 0.004;
    const pts: [number, number][] = [
      [ROD.z - R, ROD.y - 0.075],
      [ROD.z - R, ROD.y - 0.02],
    ];
    for (let i = 0; i <= 18; i++) {
      const a = Math.PI - (i / 18) * Math.PI;
      pts.push([ROD.z + R * Math.cos(a), ROD.y + R * Math.sin(a)]);
    }
    pts.push([ROD.z + R, ROD.y - 0.06], [ROD.z + R, 0.47]);
    return strapGeometry(pts, STRAP.w, STRAP.th);
  }, []);

  useFrame(() => {
    const L = half.current;
    if (tube.current) tube.current.scale.set(1, 2 * L - 0.3, 1);
    ends.current.forEach((o, i) => {
      if (!o) return;
      const side = i < 2 ? -1 : 1;
      const isFoot = i % 2 === 1;
      o.position.x = side * (isFoot ? L + 0.025 : L - 0.11);
    });
    arrowRefs.current.forEach((o, i) => {
      if (!o) return;
      const side = i === 0 ? -1 : 1;
      o.position.x = side * (L - 0.32);
      o.scale.setScalar(Math.max(0.0001, arrows.current));
      o.visible = arrows.current > 0.01;
    });
  });

  return (
    <Part id="mount">
      <group position={[0, ROD.y, ROD.z]}>
        <mesh ref={tube} rotation={[0, 0, Math.PI / 2]} material={m.rod}>
          <cylinderGeometry args={[ROD.r, ROD.r, 1, 24]} />
        </mesh>
        {[-1, -1, 1, 1].map((side, i) => {
          const isFoot = i % 2 === 1;
          return (
            <mesh
              key={i}
              ref={(o) => {
                ends.current[i] = o;
              }}
              rotation={[0, 0, Math.PI / 2]}
              material={isFoot ? m.rubber : m.rod}
            >
              {isFoot ? (
                <cylinderGeometry args={[0.072, 0.072, 0.05, 32]} />
              ) : (
                <cylinderGeometry args={[ROD.r + 0.007, ROD.r + 0.007, 0.22, 24]} />
              )}
            </mesh>
          );
        })}
        {/* Druckpfeile in der Montage-Ansicht */}
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
      {[-HOOK_X, HOOK_X].map((x) => (
        <mesh key={x} geometry={strap} material={m.rod} position={[x, 0, 0]} />
      ))}
      <PartTag id="mount" position={[0.55, ROD.y + 0.1, ROD.z]} />
      <Tag position={[-HOOK_X - STRAP.w / 2, ROD.y - 0.2, ROD.z + 0.05]} visible={montage} side="left">
        Halterung
      </Tag>
      <Tag position={[0.15, ROD.y + 0.14, ROD.z]} visible={montage}>
        Spannstange, verstellbar
      </Tag>
      <Tag position={[WALL_INNER - 0.55, ROD.y - 0.2, ROD.z + 0.1]} visible={montage}>
        Endkappe an der Laibung
      </Tag>
    </Part>
  );
}

// ── Pflanzen: Efeutute (Krone + Ranken) und feine Hängepflanze ────────────
function Plants() {
  const { clip } = useScene();
  const leafGeo = useMemo(() => leafGeometry(0.15), []);
  const smallGeo = useMemo(() => smallLeafGeometry(0.026), []);
  const mats = useMemo(() => {
    const leaf = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.5, side: THREE.DoubleSide, clippingPlanes: [clip] });
    const stem = new THREE.MeshStandardMaterial({ color: "#4a6331", roughness: 0.8, clippingPlanes: [clip] });
    return { leaf, stem };
  }, [clip]);

  const data = useMemo(() => {
    const r = rng(7);
    const green = ["#3f7a2c", "#4f8c32", "#5f9c38", "#72ac3e"].map((c) => new THREE.Color(c));
    const varieg = ["#a9c24a", "#bccf58", "#cbd86a"].map((c) => new THREE.Color(c));
    const big: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    const small: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    const stems: THREE.BufferGeometry[] = [];
    const o = new THREE.Object3D();
    const pick = (arr: THREE.Color[]) => arr[Math.floor(r() * arr.length)];

    // Krone über der Erde
    for (let i = 0; i < 150; i++) {
      const x = INSERT.x0 + 0.06 + r() * (INSERT_W - 0.12);
      const z = (r() - 0.5) * 2 * (INSERT.halfD - 0.04);
      const dome = 0.1 * Math.cos(((x - INSERT_CX) / INSERT_W) * Math.PI);
      o.position.set(x, SOIL_TOP + 0.04 + r() * 0.24 + dome, z);
      const yaw = Math.atan2(x - INSERT_CX, z + 0.001) + (r() - 0.5) * 1.6;
      o.rotation.set(0.35 + r() * 0.75, yaw, (r() - 0.5) * 0.6, "YXZ");
      o.scale.setScalar(0.8 + r() * 0.6);
      o.updateMatrix();
      big.push({ m: o.matrix.clone(), c: (r() < 0.35 ? pick(varieg) : pick(green)).clone() });
    }

    const strand = (x0: number, dx: number, len: number, zBase: number) =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(x0, SOIL_TOP + 0.02, zBase - 0.06),
        new THREE.Vector3(x0 + dx * 0.25, H + 0.06, zBase + 0.04),
        new THREE.Vector3(x0 + dx * 0.5, H - 0.12, zBase + 0.1),
        new THREE.Vector3(x0 + dx * 0.8, H - len * 0.55, zBase + 0.08),
        new THREE.Vector3(x0 + dx, H - len, zBase + 0.05 + r() * 0.05),
      ]);

    // Efeututen-Ranken über die Vorderkante
    const pothos: [number, number, number][] = [
      [-1.02, -0.18, 0.95],
      [-0.78, -0.05, 0.7],
      [-0.5, 0.06, 1.1],
      [-0.22, -0.08, 0.55],
      [0.08, 0.04, 0.82],
      [-1.12, -0.22, 0.62],
    ];
    for (const [x0, dx, len] of pothos) {
      const c = strand(x0, dx, len, B);
      stems.push(new THREE.TubeGeometry(c, 48, 0.0048, 5));
      const n = Math.round(len * 13);
      for (let k = 0; k < n; k++) {
        const u = 0.12 + (k / n) * 0.86;
        const p = c.getPoint(u);
        const side = k % 2 ? 1 : -1;
        o.position.set(p.x + side * 0.03, p.y, p.z + 0.02);
        o.rotation.set(-0.35 - r() * 0.3, (r() - 0.5) * 0.9, Math.PI + side * (0.35 + r() * 0.35), "YXZ");
        o.scale.setScalar(0.62 + r() * 0.35 - u * 0.15);
        o.updateMatrix();
        big.push({ m: o.matrix.clone(), c: (r() < 0.4 ? pick(varieg) : pick(green)).clone() });
      }
    }

    // Feine Hängepflanze rechts
    const fine: [number, number, number][] = [
      [0.3, 0.05, 0.8],
      [0.45, -0.04, 1.05],
      [0.58, 0.06, 0.66],
      [0.7, 0.02, 0.92],
      [0.82, -0.05, 0.58],
    ];
    const fineGreen = ["#5d8e34", "#6c9c3a", "#7dab42"].map((c) => new THREE.Color(c));
    for (const [x0, dx, len] of fine) {
      const c = strand(x0, dx, len, B - 0.02);
      stems.push(new THREE.TubeGeometry(c, 40, 0.003, 4));
      for (let k = 0; k < 24; k++) {
        const u = 0.08 + (k / 24) * 0.9;
        const p = c.getPoint(u);
        o.position.set(p.x + (r() - 0.5) * 0.06, p.y + (r() - 0.5) * 0.02, p.z + 0.01 + r() * 0.03);
        o.rotation.set((r() - 0.5) * 0.8, (r() - 0.5) * 0.8, r() * Math.PI);
        o.scale.setScalar(0.7 + r() * 0.5);
        o.updateMatrix();
        small.push({ m: o.matrix.clone(), c: pick(fineGreen).clone() });
      }
      // ein paar Büschel oben
      for (let k = 0; k < 10; k++) {
        o.position.set(x0 + (r() - 0.5) * 0.18, SOIL_TOP + 0.03 + r() * 0.12, (r() - 0.5) * 0.4);
        o.rotation.set(-0.8 - r() * 0.6, r() * Math.PI * 2, 0, "YXZ");
        o.scale.setScalar(0.8 + r() * 0.5);
        o.updateMatrix();
        small.push({ m: o.matrix.clone(), c: pick(fineGreen).clone() });
      }
    }
    const stemGeo = mergeGeometries(stems, false)!;
    stems.forEach((g) => g.dispose());
    return { big, small, stemGeo };
  }, []);

  const bigRef = useRef<THREE.InstancedMesh>(null);
  const smallRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const fill = (mesh: THREE.InstancedMesh | null, list: { m: THREE.Matrix4; c: THREE.Color }[]) => {
      if (!mesh) return;
      list.forEach((d, i) => {
        mesh.setMatrixAt(i, d.m);
        mesh.setColorAt(i, d.c);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    };
    fill(bigRef.current, data.big);
    fill(smallRef.current, data.small);
  }, [data]);

  return (
    <group>
      <instancedMesh ref={bigRef} args={[leafGeo, mats.leaf, data.big.length]} />
      <instancedMesh ref={smallRef} args={[smallGeo, mats.leaf, data.small.length]} />
      <mesh geometry={data.stemGeo} material={mats.stem} />
    </group>
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
    () => new THREE.MeshStandardMaterial({ color: "#4aa8d3", emissive: "#1f86b8", emissiveIntensity: 0.6, roughness: 0.2 }),
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
      <mesh position={[0, -0.12, -0.15]} material={mats.stone}>
        <boxGeometry args={[2 * WALL_INNER + 0.5, 0.06, 1.25]} />
      </mesh>
      {/* Fenster hinter dem Kasten */}
      <mesh position={[0, 0.85, -0.78]} material={mats.glass}>
        <planeGeometry args={[2 * WALL_INNER, 2.1]} />
      </mesh>
      {[
        [0, -0.12 + 0.07, -0.76, 2 * WALL_INNER, 0.08, 0.06],
        [0, 1.25, -0.76, 2 * WALL_INNER, 0.07, 0.06],
        [0, 0.6, -0.76, 0.07, 1.4, 0.06],
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
    const k = 1 - Math.exp(-4.2 * Math.min(dt, 1 / 20));
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
  const m = useMats();
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
  const mats = useMaterials();
  return (
    <MatCtx.Provider value={mats}>
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
    </MatCtx.Provider>
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
    <group ref={g}>
      <ContactShadows
        position={[0, -1.32, 0]}
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
      camera={{ position: p.pos, fov: 30, near: 0.1, far: 60 }}
      gl={{ antialias: true, alpha: true, powerPreference: low ? "default" : "high-performance" }}
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true;
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 1.08;
      }}
      aria-hidden="true"
    >
      <SceneCtx.Provider value={ctx}>
        <hemisphereLight args={["#fffcf6", "#e2ddd2", 0.95]} />
        <directionalLight position={[-3, 5, 4]} intensity={2.2} color="#fff4e4" />
        <directionalLight position={[4, 1.5, -3]} intensity={0.55} color="#e3edf2" />
        <Environment resolution={low ? 128 : 256} frames={1}>
          <Lightformer form="rect" intensity={2.4} position={[0, 4, 1.5]} rotation-x={Math.PI / 2} scale={[8, 3, 1]} />
          <Lightformer form="rect" intensity={1.2} position={[-5, 1, 2]} rotation-y={Math.PI / 2} scale={[4, 3, 1]} />
          <Lightformer form="rect" intensity={0.7} position={[5, 1, -1]} rotation-y={-Math.PI / 2} scale={[4, 3, 1]} />
          <Lightformer form="rect" intensity={0.5} position={[0, 1, 6]} scale={[6, 2, 1]} color="#fff6ea" />
        </Environment>
        <Model />
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
        <Ready onReady={props.onReady} />
      </SceneCtx.Provider>
    </Canvas>
  );
}
