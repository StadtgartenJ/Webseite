# 3D-Bericht v6: Premium-Teardown

Stand: 10. 11. 2026 · Branch `v6-teardown` · betrifft nur den Abschnitt „Schön von außen. Durchdacht von innen.“

## Ergebnis in Kürze

| Lieferung | Datei | Stand |
| --- | --- | --- |
| Bearbeitbare Blender-Masterdatei | `blender/v6/stadtgarden_v6.blend` (gebaut von `blender/v6/sg_run.py`) | fertig |
| Rendering montiert, 4K | `blender/v6/renders/stadtgarden_v6_produkt_4k.png` (3840 × 2160, Cycles, 200 Samples) | fertig, geprüft |
| Explosionsansicht, 4K | `blender/v6/renders/stadtgarden_v6_explosion_4k.png` | fertig, geprüft |
| Teardown-Animation | in der Masterdatei (240 Bilder, 24 fps, Kamera `Kamera_Film`) | fertig |
| Vorgerenderte Bildsequenz | `public/film/teardown-1080/` und `teardown-720/` (94 Bilder, WebP) | siehe Abschnitt Scroll-Film |
| Interaktives GLB | `public/models/stadtgarden-v6.glb` (1,5 MB, ca. 188 000 Dreiecke, Meshopt + WebP) | fertig |
| Website | Scroll-Film + interaktiver Viewer im Technik-Abschnitt | fertig, lokal geprüft |

Ehrlich: Die Cycles-Bilder wirken wie ein hochwertiges Produktfoto aus dem Studio, aus der Nähe erkennt man bei den Hängepflanzen aber, dass es gerenderte Blattflächen sind. Die Echtzeit-Version im Browser ist einfacher (kein Pfadverfolgungs-Licht, keine Transluzenz der Blätter) und zeigt erkennbar dasselbe Produkt.

## Pipeline

```
blender/v6/sg_model.py    Produkt: alle Bauteile als eigene, benannte Objekte, echte Maße in Metern, PBR-Materialien
blender/v6/sg_plants.py   Bepflanzung aus Scan-Assets (Poly Haven, CC0)
blender/v6/sg_studio.py   Hohlkehle, Softboxen, HDRI, Kameras, Cycles-Einstellungen
blender/v6/sg_anim.py     Teardown-Animation (Keyframes an den Gruppen-Empties, Kamera-Rig)
blender/v6/sg_run.py      Einstieg: build_master(), render(), render_sequence()
blender/v6/sg_export.py   Web-GLB (vereinfacht), danach scripts/build-model-v6.sh
scripts/build-film.py     PNG-Sequenz → WebP für den Scroll-Film
```

In Blender (Skript-Editor):

```python
import sys; sys.path.insert(0, r"C:\Users\Jay\Documents\GitHub\Webseite\blender\v6")
import sg_run
sg_run.build_master()                                    # baut und speichert stadtgarden_v6.blend
sg_run.render("produkt", r"…\produkt.png", (3840, 2160), 200)
sg_run.render_sequence(r"…\teardown_1080", (1080, 1080), 96, 0, 186, 2)
```

Grafikkarte: GTX 1080 mit **CUDA** (OptiX meldet bei dieser Karte einen Kernel-Fehler). Zeiten: 4K-Standbild ca. 5 min, Sequenzbild 1080² ca. 25–60 s.

## Bauteile (getrennte Objekte, Gruppen für die Animation)

| Gruppe (Empty) | Objekte |
| --- | --- |
| `GRP_Schale` | `SG_Schale` (Wand 5 mm, gerollter Rand, Langloch), `SG_Anzeige_Fenster`, `SG_Anzeige_Wasser`, `SG_Anzeige_Rueckwand`, `SG_Halterung_L/R_Aufnahme` |
| `GRP_Reservoir` | `SG_Reservoir` (klar, 2,5 mm), `SG_Wasser` |
| `GRP_Dochte` | `SG_Docht_L`, `SG_Docht_R` (Vlies, unten nass) |
| `GRP_Trennplatte` | `SG_Trennplatte` (echtes Lochraster, Schlitze für die Dochte) |
| `GRP_Pflanzeinsatz` | `SG_Pflanzeinsatz` (schwarz, Lüftungsschlitze, Dochtdurchlass), `SG_Erde` (Relief, Perlit, Rinde), Pflanzen |
| `GRP_Halterungssystem` | `SG_Stange_Aussen`, `SG_Stange_Innen` (teleskopierbar), `SG_Stange_Klemmring`, `SG_Endkappe_L/R` + Gummi, `SG_Halterung_L/R` (breite Bänder über der Stange) |

