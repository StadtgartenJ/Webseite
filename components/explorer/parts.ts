/** Inhalte und Verhalten der Bauteile im Konzeptmodell. */

export type Mode = "produkt" | "explosion" | "wasser" | "schnitt" | "montage";

export type PartId = "shell" | "insert" | "reservoir" | "wick" | "plate" | "service" | "indicator" | "mount";

export type PartInfo = {
  id: PartId;
  letter: string;
  name: string;
  text: string;
  /** Versatz in der Explosionsansicht (Modelleinheiten) */
  explode: [number, number, number];
  /** Richtung, in die das Teil beim Herausziehen wandert */
  pull: [number, number, number];
  /** kann einzeln herausgezogen werden */
  draggable: boolean;
};

export const PARTS: PartInfo[] = [
  {
    id: "shell",
    letter: "A",
    name: "Außenschale",
    text: "Die sichtbare Kapsel aus mattweißem Kunststoff. Sie trägt alle anderen Teile.",
    explode: [0, -0.78, 0],
    pull: [0, -0.5, 0.35],
    draggable: true,
  },
  {
    id: "insert",
    letter: "B",
    name: "Pflanzeinsatz",
    text: "Herausnehmbare Schale für Erde und Pflanzen. Geplant mit Schlitzen, damit Luft an die Wurzeln kommt.",
    explode: [0, 0.86, 0],
    pull: [0, 0.6, 0.2],
    draggable: true,
  },
  {
    id: "reservoir",
    letter: "C",
    name: "Wasserreservoir",
    text: "Ein geschlossener Tank im unteren Teil. Er hält einen Wasservorrat getrennt von der Erde.",
    explode: [0, 0.12, 0],
    pull: [0, 0, 0.8],
    draggable: true,
  },
  {
    id: "wick",
    letter: "D",
    name: "Kapillarelement",
    text: "Zwei Dochte aus saugfähigem Material ziehen Wasser nach oben, so wie Küchenpapier, das man in ein Glas Wasser hält.",
    explode: [0, 0.3, 0],
    pull: [0, 0.15, 0.75],
    draggable: true,
  },
  {
    id: "plate",
    letter: "E",
    name: "Trennplatte",
    text: "Eine gelochte Platte hält die Erde über dem Reservoir und lässt Feuchtigkeit und Luft durch.",
    explode: [0, 0.56, 0],
    pull: [0, 0.1, 0.75],
    draggable: true,
  },
  {
    id: "service",
    letter: "F",
    name: "Einfüll- und Luftweg",
    text: "Ein schmaler Schacht an der Seite zum Nachfüllen, der auch Luft ins Reservoir lässt. Ein Überlauf soll verhindern, dass sich bei Regen zu viel Wasser staut.",
    explode: [0.38, 0.42, 0],
    pull: [0.6, 0.1, 0],
    draggable: true,
  },
  {
    id: "indicator",
    letter: "G",
    name: "Füllstandsanzeige",
    text: "Ein schmales Sichtfenster vorne zeigt, wie viel Wasser noch im Reservoir ist.",
    explode: [0, -0.78, 0],
    pull: [0, -0.5, 0.35],
    draggable: false,
  },
  {
    id: "mount",
    letter: "H",
    name: "Klemmstange und Haken",
    text: "Eine verstellbare Stange mit Gummifüßen spannt sich zwischen die Seitenwände der Fensterlaibung. Zwei Haken tragen den Kasten.",
    explode: [0, 1.48, 0],
    pull: [0, 0.45, -0.3],
    draggable: true,
  },
];

export const PART_BY_ID = Object.fromEntries(PARTS.map((p) => [p.id, p])) as Record<PartId, PartInfo>;

export const MODES: { id: Mode; label: string; title: string; text: string[] }[] = [
  {
    id: "produkt",
    label: "Produkt",
    title: "Das Objekt",
    text: [
      "So soll er aussehen: eine ruhige Kapsel, vorne nur ein schmales Sichtfenster für den Wasserstand.",
      "Zieh mit der Maus oder dem Finger, um das Modell zu drehen.",
    ],
  },
  {
    id: "explosion",
    label: "Explosion",
    title: "Teil für Teil",
    text: [
      "Zieh einzelne Teile mit der Maus oder dem Finger heraus, oder nutz den Regler.",
      "„Zusammensetzen“ bringt alles zurück an seinen Platz.",
    ],
  },
  {
    id: "wasser",
    label: "Wasserweg",
    title: "Wasser von unten",
    text: [
      "Das Reservoir liegt unter der Erde. Die Dochte saugen Wasser nach oben, und das Substrat nimmt es auf, sobald es trockener ist als der Docht.",
      "So der Plan. Wie gleichmäßig das klappt und wie sich Staunässe und Schimmel vermeiden lassen, hängt von Substrat, Belüftung, Reservoirform und Dochtmaterial ab. Genau das testen wir gerade.",
    ],
  },
  {
    id: "schnitt",
    label: "Schnitt",
    title: "Ein Blick hinein",
    text: [
      "Der Schnitt zeigt die Schichten von oben nach unten: Pflanzen und Erde im Einsatz, darunter die gelochte Trennplatte, ganz unten das Reservoir.",
      "Seitlich liegt der Schacht zum Nachfüllen.",
    ],
  },
  {
    id: "montage",
    label: "Montage",
    title: "Ohne Bohren",
    text: [
      "Die Stange wird zwischen die Seitenwände der Fensterlaibung gespannt. Der Kasten hängt an zwei Haken davor, knapp über der Fensterbank.",
      "Ob eine Laibung passt, hängt von Breite, Material und Zustand ab. Belastung, Wind und Wetter prüfen wir, bevor wir etwas verkaufen.",
    ],
  },
];
