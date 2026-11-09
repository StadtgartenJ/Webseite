// Erzeugt optimierte AVIF/WebP-Varianten der Produktbilder aus assets-src/v2/.
// Ausführen mit: npm run images
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const OUT = "public/images";
const SRC = "assets-src/v2";
await mkdir(OUT, { recursive: true });

// Alle Bilder sind KI-Konzeptvisualisierungen (siehe docs/bilder.md).
const jobs = [
  { name: "hero-wide", src: "hero-wide.png", widths: [960, 1440, 1672] },
  { name: "hero-mobile", src: "hero-wide.png", crop: { left: 690, top: 0, width: 910, height: 941 }, widths: [600, 910] },
  // v4: Handy-Hero aus der Nahaufnahme – ganzes Produkt sichtbar, nichts unter dem Text
  { name: "hero-phone", src: "montage-nah.png", crop: { left: 250, top: 0, width: 1260, height: 941 }, widths: [640, 960, 1260] },
  { name: "studio-float", src: "studio-float.png", widths: [640, 900, 1122] },
  { name: "window-plants", src: "window-plants.png", widths: [640, 900, 1122] },
  { name: "mount-detail", src: "mount-detail.png", widths: [640, 900, 1122] },
  { name: "macro-gauge", src: "macro-gauge.png", widths: [640, 900, 1122] },
  { name: "cutaway", src: "cutaway.png", widths: [640, 900, 1122] },
  { name: "exploded", src: "exploded.png", widths: [640, 1122] },
  { name: "facade", src: "facade.png", widths: [960, 1536] },
  // Technik-Abschnitt (v4): vier Stationen, gleiches Produkt, gleiche Halterung
  { name: "produkt-gruen", src: "produkt-gruen.png", widths: [800, 1200, 1536] },
  { name: "explosion-gruen", src: "explosion-gruen-breit.png", widths: [800, 1200, 1640] },
  { name: "explosion-hoch", src: "explosion-gruen.png", widths: [640, 1199] },
  { name: "schnitt-breit", src: "schnitt-breit.png", widths: [800, 1200, 1672] },
  { name: "montage-nah", src: "montage-nah.png", widths: [800, 1200, 1672] },
  { name: "montage-detail", src: "montage-nah.png", crop: { left: 860, top: 40, width: 812, height: 650 }, widths: [640, 812] },
];

// Optional: nur bestimmte Bilder neu erzeugen, z. B. `node scripts/optimize-images.mjs hero-phone`
const only = process.argv.slice(2);
for (const job of jobs.filter((j) => !only.length || only.includes(j.name))) {
  for (const w of job.widths) {
    const base = () => {
      let img = sharp(`${SRC}/${job.src}`);
      if (job.crop) img = img.extract(job.crop);
      return img.resize({ width: w, withoutEnlargement: true });
    };
    await base().avif({ quality: 58, effort: 6 }).toFile(`${OUT}/${job.name}-${w}.avif`);
    await base().webp({ quality: 82 }).toFile(`${OUT}/${job.name}-${w}.webp`);
  }
}

// Link-Vorschau (Open Graph) 1200 x 630
if (!only.length) await sharp(`${SRC}/hero-wide.png`)
  .extract({ left: 0, top: 30, width: 1672, height: 878 })
  .resize(1200, 630)
  .jpeg({ quality: 84, mozjpeg: true })
  .toFile("public/og.jpg");

console.log("Bilder erzeugt in", OUT);
