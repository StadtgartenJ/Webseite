# Conversion-Audit (v5/v6, heuristisch)

Ziel: mehr **echte** Wartelisten-Anmeldungen (Double-Opt-in), ohne Vertrauen zu verspielen. Das Audit ist heuristisch, nicht gemessen. Messwerte gibt es erst mit echten Besucherdaten (siehe Hypothesen).

## Wichtigste Bremse bleibt außerhalb des Codes

Ohne `NEXT_PUBLIC_WAITLIST_ENDPOINT` nimmt das Formular keine Adressen an (es sagt das offen). Brevo und Cloudflare Worker einrichten und die Variable im Build setzen, siehe `waitlist-worker/README.md` und `docs/release-checklist.md`. **Launch-Voraussetzung.**

## Befunde und Maßnahmen

| Bereich | Befund | Maßnahme in v5 |
| --- | --- | --- |
| Erster Bildschirm | Überschrift, Unterzeile, Formular und Produktfoto sofort sichtbar; Hinweis „In Entwicklung.“ mit Apricot-Statuspunkt direkt am Formular | Pflichttexte aus dem Briefing übernommen. Handy 390 × 844: Button vollständig im ersten Bildschirm. |
| Ein CTA-Text | überall „Auf die Warteliste“ | beibehalten (Hero, Reveal, Vorteile, Abschluss, Kopfzeile, Handy-Leiste) |
| Handy-Leiste | erschien in v5 zunächst auch über dem 3D-Viewer und konnte dessen Ansichtsknöpfe verdecken | Viewer wieder als „ruhige Zone“ markiert; geprüft: Leiste nur in Vorteilen, nie bei Hero, Viewer, Formular |
| Datenschutzneutrale Antwort | v4 sagte „Schon dabei“, wenn eine Adresse bekannt war. Damit konnte jeder prüfen, ob jemand eingetragen ist. | Worker antwortet für neue und bekannte Adressen gleich (`pending`). Text: „Ist deine Adresse neu, findest du dort einen Link zur Bestätigung. Erst danach bist du auf der Warteliste.“ Kein vorgetäuschter Erfolg: „Fast geschafft!“ erscheint nur nach Serverantwort. |
| Fehlerzustände | leer, ungültig, Rate-Limit, Server weg | getestet mit Mock-Endpunkt: Meldung am Feld bzw. allgemeiner Fehler, Fokus im Feld |
| Glaubwürdigkeit Technik | v4 ersetzte den künstlich wirkenden 3D-Erkunder durch Bilder | v5: neues Blender-Mastermodell als interaktiver Viewer mit vier Ansichten; Hinweis „Konzeptionelle Darstellung · Produkt in Entwicklung“ immer sichtbar. Das Modell ist erkennbar dasselbe Produkt, aber nicht fotoreal (siehe `docs/3d-rendering-report.md`). |
| Ladezeit | 3D bringt three.js mit | lädt erst in der Nähe des Abschnitts; davor ein Standbild an derselben Stelle. Erstladung JS laut Build 111 kB (gzip), 3D-Teil zusätzlich ca. 190 kB JS (gzip) + 521 KB Modell. |
| Technik-Abschnitt (v6) | Der Echtzeit-Viewer allein wirkte weniger hochwertig als die Fotos. | Davor ein Scroll-Film aus echten Cycles-Renderings (Teardown in fünf Schritten, kurze Texte), danach der Viewer zum Selbst-Erkunden mit demselben Modell. Kein Einfluss auf Hero, Texte oder Formular. Mehr Seitenlänge: der Film heftet sich für ca. 2,6 Bildschirmhöhen an. |
| Ausfallsicherheit | Wenn das Modell nicht lud, stürzte die ganze Seite ab | Fehlergrenze: Bild mit Hinweis, Rest der Seite bleibt bedienbar |
| Aussagen | keine Preise, Termine, Tage ohne Gießen, Sicherheits-, Schimmel- oder Nachhaltigkeitsversprechen, keine Zahl der Anmeldungen, keine Testimonials | geprüft im gesamten Seitentext. Ungeprüfte Funktionen mit „soll“, „geplant“, „Konzept“. |
| Vertrauen | Entwicklungshinweis im Hero, im Viewer und im Footer; Datenschutz-Link am Formular | beibehalten. **Impressum und Datenschutz enthalten noch Platzhalter → Launch-Voraussetzung.** |

## Gemessen (lokal, statischer Export)

| Messung | Desktop 1440 | Handy 390, gedrosselt (4× CPU, 1,6 Mbit/s) |
| --- | --- | --- |
| LCP | 0,2 s | 2,4 s (Hero-Bild) |
| CLS (Laden + ganz durchscrollen) | 0 | 0 |
| horizontales Scrollen | keins bei 1440, 1280, 1024, 768, 390, 360 | |

Lokale Messung ohne CDN; auf GitHub Pages mit echter Leitung **ungeprüft**.

## Hypothesen für spätere A/B-Tests

Erst sinnvoll, wenn die Warteliste läuft und eine datensparsame Messung vorhanden ist (z. B. serverseitige Zählung je Variante, ohne Cookies).

1. **Viewer-Position:** 3D-Viewer direkt nach dem Reveal statt nach den Vorteilen. Erwartung: Technikinteressierte bleiben länger, aber der emotionale Teil wird kürzer.
2. **Mehrwert der Anmeldung:** ein echtes Versprechen wie „Du erfährst Preis und Starttermin vor allen anderen.“ – nur, wenn es so kommt.
3. **Viewer-Einstieg:** Start in „Innenleben“ statt „Produkt“ (das Produkt ist oben schon als Foto zu sehen).
4. **Abschlussbild:** Produktfoto neben dem Formular gegen reine Farbfläche.
