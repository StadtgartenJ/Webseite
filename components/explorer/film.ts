/**
 * Scroll-Film des Konzeptmodells: EIN Zustandsobjekt, das die GSAP-Timeline beschreibt
 * und die Szene liest. GSAP schreibt nur in dieses Objekt, die Szene schreibt die
 * Three.js-Transformationen – so greifen nie zwei Systeme gleichzeitig auf ein Bauteil zu.
 *
 * Zeitachse 0…10 (= 0…100 % Scrollfortschritt):
 *   0–1.2   Produkt, Kamera fährt näher
 *   1.2–3   Klemmsystem und Pflanzeinsatz heben ab
 *   3–4.7   Trennplatte, Kapillarelemente, Reservoir und Außenschale trennen sich
 *   4.7–6   Explosionsansicht steht, alle Beschriftungen
 *   6–7.6   Einsatz sitzt auf, Schnitt öffnet sich, Wasserweg
 *   7.6–9   alles setzt sich wieder zusammen
 *   9–10    Kamera zurück in die Produktansicht (= Ausgangsbild der Tabs)
 */
import type { PartId } from "./parts";

export const FILM_LENGTH = 10;

export type FilmCam = {
  /** Azimut in Grad (0 = frontal, positiv = von rechts) */
  az: number;
  /** Höhe in Grad */
  el: number;
  dist: number;
  tx: number;
  ty: number;
  /**
   * 0 = freie Kamera (dist gilt), 1 = Bildaufbau mit Beschriftungen: Abstand und Bildausschnitt
   * werden so berechnet, dass ein Bereich der Größe ew × eh (Modelleinheiten) neben der
   * Beschriftungsspalte und dem Kapiteltext Platz findet – auf jedem Bildschirm.
   */
  frame: number;
  ew: number;
  eh: number;
};

export type FilmTagId = "mount" | "insert" | "plate" | "wick" | "reservoir" | "shell" | "w1" | "w2" | "w3";

export type FilmState = {
  off: Record<PartId, number>;
  cam: FilmCam;
  /** 1 = geschlossen, 0 = vordere Hälfte weggeschnitten */
  clip: number;
  flow: number;
  flowT: number;
  wet: number;
  tags: Record<FilmTagId, number>;
};

/** Produktansicht – identisch mit der Kamera des Tabs „Produkt“. */
export const HERO_CAM: FilmCam = { az: 27.03, el: 10.81, dist: 5.6, tx: 0, ty: 0, frame: 0, ew: 3.15, eh: 1.6 };

export function createFilmState(): FilmState {
  return {
    off: { shell: 0, insert: 0, reservoir: 0, wick: 0, plate: 0, service: 0, indicator: 0, mount: 0 },
    cam: { ...HERO_CAM },
    clip: 1,
    flow: 0,
    flowT: 0,
    wet: 0,
    tags: { mount: 0, insert: 0, plate: 0, wick: 0, reservoir: 0, shell: 0, w1: 0, w2: 0, w3: 0 },
  };
}

export function resetFilmState(f: FilmState) {
  const r = createFilmState();
  Object.assign(f.off, r.off);
  Object.assign(f.cam, r.cam);
  Object.assign(f.tags, r.tags);
  f.clip = r.clip;
  f.flow = r.flow;
  f.flowT = r.flowT;
  f.wet = r.wet;
}

/** [Zeit, Wert, Ease für das Segment, das an diesem Punkt endet] */
export type Key = [number, number, string?];

const MOVE = "power3.inOut";
/** Teile, die im Wasserweg nicht gebraucht werden, fahren aus dem Bild und werden dort ausgeblendet */
export const PARK_LOW = -4.6;
export const PARK_HIGH = 3.9;
export const PARKED = 3.5;
const CAM = "sine.inOut";

/** Explosionszustand (auch für den Regler im Tab „Innenleben“). */
export const EXPLODED: Record<PartId, number> = {
  mount: 1.35,
  insert: 0.8,
  plate: 0.26,
  wick: 0.08,
  reservoir: -0.14,
  service: -0.14,
  shell: -1.05,
  indicator: -1.05,
};