Maße (Annahmen aus den Konzeptbildern, keine Konstruktion): Schale 80 × 24 × 27 cm, Stange 1,0 m mit Endkappen, Bänder 6 cm breit. Keine J-Haken, kein Einfüllschacht, keine weiteren Funktionen.

## Teardown-Animation (240 Bilder, 24 fps)

| Bilder | Phase |
| --- | --- |
| 0–24 | montiertes Produkt, Kamera fährt langsam an |
| 24–66 | Pflanzeinsatz hebt sich |
| 54–90 | Trennplatte wird sichtbar |
| 80–108 | Kapillardochte werden freigelegt |
| 96–136 | Reservoir und Schale fahren auseinander |
| 120–150 | Halterungssystem hebt ab, Aufbau komplett sichtbar |
| 150–186 | Halten, Kamera kreist weiter |
| 186–240 | alles setzt sich in umgekehrter Reihenfolge zusammen |

Alle Bewegungen sind reine Verschiebungen entlang der Montageachse mit weichem Ein- und Auslauf (Bezier, Auto-Clamped), ohne Überschwingen.

## Qualitätsprüfung (an den echten Renderings)

| Kriterium | Befund |
| --- | --- |
| Geometrie | Rundungen sauber, Rand gerollt, Wandstärken sichtbar, Langloch mit Fenster und Flüssigkeit. Geprüft in Nahaufnahmen von vorne und hinten. |
| Materialien | Schale seidenmatt mit leichter Mikrostruktur, Bügel pulverbeschichtet (Orangenhaut), Einsatz schwarz genarbt, Reservoir klar mit Wasser (Absorption), Dochte als Vlies. |
| Pflanzen | Krone aus eingescannten Anthurium-Pflanzen; Ranken mit eingescannten Blättern und Stängeln. Wirkt aus Produktfoto-Abstand natürlich; aus der Nähe sind die Ranken als Blattflächen erkennbar. Echte Efeutute/Pfennigkraut gibt es frei lizenziert nicht in vergleichbarer Qualität. |
| Befestigung | Bänder kommen von der Rückwand, laufen über die Stange und sind unten in Aufnahmen eingehängt. Plausibel als Konzept, **nicht** statisch geprüft. |
| Technische Plausibilität | Wasser unten, Dochte durch die Platte bis ins Substrat, Wasserstand im Fenster sichtbar. Ob das im Alltag genügt, ist ungetestet. |
| Browser | gleiche Teile und Proportionen; Blätter ohne Transluzenz, Glas als einfache Transparenz. |

## Website

- **Scroll-Film** (`components/explorer/TeardownFilm.tsx`): Abschnitt wird angeheftet, ScrollTrigger (scrub) zeichnet die Blender-Bilder auf ein Canvas, fünf kurze Texte zu den Phasen. Bilder laden erst in der Nähe des Abschnitts. „Bewegung reduzieren“: kein Anheften, Endbild der Explosion und alle Texte untereinander.
- **Interaktiver Viewer** (`PlanterScene.tsx`, unverändert bedienbar): lädt jetzt `stadtgarden-v6.glb`. Drehen, Zoomen, Produkt / Innenleben / Wasserweg / Montage, einzelne Teile herausziehen.
- Standbild vor dem Laden: Aufnahme aus dem Viewer selbst. Ohne WebGL: 4K-Explosionsrendering aus Blender.

## Lizenzen

| Asset | Quelle | Lizenz |
| --- | --- | --- |
| Anthurium Botany 01 (Modell, Texturen 4K) | polyhaven.com/a/anthurium_botany_01 – Rob Tuytel, Rico Cilliers | CC0 1.0 |
| Periwinkle Plant (Texturatlas 4K) | polyhaven.com/a/periwinkle_plant – Amal Kumar | CC0 1.0 |
| Studio Small 09 (HDRI) | polyhaven.com/a/studio_small_09 | CC0 1.0 |
| Produkt, Erde, Materialien | eigene Geometrie und Prozedur-Materialien (Skripte im Repo) | eigen |
| Werkzeuge | Blender 5.2 (GPL), glTF-Transform (MIT), three.js / React Three Fiber (MIT), GSAP (frei, Standardlizenz) | kostenlos |

Die Assets liegen lokal in `blender/assets/` und sind über `.gitignore` vom Repository ausgeschlossen (über 100 MB).

## Grenzen

1. Echte Efeutute und Pfennigkraut wie auf den Konzeptfotos: nur mit kostenpflichtigen oder selbst gescannten Pflanzen.
2. Echtzeit-Version: Leistung auf echten Handys ungeprüft (getestet nur mit Software-Rendering).
3. Der Scroll-Film wiegt ca. 4–8 MB (je nach Bildschirm, nur bei Bedarf geladen).
