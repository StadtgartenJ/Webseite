# 3D- und Bildbericht v7: Konsistenz

Stand: 10. 11. 2026 · Branch `v7-konsistenz` (aufbauend auf `v6-teardown`) · Spezifikation: `docs/stadtgarden-master-design.md`

## Ergebnis in Kürze

Alle Produktbilder der Website und der 3D-Viewer kommen jetzt aus **einem** Blender-Modell (`blender/v6/`). Es gibt keine KI-Bilder mehr auf der Seite und damit keine abweichenden Varianten: kein schwebender Kasten, keine J-Haken, kein seitlich versetztes oder leuchtend blaues Sichtfenster.

| Lieferung | Datei | Stand |
| --- | --- | --- |
| Blender-Master (eigenständig) | `blender/v7/stadtgarden_v7.blend` (≈15 MB, Texturen eingebettet, fünf Szenen, keine Skripte nötig) | fertig |
| Bauskripte | `blender/v6/sg_model.py`, `sg_plants.py`, `sg_leaftex.py`, `sg_scene.py`, `sg_shots.py`, `sg_master7.py` | fertig |
| Bildmaster (Cycles, PNG) | `blender/v6/renders/v7/*.png` (lokal, per `.gitignore` ausgeschlossen) | fertig |
| Bildmaster (JPEG q95) | `assets-src/v7/*.jpg` | fertig |
| Web-Bilder | `public/images/v7-*.avif/.webp` (`npm run images`) | fertig |
| Interaktives GLB | `public/models/stadtgarden-v7.glb` (1,4 MB, Meshopt + WebP, gleiche Bepflanzung) | fertig |
| Qualitätstor | `docs/qualitaetstor/1…8-*.jpg` | fertig |

## Modelländerungen (gegenüber v6)