/** Bauteil-Versatz (y, Modelleinheiten). Reihenfolge so gewählt, dass nichts durcheinander fährt. */
export const PART_KEYS: Record<PartId, Key[]> = {
  // im Wasserweg weiter nach oben aus dem Bild, damit der Schnitt frei bleibt
  mount: [
    [1.2, 0],
    [2.9, EXPLODED.mount, MOVE],
    [6.0, EXPLODED.mount],
    [6.7, PARK_HIGH, MOVE],
    [7.9, PARK_HIGH],
    [9.0, 0, MOVE],
  ],
  insert: [
    [1.4, 0],
    [3.0, EXPLODED.insert, MOVE],
    [6.0, EXPLODED.insert],
    [6.6, 0.24, MOVE],
    [7.9, 0.24],
    [8.7, 0, MOVE],
  ],
  plate: [
    [3.0, 0],
    [3.7, EXPLODED.plate, MOVE],
    [7.8, EXPLODED.plate],
    [8.5, 0, MOVE],
  ],
  wick: [
    [3.2, 0],
    [3.9, EXPLODED.wick, MOVE],
    [7.8, EXPLODED.wick],
    [8.5, 0, MOVE],
  ],
  reservoir: [
    [3.7, 0],
    [4.3, EXPLODED.reservoir, MOVE],
    [6.0, EXPLODED.reservoir],
    [6.6, -0.02, MOVE],
    [7.7, -0.02],
    [8.4, 0, MOVE],
  ],
  service: [
    [3.7, 0],
    [4.3, EXPLODED.service, MOVE],
    [6.0, EXPLODED.service],
    [6.6, -0.02, MOVE],
    [7.7, -0.02],
    [8.4, 0, MOVE],
  ],
  // im Wasserweg taucht die Schale nach unten aus dem Bild und kommt danach von unten zurück
  shell: [
    [3.4, 0],
    [4.5, EXPLODED.shell, MOVE],
    [6.0, EXPLODED.shell],
    [6.7, PARK_LOW, MOVE],
    [7.5, PARK_LOW],
    [8.6, 0, MOVE],
  ],
  indicator: [
    [3.4, 0],
    [4.5, EXPLODED.indicator, MOVE],
    [6.0, EXPLODED.indicator],
    [6.7, PARK_LOW, MOVE],
    [7.5, PARK_LOW],
    [8.6, 0, MOVE],
  ],
};

export const CAM_KEYS: Record<keyof FilmCam, Key[]> = {
  az: [
    [0, HERO_CAM.az],
    [1.2, 19, CAM],
    [3.0, 13, CAM],
    [5.9, 4, CAM],
    [7.3, -14, CAM],
    [9.0, 16, CAM],
    [10, HERO_CAM.az, CAM],
  ],
  el: [
    [0, HERO_CAM.el],
    [1.2, 8.5, CAM],
    [3.0, 15, CAM],
    [5.9, 15.5, CAM],
    [7.3, 5.5, CAM],
    [9.0, 9, CAM],
    [10, HERO_CAM.el, CAM],
  ],
  dist: [
    [0, HERO_CAM.dist],
    [1.2, 4.9, CAM],
    [3.0, 7.4, CAM],
    [5.9, 8.7, CAM],
    [7.3, 4.8, CAM],
    [9.0, 5.4, CAM],
    [10, HERO_CAM.dist, CAM],
  ],
  tx: [[0, 0]],
  // Blickpunkt = Mitte dessen, was gerade im Bild sein soll
  ty: [
    [1.2, 0],
    [3.0, 0.72, CAM],
    [3.4, 0.72],
    [4.5, 0.22, CAM],
    [5.9, 0.22],
    [6.7, 0.27, CAM],
    [7.6, 0.27],
    [9.0, 0, CAM],
  ],
  frame: [
    [1.2, 0],
    [3.0, 1, CAM],
    [7.6, 1],
    [9.0, 0, CAM],
  ],
  ew: [
    [0, 3.15],
    [5.9, 3.15],
    [6.7, 2.5, CAM],
    [7.6, 2.5],
    [8.6, 3.15, CAM],
  ],
  eh: [
    [1.2, 1.6],
    [3.0, 2.5, CAM],
    [3.4, 2.5],
    [4.5, 3.4, CAM],
    [5.9, 3.4],
    [6.7, 1.9, CAM],
    [7.6, 1.9],
    [8.6, 2.0, CAM],
  ],
};

