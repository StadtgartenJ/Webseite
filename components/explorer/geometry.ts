/**
 * Prozedurale Geometrie für das KONZEPTMODELL des Pflanzkastens.
 * Keine Produktions-CAD: Maße und Proportionen sind aus den Konzeptbildern abgeleitet.
 * Einheiten: 1 ≈ 33 cm (Kasten ca. 80 cm lang). Alle Werte sind Annahmen.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// ── Grundmaße der Außenschale ─────────────────────────────────────────────
export const DIM = {
  A: 1.2, // halbe Länge
  B: 0.36, // halbe Tiefe
  H: 0.82, // Höhe
  Rx: 0.4, // Rundung unten (Längsrichtung)
  Rz: 0.3, // Rundung unten (Tiefe)
  rc: 0.28, // Eckradius im Grundriss
  t: 0.028, // Wandstärke
};

/** Gesamtversatz, damit das Modell um den Ursprung schwebt */
export const MODEL_Y = -0.42;

export type LoftSpec = {
  A: number;
  B: number;
  H: number;
  Rx: number;
  Rz: number;
  rc: number;
};

const NC = 10; // Punkte je Viertelbogen
const NX = 18; // Punkte je Längskante
const NZ = 4; // Punkte je Tiefenkante

/** Punkte eines Rechtecks mit gerundeten Ecken (Grundriss, xz) – immer gleiche Punktzahl. */
function roundedRing(a: number, b: number, r: number, y: number, out: number[]) {
  r = Math.max(0.0005, Math.min(r, a - 1e-4, b - 1e-4));
  const ax = Math.max(0, a - r);
  const bz = Math.max(0, b - r);
  const line = (x0: number, z0: number, x1: number, z1: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const s = i / n;
      out.push(x0 + (x1 - x0) * s, y, z0 + (z1 - z0) * s);
    }
  };
  const arc = (cx: number, cz: number, p0: number) => {
    for (let i = 0; i < NC; i++) {
      const p = p0 + (i / NC) * (Math.PI / 2);
      out.push(cx + r * Math.cos(p), y, cz + r * Math.sin(p));
    }
  };
  line(a, -bz, a, bz, NZ);
  arc(ax, bz, 0);
  line(ax, b, -ax, b, NX);
  arc(-ax, bz, Math.PI / 2);
  line(-a, bz, -a, -bz, NZ);
  arc(-ax, -bz, Math.PI);
  line(-ax, -b, ax, -b, NX);
  arc(ax, -bz, (3 * Math.PI) / 2);
}

const RING = 2 * NZ + 2 * NX + 4 * NC;

/** Halbmaße des Querschnitts in Höhe y (Boden mit elliptischer Rundung). */
function sectionAt(spec: LoftSpec, y: number) {
  const inset = (R: number) => (y >= R ? 0 : R - Math.sqrt(Math.max(0, R * R - (R - y) * (R - y))));
  const a = spec.A - inset(spec.Rx);
  const b = spec.B - inset(spec.Rz);
  return { a, b, r: Math.min(spec.rc, a, b) };
}

/** Höhenstufen: dicht im gerundeten Bodenbereich, locker darüber. */
function levels(spec: LoftSpec, nBottom = 14, nTop = 5) {
  const R = Math.max(spec.Rx, spec.Rz);
  const ys: number[] = [];
  for (let i = 0; i <= nBottom; i++) {
    const th = (i / nBottom) * (Math.PI / 2);
    ys.push(Math.min(spec.H, R * (1 - Math.cos(th))));
  }
  for (let i = 1; i <= nTop; i++) ys.push(R + ((spec.H - R) * i) / nTop);
  return ys.filter((y, i, arr) => i === 0 || y > arr[i - 1] + 1e-5);
}

/** Mantelfläche + Bodenkappe als Index-Geometrie. outward=false dreht die Flächen nach innen. */
function loftSurface(spec: LoftSpec, outward: boolean, yOffset = 0, capBottom = true, capTop = false) {
  const ys = levels(spec);
  const pos: number[] = [];
  for (const y of ys) {
    const s = sectionAt(spec, y);
    roundedRing(s.a, s.b, s.r, y + yOffset, pos);
  }
  const idx: number[] = [];
  const rows = ys.length;
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < RING; i++) {
      const i2 = (i + 1) % RING;
      const p = j * RING + i;
      const q = j * RING + i2;
      const p1 = (j + 1) * RING + i;
      const q1 = (j + 1) * RING + i2;
      if (outward) idx.push(p, p1, q, q, p1, q1);
      else idx.push(p, q, p1, q, q1, p1);
    }
  }
  const addCap = (row: number, up: boolean) => {
    const c = pos.length / 3;
    pos.push(0, ys[row] + yOffset, 0);
    for (let i = 0; i < RING; i++) {
      const p = row * RING + i;
      const q = row * RING + ((i + 1) % RING);
      if (up) idx.push(c, q, p);
      else idx.push(c, p, q);
    }
  };
  if (capBottom) addCap(0, !outward);
  if (capTop) addCap(rows - 1, outward);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Oben offenes Gefäß mit Wandstärke (Außenfläche, Innenfläche, Rand). */
