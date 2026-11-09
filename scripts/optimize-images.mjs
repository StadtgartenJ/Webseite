// Erzeugt optimierte AVIF/WebP-Varianten der Konzeptbilder aus assets-src/.
// Ausführen mit: npm run images
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const OUT = "public/images";
await mkdir(OUT, { recursive: true });

// Ausschnitte aus den beiden Konzeptvisualisierungen. Koordinaten in Quellpixeln.
const jobs = [
  { name: "hero-window", src: "assets-src/hero-window.png", widths: [480, 720, 960, 1122] },
  { name: "daylight", src: "assets-src/concept-sheet.png", crop: { left: 1088, top: 0, width: 584, height: 336 }, widths: [584] },
  { name: "detail-rod", src: "assets-src/concept-sheet.png", crop: { left: 1088, top: 540, width: 324, height: 162 }, widths: [324] },
  { name: "detail-membrane", src: "assets-src/concept-sheet.png", crop: { left: 1090, top: 354, width: 320, height: 160 }, widths: [320] },
  { name: "detail-shell", src: "assets-src/hero-window.png", crop: { left: 262, top: 762, width: 600, height: 300 }, widths: [600] },
  { name: "window-light", src: "assets-src/hero-window.png", crop: { left: 0, top: 0, width: 1122, height: 640 }, widths: [640, 960, 1122] },
  { name: "trailing", src: "assets-src/hero-window.png", crop: { left: 150, top: 660, width: 430, height: 520 }, widths: [430] },
];

for (const job of jobs) {
  for (const w of job.widths) {
    const base = () => {
      let img = sharp(job.src);
      if (job.crop) img = img.extract(job.crop);
      return img.resize({ width: w, withoutEnlargement: true });
    };
    await base().avif({ quality: 55, effort: 6 }).toFile(`${OUT}/${job.name}-${w}.avif`);
    await base().webp({ quality: 80 }).toFile(`${OUT}/${job.name}-${w}.webp`);
  }
}

// Open-Graph-Vorschau (1200x630) und Fallback-JPEG fürs Teilen
await sharp("assets-src/hero-window.png")
  .extract({ left: 0, top: 540, width: 1122, height: 589 })
  .resize(1200, 630)
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile("public/og.jpg");

console.log("Bilder erzeugt in", OUT);
