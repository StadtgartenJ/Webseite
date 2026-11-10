# Stadtgarden · Kanonische Produktspezifikation (Konzept)

Stand: 10. 11. 2026 · gilt für **alle** Bilder, Schnittdarstellungen, Animationen und das 3D-Modell.
Quelle der Geometrie: `blender/v6/sg_model.py` (Masterdatei `blender/v6/stadtgarden_v6.blend`).
Alle Maße sind **Konzeptannahmen**, keine Konstruktionsdaten. Es gibt keine Toleranzen, Zertifikate, Last- oder Sicherheitsnachweise.

## 1 · Gesamtbild

Ein weißer, kapselförmiger Pflanzkasten für die **Außenseite** eines Fensters. Er **steht mit seiner Unterseite auf dem äußeren Fenstersims**. Eine einzelne weiße Spannstange liegt **hinter dem oberen Bereich** des Kastens zwischen den Seiten der Fensterlaibung. Zwei breite weiße Bügel laufen über diese Stange und sind an der Rückseite des Kastens eingehängt.

## 2 · Außenschale

| Merkmal | Festlegung |
| --- | --- |
| Silhouette | lange, liegende Kapsel; Enden in der Vorderansicht weich gerundet (Radius unten ≈ halbe Höhe), oben offen und gerade |
| Konzeptmaße | ca. 80 cm lang · 24 cm tief · 27 cm hoch |
| Boden | flache Standfläche (ca. 53 × 12 cm), damit der Kasten auf dem Sims aufliegt; Übergang zu den Wänden gerundet |
| Wand | ca. 5 mm, oberer Rand halbrund gerollt |
| Material | seidenmatter weißer Kunststoff (warmes Weiß), feine Mikrostruktur, zurückhaltende Reflexe |
| Anmutung | ruhig, skandinavisch, keine sichtbaren Schrauben, keine Logos auf der Front |

## 3 · Wasserstandsanzeige

- **genau mittig** auf der Vorderseite (x = 0), senkrecht, schmal (ca. 2 × 8 cm Langloch)
- in die Schale **eingelassen**: klares Fenster ca. 0,5 mm hinter der Außenfläche, umlaufende weich gerundete Kante, **keine** aufgesetzte Leiste
- Inhalt: gedämpftes Aqua / helles Petrol, transparent, entsättigt, **kein** leuchtendes Blau, **kein** Glühen
- gehört zur **Außenschale** und bewegt sich in jeder Darstellung (auch in der Explosion) mit ihr
- rein mechanisch-optisch gedacht; **kein** elektronischer Sensor
- **offen:** wie der Wasserstand physikalisch ins Fenster gelangt (z. B. Steigrohr oder Schwimmer mit Verbindung zum Reservoir) – noch nicht konstruiert

## 4 · Innenleben (sechs Teile, ein Prinzip)

| # | Teil | Festlegung |
| --- | --- | --- |
| 1 | Außenschale | wie oben, inkl. Anzeige |
| 2 | Pflanzeinsatz | herausnehmbar, matt anthrazit/schwarz, gerade Wände, Schlitze im unteren Bereich, zwei Durchlässe für die Dochte |
| 3 | Trennplatte | weiß, gleichmäßiges Lochraster, zwei Schlitze für die Dochte, liegt auf dem Reservoirrand |
| 4 | Kapillarelemente | zwei flache Vliesbänder (ca. 5 cm breit), reichen vom Reservoirboden durch die Platte in den Einsatz |
| 5 | Wasserreservoir | klare Wanne im unteren Teil der Schale; Wasser gedämpftes Aqua, transparent |
| 6 | Halterung | eine Spannstange (teleskopierbar, Endkappen mit Gummiauflage) + zwei breite Bügel |

Gleiche Geometrie in montiertem Zustand, Schnitt und Explosion. Keine weiteren Funktionsteile (kein Einfüllschacht, kein Überlauf, keine Elektronik), solange sie nicht konstruiert sind.

## 5 · Montagekonzept

- Der Kasten **steht auf dem äußeren Sims**. Er schwebt in Einbausituationen **nie** über dem Sims.
- **Eine** horizontale Spannstange, **hinter** dem oberen Kastenbereich (Mitte ca. 2 cm über dem Rand), zwischen den Laibungsseiten verspannt; Endkappen mit Gummi drücken gegen die Laibung.
- **Zwei** breite, flache weiße Bügel (ca. 6 cm) kommen von Aufnahmen an der **Rückwand** des Kastens, laufen über die Stange und hängen dort ein.
- Die Stange liegt **nicht** vor der Front, **nicht** unter dem Kasten, es gibt **keine** zweite Stange, **keine** J-Haken, Seile oder Zusatzschienen.
- Funktion (Konzept): Der Sims trägt, Stange und Bügel **positionieren und sichern** gegen Kippen und Verrutschen.

