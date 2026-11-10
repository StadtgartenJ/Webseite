# Bildinventar und Bildprüfung (v7)

Seit v7 stammen **alle** Produktbilder aus dem Blender-Mastermodell (`blender/v6/`, Regeln in `docs/stadtgarden-master-design.md`). Es sind Konzeptvisualisierungen, keine Fotos eines Prototyps; die Seite sagt das im Footer und an den Technik-Bildern.

Ablauf: Cycles-Rendering (PNG, lokal in `blender/v6/renders/v7/`) → JPEG-Master q95 in `assets-src/v7/` → `npm run images` erzeugt AVIF und WebP in `public/images/v7-*`.

## Prüfung der bisherigen Bilder (KEEP / CORRECT / REPLACE)

Die bisherigen Bilder (`assets-src/v2/`, KI-generiert) widersprechen der Spezifikation in mindestens einem Punkt. Korrigieren hätte bei KI-Bildern wieder neue Abweichungen erzeugt, deshalb wurden alle ersetzt.

| Bisher | Einsatz | Abweichung | Urteil | Ersatz |
| --- | --- | --- | --- | --- |
| `hero-wide` / `hero-mobile` | Hero | Kasten schwebt knapp über dem Sims, blaues Wasser | REPLACE | `v7-hero`, `v7-hero-phone` |
| `hero-phone` | Hero Handy | Ausschnitt aus `montage-nah`, Kasten schwebt | REPLACE | `v7-hero-phone` |
| `studio-float` | Produkt-Reveal | J-Haken ohne Stange, Kasten schwebt | REPLACE | `v7-studio` |
| `window-plants` | Vorteil Garten | blaues Wasser, Montage unklar | REPLACE | `v7-seite` |
| `mount-detail` | Vorteil Montage | Stange vor dem Kasten | REPLACE | `v7-montage` |
| `macro-gauge` | Vorteil Wasser | leuchtend blaues Wasser | REPLACE | `v7-anzeige` |
| `cutaway` | Vorteil Wasser | Pfeile, Proportionen weichen ab | REPLACE | `v7-schnitt` |
| `exploded` | Ersatzbild ohne 3D | J-Haken | REPLACE | `v7-explosion` |
| `facade` | Stadtbild | Kasten schwebt, andere Form | REPLACE | `v7-stadt` |
| `produkt-gruen`, `explosion-gruen`, `explosion-hoch`, `schnitt-breit`, `montage-nah`, `montage-detail` | Scroll-Film (entfernt) | dunkelgrün, Halterung abweichend | REPLACE / entfällt | Viewer + `v7-schnitt` |
| `viewer-preview` | Standbild vor dem Laden | altes Modell, blaues Fenster | CORRECT | neu aus dem Viewer aufgenommen |

Die KI-Originale sind nicht gelöscht, sondern liegen in `assets-src/archiv/` (siehe README dort). Gelöscht: alle oben genannten Web-Varianten in `public/images/`, `scripts/optimize-images.mjs`, `scripts/build-film.py`, `scripts/build-model.sh` (v5), `public/film/`, alte GLBs sowie die ungenutzten Komponenten `TeardownFilm`, `TechStory`, `ProductExplorer`, `CutawayFallback`, `WordHighlight`.

## Aktuelle Bilder

| Web-Name | Master | Format | Abschnitt | Prüfung |
| --- | --- | --- | --- | --- |
| `v7-hero` | `hero.jpg` | 2560 × 1440 | Hero Desktop, `og.jpg` | Kasten steht auf dem Sims, Stange hinter dem Rand, Fenster mittig |
| `v7-hero-phone` | `hero_mobil.jpg` | 1600 × 1200 | Hero Handy | wie oben |
| `v7-studio` | `studio.jpg` (Ausschnitt) | 1800 × 1200 | Produkt-Reveal | steht auf dem Boden, eine Stange, zwei Bügel |
| `v7-seite` | `seite.jpg` (Ausschnitt) | 1624 × 1900 | Garten am Fenster | Seitenansicht auf dem Sims |
| `v7-montage` | `montage.jpg` | 2000 × 1400 | Einspannen statt bohren | Stange hinter dem Rand in der Laibung, Bügel über der Stange |
| `v7-anzeige` | `anzeige.jpg` | 1800 × 1800 | Weniger gießen | schmal, mittig, vertieft, gedämpftes Aqua |
| `v7-schnitt` | `schnitt.jpg` (Ausschnitt) | 1920 × 1200 | Technik Schritt 1 | sechs Teile, helles Wasser, Dochte sichtbar |
| `v7-stadt` | `stadt.jpg` | 2400 × 1600 | Mach Platz für mehr Grün | Kasten auf dem Sims eines von drei Fenstern |
| `v7-nah` | `nah.jpg` | 2000 × 1500 | Warteliste | Nahansicht auf dem Sims |
| `v7-explosion` | `explosion.jpg` (16:10) | 2400 × 1500 | ohne WebGL | Teile senkrecht getrennt, Anzeige bleibt in der Schale |

## Bildregeln für neue Bilder

1. Nur aus dem Mastermodell rendern, nie das Produkt neu zeichnen oder generieren.
2. In montierten Szenen steht der Kasten immer auf dem Sims, nie schwebend.
3. Genau eine Stange, hinter dem oberen Kastenrand; zwei breite Bügel; nichts davor oder darunter.
4. Sichtfenster mittig und gedämpft aqua; kein Blau, kein Leuchten.
5. Keine Pfeile, Sensoren oder Funktionen, die es nicht gibt. Technische Bilder als Konzept kennzeichnen.