export const CLIP_KEYS: Key[] = [
  [6.0, 1],
  [6.6, 0, "power2.inOut"],
  [7.6, 0],
  [8.1, 1, "power2.inOut"],
];
export const FLOW_KEYS: Key[] = [
  [6.3, 0],
  [6.6, 1, "power1.out"],
  [7.3, 1],
  [7.6, 0, "power1.in"],
];
export const FLOW_T_KEYS: Key[] = [
  [6.3, 0],
  [7.6, 2.2, "none"],
];
export const WET_KEYS: Key[] = [
  [6.3, 0],
  [7.0, 1, "power1.inOut"],
  [7.6, 1],
  [8.3, 0, "power1.inOut"],
];

/** Beschriftungen: ein, aus (jeweils Beginn, 0,3 lang). Alle sechs stehen ab 4,75 gemeinsam bis 5,9. */
export const TAG_TIMES: Record<FilmTagId, [number, number]> = {
  mount: [2.7, 5.9],
  insert: [2.9, 5.9],
  plate: [3.6, 5.9],
  wick: [3.85, 5.9],
  reservoir: [4.15, 5.9],
  shell: [4.45, 5.9],
  w1: [6.55, 7.3],
  w2: [6.75, 7.3],
  w3: [6.95, 7.3],
};

export const TAG_TEXT: Record<FilmTagId, { name: string; spec?: string; short?: string; step?: string }> = {
  mount: { name: "Klemmsystem", spec: "Spannstange und zwei breite Halterungen" },
  insert: { name: "Pflanzeinsatz", spec: "herausnehmbar, für Substrat und Wurzeln" },
  plate: { name: "Trennplatte", spec: "gelocht, zwischen Erde und Wasser" },
  wick: { name: "Kapillarelemente", spec: "sollen Wasser nach oben leiten" },
  reservoir: { name: "Wasserreservoir", spec: "Speicher für die geplante Versorgung" },
  shell: { name: "Außenschale", spec: "mit Sichtfenster für den Wasserstand" },
  w1: { step: "1", name: "Wasser im Reservoir" },
  w2: { step: "2", name: "Kapillarelemente sollen es nach oben leiten", short: "über die Kapillarelemente nach oben" },
  w3: { step: "3", name: "Das Substrat nimmt es auf", short: "ins Substrat" },
};

export const TAG_ORDER: FilmTagId[] = ["mount", "insert", "plate", "wick", "reservoir", "shell", "w1", "w2", "w3"];

/** Kapitel unter dem Modell: [ein, aus] in Timeline-Zeit */
export const CHAPTERS: { id: string; from: number; to: number; title?: string; text: string }[] = [
  { id: "cue", from: -1, to: 0.8, text: "Scroll weiter, um hineinzusehen." },
  {
    id: "einsatz",
    from: 1.3,
    to: 3.2,
    title: "Der Pflanzeinsatz",
    text: "Pflanzen und Erde sitzen in einem herausnehmbaren Einsatz. Darüber hängt das Klemmsystem.",
  },
  {
    id: "innen",
    from: 3.2,
    to: 6.0,
    title: "Was darunter liegt",
    text: "Eine gelochte Trennplatte, zwei Kapillarelemente und das Reservoir. Die Außenschale umschließt alles.",
  },
  {
    id: "wasser",
    from: 6.0,
    to: 7.6,
    title: "Der geplante Wasserweg",
    text: "Kapillarelemente sollen Wasser aus dem Reservoir nach oben ins Substrat leiten. Genau das testen wir gerade.",
  },
  {
    id: "form",
    from: 8.5,
    to: 11,
    title: "Wieder eine ruhige Form",
    text: "Zusammengesetzt bleibt außen nur das schmale Sichtfenster für den Wasserstand.",
  },
];