export function openVessel(spec: LoftSpec, t: number) {
  const outer = loftSurface(spec, true);
  const innerSpec: LoftSpec = {
    A: spec.A - t,
    B: spec.B - t,
    H: spec.H - t,
    Rx: Math.max(0.01, spec.Rx - t),
    Rz: Math.max(0.01, spec.Rz - t),
    rc: Math.max(0.01, spec.rc - t),
  };
  const inner = loftSurface(innerSpec, false, t);

  // Rand: flacher Ring zwischen Außen- und Innenkante, eigene Normalen nach oben
  const so = sectionAt(spec, spec.H);
  const si = sectionAt(innerSpec, innerSpec.H);
  const o: number[] = [];
  const iRing: number[] = [];
  roundedRing(so.a, so.b, so.r, spec.H, o);
  roundedRing(si.a, si.b, si.r, spec.H, iRing);
  const pos = [...o, ...iRing];
  const idx: number[] = [];
  for (let i = 0; i < RING; i++) {
    const i2 = (i + 1) % RING;
    idx.push(i, RING + i, i2, i2, RING + i, RING + i2);
  }
  const rim = new THREE.BufferGeometry();
  rim.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  rim.setIndex(idx);
  rim.computeVertexNormals();
  const norms = rim.getAttribute("normal") as THREE.BufferAttribute;
  for (let i = 0; i < norms.count; i++) norms.setXYZ(i, 0, 1, 0);

  const merged = mergeGeometries([outer, inner, rim], false)!;
  outer.dispose();
  inner.dispose();
  rim.dispose();
  return merged;
}

/** Geschlossener Körper (z. B. Reservoir, Wasser). */
export function closedBody(spec: LoftSpec) {
  return loftSurface(spec, true, 0, true, true);
}

/** Grundriss-Form: Rechteck mit gerundeten Ecken (für Platten und Erde). */
export function roundedRectShape(w: number, d: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -d / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r);
  s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d);
  s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Waagerechte Platte (liegt in xz, Oberseite nach +y). */
export function flatPlate(w: number, d: number, r: number) {
  const g = new THREE.ShapeGeometry(roundedRectShape(w, d, r), 6);
  g.rotateX(-Math.PI / 2);
  return g;
}

/** Erdkörper: gerundeter Block mit Höhe h, Unterseite bei y=0. */
export function soilBlock(w: number, d: number, r: number, h: number) {
  const g = new THREE.ExtrudeGeometry(roundedRectShape(w, d, r), { depth: h, bevelEnabled: false, curveSegments: 6 });
  g.rotateX(-Math.PI / 2);
  return g;
}

/**
 * Breites, flaches Band (Halterung) entlang einer Mittellinie in der yz-Ebene.
 * path: Punkte [z, y]; die Breite liegt entlang x, mittig um x = 0. Kanten leicht gerundet.
 */
export function strapGeometry(path: [number, number][], width: number, thickness: number) {
  const n = path.length;
  const outer: THREE.Vector2[] = [];
  const inner: THREE.Vector2[] = [];
  for (let i = 0; i < n; i++) {
    const [z, y] = path[i];
    const [zp, yp] = path[Math.max(0, i - 1)];
    const [zn, yn] = path[Math.min(n - 1, i + 1)];
    let tz = zn - zp;
    let ty = yn - yp;
    const l = Math.hypot(tz, ty) || 1;
    tz /= l;
    ty /= l;
    const nz = -ty;
    const ny = tz;
    const h = thickness / 2;
    // Formkoordinate x = -z, damit nach der Drehung um y wieder +z vorne ist
    outer.push(new THREE.Vector2(-(z + nz * h), y + ny * h));
    inner.push(new THREE.Vector2(-(z - nz * h), y - ny * h));
  }
  const shape = new THREE.Shape([...outer, ...inner.reverse()]);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.0035,
    bevelSegments: 3,
    curveSegments: 4,
  });
  g.rotateY(Math.PI / 2);
  g.translate(-width / 2, 0, 0);
  g.computeVertexNormals();
  return g;
}

/** Herzförmiges Efeututen-Blatt, leicht entlang der Mittelrippe gefaltet. Spitze bei +y. */
export function leafGeometry(size = 0.12) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.55, -0.12, 0.62, 0.45, 0, 1);
  s.bezierCurveTo(-0.62, 0.45, -0.55, -0.12, 0, 0);
  const g = new THREE.ShapeGeometry(s, 10);
  const p = g.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    p.setXYZ(i, x * size, y * size, (-x * x * 0.9 + y * y * 0.12) * size);
  }
  g.computeVertexNormals();
  return g;
}

/** Kleines rundes Blatt für die feinen Hängepflanzen. */
export function smallLeafGeometry(size = 0.03) {
  const g = new THREE.CircleGeometry(size, 10);
  const p = g.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setZ(i, -(p.getX(i) ** 2) * 6);
  g.computeVertexNormals();
  return g;
}

/** Deterministischer Zufall, damit das Modell bei jedem Laden gleich aussieht. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Lochmuster als Alpha-Textur (für die Trennplatte). */
export function holeTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(32, 32, 13, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 9);
  tex.anisotropy = 4;
  return tex;
}

/** Feine Webstruktur für die Dochte. */
export function weaveTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#f3f1ea";
  ctx.fillRect(0, 0, 32, 32);
  ctx.fillStyle = "#dedbd1";
  for (let i = 0; i < 32; i += 4) {
    ctx.fillRect(i, 0, 1.5, 32);
    ctx.fillRect(0, i + 2, 32, 1.2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 8);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
