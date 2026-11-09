/** Inhalte und Verhalten der Bauteile im Konzeptmodell. */

export type Mode = "produkt" | "explosion" | "wasser" | "schnitt" | "montage";

export type PartId = "shell" | "insert" | "reservoir" | "wick" | "plate" | "service" | "indicator" | "mount";

export type PartInfo = {
  id: PartId;
  letter: string;
  name: string;
  text: string;
  /** Versatz in der Explosionsansicht (Modelleinheiten) – gleiche Werte wie EXPLODED im Scroll-Film */
  explode: [number, number, number];
  /** Richtung, in die das Teil beim Herausziehen wandert */
  pull: [number, number, number];
  /** kann einzeln herausgezogen werden */
  draggable: boolean;
  /** erscheint in der Bauteil-Liste und als Beschriftung */
  listed: boolean;
};

export const PARTS: PartInfo[] = [
  {
    id: "shell",
    letter: "A",
    name: "Außenschale",
    text: "Eine klare, weich gerundete Form, die sich harmonisch in moderne Architektur einfügen soll.",
    explode: [0, -1.05, 0],
    pull: [0, -0.5, 0.35],
    draggable: true,
    listed: true,
  },
  {
    id: "insert",
    letter: "B",
    name: "Pflanzeinsatz",
    text: "Ein herausnehmbarer Einsatz mit Platz für Substrat und Wurzeln.",
    explode: [0, 0.8, 0],
    pull: [0, 0.6, 0.2],
    draggable: true,
    listed: true,
  },
  {
    id: "reservoir",
    letter: "C",
    name: "Wasserreservoir",
    text: "Ein integrierter Speicher für die geplante passive Wasserversorgung.",
    explode: [0, -0.14, 0],
    pull: [0, 0, 0.8],
    draggable: true,
    listed: true,
  },
  {
    id: "wick",
    letter: "D",
    name: "Kapillarelemente",
    text: "Sie sollen Feuchtigkeit aus dem Reservoir in Richtung Pflanzsubstrat transportieren.",
    explode: [0, 0.08, 0],
    pull: [0, 0.15, 0.75],
    draggable: true,
    listed: true,
  },
  {
    id: "indicator",
    letter: "E",
    name: "Füllstandsanzeige",
    text: "Ein dezentes Sichtfenster zeigt den Wasserstand im Reservoir.",
    explode: [0, -1.05, 0],
    pull: [0, -0.5, 0.35],
    draggable: false,
    listed: true,
  },
  {
    id: "mount",
    letter: "F",
    name: "Klemmsystem",
    text: "Eine horizontale Spannstange und zwei Halterungen bilden das geplante Befestigungssystem.",
    explode: [0, 1.35, 0],
    pull: [0, 0.45, -0.3],
    draggable: true,
    listed: true,
  },
  {
    id: "plate",
    letter: "",
    name: "Trennplatte",
    text: "",
    explode: [0, 0.26, 0],
    pull: [0, 0.1, 0.75],
    draggable: false,
    listed: false,
  },
  {
    id: "service",
    letter: "",
    name: "Einfüllschacht",
    text: "",
    explode: [0, -0.14, 0],
    pull: [0.6, 0.1, 0],
    draggable: false,
    listed: false,
  },
];

export const PART_BY_ID = Object.fromEntries(PARTS.map((p) => [p.id, p])) as Record<PartId, PartInfo>;

/** Ansichten des Modells – bewusst nur vier, in der Reihenfolge der Neugier. */
export const MODES: { id: Mode; label: string; title: string; text: string[] }[] = [
  {
    id: "produkt",
    label: "Produkt",
    title: "Die fertige Form",
    text: [
      "Eine weich gerundete Kapsel in Warmweiß. Vorne nur ein schmales Sichtfenster für den Wasserstand.",
      "Dreh das Modell und sieh es dir von allen Seiten an.",
    ],
  },
  {
    id: "explosion",
    label: "Innenleben",
    title: "Das Innenleben",
    text: [
      "Zieh einzelne Teile heraus oder nutze den Regler. So siehst du, wie Einsatz, Reservoir und Kapillarelemente zusammenspielen.",
    ],
  },
  {
    id: "wasser",
    label: "Wasserweg",
    title: "Der Weg des Wassers",
    text: [
      "Unten liegt das Reservoir. Kapillarelemente sollen das Wasser nach oben ins Substrat leiten, sobald die Erde trockener wird.",
      "Wie gut das im Alltag funktioniert, hängt auch von Erde, Pflanzen und Standort ab. Genau das testen wir gerade.",
    ],
  },
  {
    id: "montage",
    label: "Montage",
    title: "Einspannen statt bohren",
    text: [
      "Eine Spannstange klemmt zwischen den Seiten der Fensterlaibung, zwei Halterungen tragen den Kasten.",
      "Ob dein Fenster geeignet ist, hängt von Breite, Material und Zustand der Laibung ab.",
    ],
  },
];
