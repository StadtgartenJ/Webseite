// v7: Web-Varianten (AVIF/WebP) der Blender-Renderings aus assets-src/v7/ (Master: JPEG q95, aus blender/v6/renders/v7).
// Ausführen mit: node scripts/optimize-images-v7.mjs [name …]
// Alle Bilder entstehen aus derselben Masterdatei (blender/v6/stadtgarden_v6.blend) – siehe docs/stadtgarden-master-design.md.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const OUT = "public/images";
const SRC = "assets-src/v7";
await mkdir(OUT, { recursive: true });

const jobs = [
  { name: "v7-hero", src: "hero.jpg", widths: [960, 1440, 1920, 2560] },
  { name: "v7-hero-phone", src: "hero_mobil.jpg", widths: [640, 960, 1280, 1600] },
  { name: "v7-studio", src: "studio.jpg", widths: [640, 900, 1200, 1800], crop: { left: 0, top: 280, width: 1800, height: 1200 } },
  { name: "v7-seite", src: "seite.jpg", widths: [640, 900, 1200, 1624] },
  { name: "v7-montage", src: "montage.jpg", widths: [640, 900, 1200, 1600] },
  { name: "v7-anzeige", src: "anzeige.jpg", widths: [640, 900, 1200] },
  { name: "v7-schnitt", src: "schnitt.jpg", widths: [800, 1200, 1600, 1920], crop: { left: 155, top: 70, width: 1920, height: 1200 } },
  { name: "v7-stadt", src: "stadt.jpg", widths: [960, 1600, 2400] },
  { name: "v7-nah", src: "nah.jpg", widths: [800, 1200, 1600, 2000] },
  { name: "v7-explosion", src: "explosion.jpg", widths: [900, 1600], crop16x10: true },
];

const only = process.argv.slice(2);
for (const job of jobs.filter((j) => !only.length || only.includes(j.name))) {
  const meta = await sharp(`${SRC}/${job.src}`).metadata();
  for (const w of job.widths) {
    const base = () => {
      let img = sharp(`${SRC}/${job.src}`);
      if (job.crop) img = img.extract(job.crop);
      if (job.crop16x10) {
        const cw = Math.min(meta.width, Math.round(meta.height * 1.6));
        img = img.extract({ left: Math.round((meta.width - cw) / 2), top: 0, width: cw, height: meta.height });
      }
      return img.resize({ width: w, withoutEnlargement: true });
    };
    await base().avif({ quality: 56, effort: 4 }).toFile(`${OUT}/${job.name}-${w}.avif`);
    await base().webp({ quality: 80 }).toFile(`${OUT}/${job.name}-${w}.webp`);
  }
}

// Link-Vorschau (Open Graph) 1200 × 630 aus dem Hero
if (!only.length || only.includes("og")) {
  const m = await sharp(`${SRC}/hero.jpg`).metadata();
  const h = Math.round(m.width / (1200 / 630));
  await sharp(`${SRC}/hero.jpg`)
    .extract({ left: 0, top: Math.round((m.height - h) / 2), width: m.width, height: h })
    .resize(1200, 630)
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile("public/og.jpg");
}
console.log("Bilder erzeugt in", OUT);