### Offene technische Fragen (nicht gelöst, nicht behaupten)

1. Haltekraft der Spannstange, Verhalten bei Wind, Temperatur und Feuchte, Lastpfad bei Kippmoment – **ungeprüft**.
2. Eignung verschiedener Simse (Gefälle, Material, Breite, Blech) und Laibungen (Putz, Klinker, Breite) – **ungeprüft**.
3. Fensteröffnen: Die Stange liegt außen vor dem Fensterflügel; ob nach innen öffnende Flügel frei bleiben, hängt vom Abstand ab – **zu prüfen**.
4. Entwässerung: Ablauf bei Überfüllung/Regen und Schutz der Fassade – **nicht konstruiert**.
5. Nachfüllen und Reinigen: Zugang über den herausnehmbaren Einsatz gedacht; ein eigener Einfüllweg ist **nicht** festgelegt.
6. Gewicht im gefüllten Zustand und Sicherung gegen Herabfallen – **ungeprüft**, vor einem Verkauf durch eine Fachperson zu bewerten.

## 6 · Bildregeln (für jedes Bild)

Vor Veröffentlichung jedes Bild prüfen:

- [ ] gleiche Schale, gleiche Proportionen
- [ ] gleiche Halterung (eine Stange hinten, zwei breite Bügel)
- [ ] Anzeige mittig, bündig, gedämpftes Aqua
- [ ] in Einbauszenen: Kasten steht auf dem Sims
- [ ] gleiches Innenleben, gleiche Materialien
- [ ] glaubwürdige Kameraperspektive, keine widersprüchlichen Details
- [ ] Hinweis „Konzeptionelle Darstellung · Produkt in Entwicklung“ bei technischen Darstellungen

Bilder entstehen aus der Blender-Masterdatei. Unabhängig erzeugte KI-Varianten des Produkts werden nicht verwendet.

## 7 · Farben und Materialien (Rendering)

| Teil | Farbe | Rauheit |
| --- | --- | --- |
| Schale | #F1EDE4 | 0,36 + Mikrostruktur |
| Bügel, Stange | #F1EFEA Pulverlack | 0,48 + Orangenhaut |
| Endkappen | #EDEBE5, Gummi #8E908B | 0,42 / 0,82 |
| Einsatz | #1D1F1C | 0,50, genarbt |
| Trennplatte | #E6E3DB | 0,45 |
| Wasser | Absorption #B7DCD7 (gedämpftes Aqua; im Schnittbild hell-aqua, leicht trüb) | 0,02 |
| Anzeige | #6FAFAA (gedämpftes Aqua, im Viewer ohne Leuchten) | 0,15 |
| Substrat | dunkle Erde #1A130D–#3D2C1D, Rindenstücke #5C3D26, Perlitkörner #E2DED3 (auch auf der Schnittfläche) | 0,95 |
| Wurzeln (nur Schnittbild) | #C9B994 | 0,60 |

## 8 · Bepflanzung (in jedem Bild gleich)

- **Goldene Efeutute** (Epipremnum aureum): links und in der Mitte, aufrechte Triebe mit herzförmigen, gelb panaschierten Blättern; lange Ranken über Vorderkante und linke Seite.
- **Gold-Pfennigkraut** (Lysimachia nummularia 'Aurea'): rechts als dichtes Polster mit runden, gelbgrünen Blättern in Paaren; feine Ranken über Vorderkante und rechte Seite.
- Geometrie und Blatttexturen sind eigene Arbeit (`blender/v6/sg_plants.py`, `sg_leaftex.py`, Atlas `blender/v6/tex_v7/`), keine Fremd-Assets. Im Viewer dieselben Pflanzen mit demselben Atlas.

## 9 · Masterdatei

`blender/v7/stadtgarden_v7.blend` – eigenständig (alle Texturen eingebettet, keine Skripte nötig), fünf Szenen: Studio, Schnitt, Explosion, Fenster, Fassade. Bedienung steht im Textblock „LIESMICH“ in der Datei. Neu bauen: `sg_master7.build()`.
