> Historisch (v4). Aktueller Stand: `docs/3d-rendering-report.md` und `docs/stadtgarden-master-design.md`.

# Produktvisualisierung: Qualitätstor und Entscheidung (v4)

## Entscheidung

Der Scroll-Film aus React Three Fiber ist **nicht mehr auf der Seite**. Ein vorgerenderter Blender-Film hat das Qualitätstor ebenfalls **nicht** bestanden. Der Technik-Abschnitt „Schön durchdacht. Bis ins Innere.“ besteht jetzt aus vier hochwertigen Standbildern mit kurzen Erklärungen (Produkt · Innenleben · Wasserweg · Montage).

- **Desktop:** Links steht eine Bühne, die beim Scrollen stehen bleibt (CSS `position: sticky`, kein Scroll-Hijacking). Rechts laufen die vier Stationen; das Bild blendet zur jeweils aktiven Station über.
- **Handy und Tablet:** Jede Station mit eigenem Bild, untereinander.
- **Ohne JavaScript oder WebGL:** Alles bleibt lesbar. Die Seite braucht kein WebGL mehr.
- **„Bewegung reduzieren“:** Die Bilder wechseln ohne Blende und ohne Zoom.

Nebeneffekt: Das JavaScript beim ersten Laden sinkt laut Next.js-Build von 160 kB auf 108 kB (GSAP und der Erkunder-Code fallen weg). Außerdem wird three.js mit React Three Fiber gar nicht mehr nachgeladen.

## Qualitätstor

| Prüfung | Ergebnis |
| --- | --- |
| Blender verfügbar? | Ja, als Python-Paket `bpy` 5.2.3 LTS mit Cycles (CPU, 2 Kerne) |
| Lizenzierte, realistische Pflanzen-Assets? | **Nein.** Poly Haven und andere Bibliotheken waren aus der Arbeitsumgebung nicht erreichbar; im Projekt liegt keines. |
| Render 1 (zusammengesetzt), 1600 × 900, 64 Samples | `docs/qualitaetstor/render1-zusammengesetzt.jpg` |
| Render 2 (Explosion), 1600 × 900, 64 Samples | `docs/qualitaetstor/render2-explosion.jpg` |

Beide Renderings habe ich mit den vorhandenen Konzeptbildern verglichen, besonders mit der Explosionsansicht auf Dunkelgrün. Ergebnis: **nicht bestanden.**

- **Pflanzen:** Die Blätter wirken wie flache Papierausschnitte, die Zeichnung ist fleckig, Ranken und Pfennigkraut sehen künstlich aus. Ohne ein echtes Pflanzen-Asset ist das nicht zu beheben.
- **Halterungen:** Aus der Kameraperspektive kaum sichtbar. Die Proportionen von Stange und Schale weichen von den Fotos ab.
- **Material:** Die Schale wirkt glatt-weiß wie ein Kunststoffrender, nicht wie das warme Satin der Fotos.
- **Fazit:** Ein 4K-Film aus diesem Modell würde der Marke schaden. Deshalb habe ich keine Bildsequenz erzeugt.

## Was nötig wäre, um den Film doch zu machen

1. **Pflanzen:** Ein realistisches, kommerziell nutzbares 3D-Asset für Efeutute (*Epipremnum aureum*, panaschiert) und eine feine Hängepflanze. Quellen zum Beispiel: Poly Haven (CC0, Auswahl begrenzt), Quixel/Fab (Lizenz prüfen), Evermotion, Botaniq (Blender-Add-on, kommerziell). Die Datei in eine Collection „Pflanzen“ legen und mit `--plants pfad/zur/datei.blend` laden.
2. **Modell feinschleifen:** Die Schale als Unterteilungsmodell nach Maßzeichnung statt Bevel-Quader, Halterungen als echte Bänder mit Radius über der Stange, Material-Feinschliff (Satin mit leichter Subsurface-Streuung, ganz leichte Oberflächenstruktur).
3. **Qualitätstor wiederholen:** Render 1 und 2 neben die Fotos legen. Erst wenn sie nicht mehr unterscheidbar wirken, die Sequenz rendern.
4. **Sequenz:** etwa 120 Bilder, 1600 px breit, als AVIF/WebP (je ca. 40–80 kB). Laden erst in Sichtnähe, bei Handys 900 px breit. Einbindung über GSAP ScrollTrigger (pin, scrub) auf ein `<canvas>`. Die Standbilder bleiben als Fallback.

Realistisch ist das Arbeit für eine 3D-Artistin oder einen 3D-Artist mit GPU und Pflanzenbibliothek, etwa 2–4 Tage. Eine günstigere Alternative mit hoher Wirkung: die sechs Stationen aus den Storyboard-Bildern als **saubere Einzelbilder ohne eingebrannte Schrift**, mindestens 2400 px breit, mit identischer Kamera erzeugen. Die neue Technik-Bühne kann sie direkt aufnehmen (ein Eintrag je Station in `components/TechStory.tsx`).

Hinweis zu den Storyboard-Bildern: Sie enthalten Formulierungen wie „Speicher für mehrere Tage“, „versorgt deine Pflanzen über mehrere Tage“ und „für länger frische Pflanzen“. Das sind ungeprüfte Leistungsversprechen. Auf der Seite stehen sie bewusst nicht.

## Blender-Skript

`blender/stadtgarden_master.py` baut das Mastermodell reproduzierbar auf. Jedes Bauteil ist ein eigenes Objekt mit sprechendem Namen: Außenschale mit Sichtfenster, Reservoir mit Wasser, Trennplatte mit Lochmuster, zwei Kapillarelemente, Pflanzeinsatz mit Substrat, Spannstange, zwei Endkappen, zwei breite Halterungen. Dazu kommen das dunkelgrüne Studio mit warmem Hauptlicht, kühlem Fülllicht und Streifenlicht, die Kamera und der Zustand „zusammengesetzt“ oder „Explosion“. Die Explosion verschiebt Bauteile nur entlang der Höhe; die Geometrie bleibt in jedem Zustand gleich.

```
pip install bpy            # oder Blender 4.2+ installieren
python3 blender/stadtgarden_master.py --state assembled --out renders/render1.png
python3 blender/stadtgarden_master.py --state exploded  --out renders/render2.png --save renders/szene.blend
# mit lizenziertem Pflanzen-Asset:
python3 blender/stadtgarden_master.py --plants assets/pflanzen.blend --samples 256 --res 3200x1800
```

Mit `--save` entsteht eine `.blend`-Datei zum Weiterarbeiten in Blender.

## Der alte 3D-Erkunder

Die Dateien unter `components/explorer/` (R3F-Modell, Scroll-Film, Tabs) liegen noch im Repository, werden aber nirgends mehr eingebunden. Sie landen also nicht im ausgelieferten Code. Sie können gelöscht werden, sobald klar ist, dass das interaktive Modell nicht zurückkommt.