- **Sichtfenster** genau mittig (x = 0), schmal und senkrecht, als durchgehender Schlitz mit Fenster, Flüssigkeit und Rückwand. Teil der Schale, bewegt sich in der Explosion mit ihr. Farbe gedämpftes Aqua (#6FAFAA), kein Leuchten, kein Sensor.
- **Montage:** Der Kasten steht mit dem Boden auf dem äußeren Fenstersims. Eine weiße Spannstange liegt hinter dem oberen Kastenrand in der Laibung, zwei breite Bügel laufen über die Stange zur Kastenrückseite. Keine zweite Stange, keine J-Haken, keine Seile.
- Wasser im Reservoir gedämpft (#B7DCD7). Schalenkanten etwas feiner gefast.
- Keine neuen Funktionsteile. Sechs Teile: Schale, Pflanzeinsatz, Trennplatte, zwei Dochte, Reservoir, Halterung.
- **Bepflanzung neu (v7.1):** Goldene Efeutute links und in der Mitte, Gold-Pfennigkraut rechts – wie im Produkt-Steckbrief. Blattumrisse als Geometrie, Blatttexturen prozedural erzeugt (`sg_leaftex.py`, Atlas in `blender/v6/tex_v7/`). Die Poly-Haven-Scans (Anthurium, Periwinkle) werden nicht mehr verwendet.
- **Substrat und Wurzeln:** Erde mit Rindenstücken und Perlitkörnern (auch auf der Schnittfläche), dazu ein Wurzelgeflecht auf der Schnittebene; einige Wurzeln wachsen zu den Dochten. Im geschlossenen Kasten liegen die Wurzeln unsichtbar im Substrat; im Web-Modell entfallen sie.

## Szenen und Einstellungen (`sg_scene.py`, `sg_shots.py`)

Fassade aus Putz mit Faschen und Gesims, Holzfenster mit Glas, Innenraum mit Vorhang, Sims aus Stein. Warmes Sonnenlicht (Elevation 22°, Farbe 1,0/0,87/0,73), Blattschatten durch Schatten-Kopien der Pflanzen (Gobo), warme Umgebung #D9D2C6. Die Sonne wird per Light Linking vom Fensterglas ausgeschlossen (sonst grelle Spiegelung).

| Bild | Szene | Auflösung | Kamera | Einsatz |
| --- | --- | --- | --- | --- |
| hero | Fenster | 2560 × 1440 | 34 mm, leicht von unten | Hero Desktop, Link-Vorschau |
| hero_mobil | Fenster | 1600 × 1200 | 40 mm | Hero Handy |
| studio | Studio #E3E9D7 | 1800 × 1800 (Web 1800 × 1200) | 55 mm | Produkt-Reveal |
| seite | Fenster | 1800 × 1900 (Web 1624 × 1900) | 38 mm, schräg | Vorteil „Garten am Fenster“ |
| montage | Fenster | 2000 × 1400 | 40 mm, f/4 | Vorteil „Einspannen statt bohren“ |
| anzeige | Fenster | 1800 × 1800 | 70 mm, f/3,2 | Vorteil „Weniger gießen“ |
| schnitt | Studio | 2400 × 1500 (Web 1920 × 1200) | 50 mm, f/11 | Technik Schritt 1 |
| stadt | Fassade, 3 Fenster | 2400 × 1600 | 32 mm, f/4 | „Mach Platz für mehr Grün“ |
| nah | Fenster | 2000 × 1500 | 45 mm, f/4 | Abschluss / Warteliste |
| explosion | Studio | 2400 × 1500 (Web 16:10) | Bild 168 der Animation | Ersatzbild ohne WebGL |

Renderer: Cycles, GTX 1080 mit **CUDA** (OptiX bricht mit Kernel-Fehler ab), 128–192 Samples mit Denoiser, AgX, Belichtung je Bild (Szene +0,15, Studio −0,35). Zeit pro Bild 1–2,5 Minuten.

Schnittbild: zwei Boolean-Fenster links und rechts der Anzeige (die Mitte mit dem Sichtfenster bleibt stehen), bis knapp hinter die Dochte, damit sie sichtbar sind. Für dieses Bild bekommt das Wasser ein helles, leicht trübes Aqua und das Reservoir eine mattierte Oberfläche, dazu ein weiches Zusatzlicht. Alles wird nach dem Rendern zurückgesetzt.

**Ohne Skripte:** `blender/v7/stadtgarden_v7.blend` öffnen, oben die Szene wählen (Studio, Schnitt, Explosion, Fenster, Fassade), F12. Weitere Kameras der Fensterszene: Kamera_hero_mobil, _seite, _montage, _anzeige, _nah (als aktive Kamera setzen). Schnitt, abgesenkter Boden und heller Hintergrund hängen an den Szenen-Eigenschaften `sg_schnitt`, `sg_explosion`, `sg_hell` (Treiber).

**Mit Skript** (Datei neu bauen und alle Bilder rendern):

```python
import sys; sys.path.insert(0, r"C:\Users\Jay\Documents\GitHub\Webseite\blender\v6")
import sg_master7
sg_master7.build()                       # baut und speichert blender/v7/stadtgarden_v7.blend
for n in ("studio", "schnitt", "explosion", "hero", "hero_mobil", "montage", "anzeige", "seite", "nah", "stadt"):
    sg_master7.render_shot(n, r"…\renders\v7b")
```

Danach PNG → `assets-src/v7/*.jpg` (q95) und `npm run images`.

## Website

- Technik-Abschnitt als eine zusammenhängende Strecke: Titel „Sechs Teile. Ein Prinzip.“ → Schnittbild mit „Der geplante Wasserweg.“ (drei Schritte) → großer Viewer (Produkt / Innenleben / Wasserweg / Montage) → aufklappbar „Technik im Detail entdecken“ mit den sechs Teilen.
- Der angeheftete Scroll-Film (`TeardownFilm.tsx`, `public/film/`, 4–8 MB) ist entfernt. Die Explosion bleibt im Viewer (Modus Innenleben, Teile einzeln herausziehbar).
- Viewer: Sichtfenster gedämpftes Aqua ohne Leuchten, Wassertropfen im Modus Wasserweg ebenfalls gedämpft, Kontaktschatten direkt unter dem Boden (kein Schweben), Montage-Umgebung ohne Fensterkämpfer auf Stangenhöhe (sonst las er sich wie eine zweite Stange). Vorschaubild vor dem Laden neu aus dem Viewer aufgenommen.
- Ohne WebGL: Explosionsbild aus Blender. „Bewegung reduzieren“: keine Anheftungen, Inhalte vollständig sichtbar.

## Gemessen (lokal, statischer Export)

| Messung | Wert |
| --- | --- |
| Export `out/` gesamt | 7,3 MB (davon GLB 1,4 MB, nur bei Bedarf) |
| Desktop: LCP / CLS / geladen beim Start | 0,20 s / 0 / 540 KB |
| Handy, gedrosselt: LCP / CLS / geladen | 1,70 s / 0 / 536 KB |
| Breiten 1440, 1280, 1024, 768, 390, 360 | kein horizontales Scrollen, keine abgeschnittenen Überschriften, keine defekten Bilder, keine Konsolenfehler |

Gemessen in Chromium mit Software-Rendering; echte Geräte nicht geprüft.

## Lizenzen

| Asset | Quelle | Lizenz |
| --- | --- | --- |
| Studio Small 09 (HDRI) | polyhaven.com/a/studio_small_09 | CC0 1.0 |
| Produkt, Pflanzen, Blattatlas, Fassade, Fenster, Materialien | eigene Geometrie, prozedurale Texturen und Materialien | eigen |
| Werkzeuge | Blender 5.2 (GPL), glTF-Transform (MIT), sharp (Apache 2.0), three.js / R3F (MIT), GSAP | kostenlos |

Das HDRI liegt lokal in `blender/assets/` (per `.gitignore` ausgeschlossen) und ist in `stadtgarden_v7.blend` eingebettet (1024 px).

## Offene Punkte und Grenzen

1. **Pflanzen:** Efeutute und Pfennigkraut sind modelliert, nicht gescannt. Aus Produktfoto-Abstand stimmig; in extremen Nahaufnahmen fehlen Details wie Luftwurzeln, Blattränder mit Unregelmäßigkeiten und Gebrauchsspuren.
2. **Schnittbild:** Wurzeln liegen als Geflecht auf der Schnittebene (Illustration), nicht als simuliertes Wurzelsystem.
3. **Fassaden:** sauber, aber schlicht (kein Straßenleben, keine Nachbarhäuser).
4. **Montage:** Haltekraft, Eignung von Sims und Laibung, Öffnen des Fensters, Ablauf, Nachfüllen, Reinigung, Gewicht und Absturzsicherung sind ungeprüft. Die Seite behauptet dazu nichts.
5. Viewer-Leistung auf echten Handys ungeprüft.
