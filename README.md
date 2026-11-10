# Stadtgarden – Pre-Launch-Website

Einseitige Kampagnen-Website für einen Pflanzkasten in Kapselform, der vor dem Fenster hängt. Ziel: E-Mail-Adressen für die Warteliste sammeln (Double-Opt-in). **Das Produkt ist in Entwicklung**; alle Bilder sind KI-Konzeptvisualisierungen, das 3D-Modell ist ein prozedurales Konzeptmodell, keine Konstruktion.

- **Stack:** Next.js 15 (statischer Export), React 19, TypeScript, CSS mit Design-Tokens, React Three Fiber + Drei für das 3D-Modell
- **Hosting:** GitHub Pages über GitHub Actions, Domain `stadtgarden.de`
- **Warteliste:** Cloudflare Worker → Brevo (Double-Opt-in), siehe [`waitlist-worker/`](waitlist-worker/README.md)
- **Keine Cookies, kein Tracking, keine externen Schriften**

## Lokal starten

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # statischer Export nach out/
npx serve out        # Export ansehen
```

Für ein funktionierendes Formular lokal: `.env.example` nach `.env.local` kopieren und `NEXT_PUBLIC_WAITLIST_ENDPOINT` setzen. Ohne den Wert meldet das Formular offen „Die Warteliste öffnet in Kürze“ und nimmt keine Adressen an.

## Seitenaufbau und Text (v5 „Botanical Premium“)

| Abschnitt | Grund | Überschrift | Inhalt |
| --- | --- | --- | --- |
| Hero | Foto, Warm Cream | „Dein Fenster. Dein Garten.“ | „Mehr Grün zu Hause. Auch ohne Balkon.“, Formular direkt im Hero, „In Entwicklung. Kostenlos und unverbindlich vormerken.“ |
| Reveal | Moos, Studiolicht | „Ein bisschen Natur. Mitten in der Stadt.“ | freigestelltes Produkt, zweite CTA |
| Vorteile | Warm Cream | „Mehr Grün. Weniger Aufwand.“ | drei Kompositionen: Garten am Fenster · Einspannen statt bohren · Weniger gießen |
| Technik | Soft Sage | „Schön von außen. Durchdacht von innen.“ | interaktiver 3D-Viewer: Produkt · Innenleben · Wasserweg · Montage |
| Alltag | Fassade vollflächig | „Mach Platz für mehr Grün.“ | ruhige Textkarte über dem Foto |
| Warteliste | Forest | „Hier wächst etwas Neues.“ | Produktfoto, Formular, „Kostenlos und unverbindlich. Nur Produktupdates. Jederzeit abmeldbar.“ |

**CTA-System:** überall „Auf die Warteliste“. Jeder CTA-Link setzt den Cursor ins nächste E-Mail-Feld. Die Handy-Leiste erscheint nur, wenn kein anderer CTA, kein Formular und nicht der 3D-Viewer im Bild ist.

**Formularzustände:** Leer und ungültig (am Feld), „Fast geschafft!“ nur nach Serverantwort, allgemeiner Fehler für alles andere. Neue und bereits bekannte Adressen bekommen **dieselbe** Antwort (der Worker verrät nicht, wer eingetragen ist). Ohne konfigurierten Endpunkt sagt das Formular offen, dass die Warteliste noch keine Adressen annimmt.

## Designsystem

Siehe `docs/product-design-system.md`. Kurz: Warm Cream `#FFF9ED` als Hauptgrund, Forest `#173F35`, Lime `#DCEB91`, Soft Sage `#E5EED7`, Apricot `#F0AF76` (nur kleine Wärmeakzente), Ink `#202522`. Schriften Bricolage Grotesque und Figtree, selbst gehostet.

## Code-Struktur

```
app/                     Seiten (Startseite, Impressum, Datenschutz, /bestaetigt), globals.css, Schriften
components/
  SiteHeader.tsx         Kopfzeile, transparent über dem Hero (Desktop)
  WaitlistForm.tsx       Formular mit sichtbarem Label, Lade-, Fehler-, „bereits eingetragen“- und Erfolgszustand, Honeypot
  WaitlistLink.tsx       einheitlicher CTA „Auf die Warteliste“, fokussiert das nächste E-Mail-Feld
  ScrollFloat.tsx        schwebendes Produkt im Reveal (scrollgekoppelt)
  StickyCta.tsx          Handy-Leiste
  Picture.tsx            AVIF/WebP mit Art-Direction (eigener Handy-Ausschnitt)
  explorer/ProductViewer.tsx  3D-Viewer: Lazy Loading, Standbild, Fallbacks, Bedienung
  explorer/PlanterScene.tsx   Szene (React Three Fiber), lädt public/models/stadtgarden-v7.glb
blender/v7/stadtgarden_v7.blend  eigenständige Masterdatei (fünf Szenen, Texturen eingebettet)
blender/v6/              Bauskripte (Produkt, Pflanzen, Blattatlas, Fensterszenen, Kameras); blender/stadtgarden_v5.py = Vorgänger
scripts/build-model-v6.sh  Blender → GLB → gltf-transform (Meshopt, WebP); npm run model
scripts/optimize-images-v7.mjs  Bildmaster → AVIF/WebP; npm run images
lib/waitlist.ts          Client-Adapter zum Wartelisten-Endpunkt
waitlist-worker/         serverseitiger Endpunkt (Cloudflare Worker)
assets-src/v7/           Bildmaster (JPEG q95 aus den Cycles-Renderings)
docs/stadtgarden-master-design.md  verbindliche Produkt- und Bildspezifikation
docs/bilder.md           Bildprüfung (KEEP/CORRECT/REPLACE) und Bildregeln
```

## Technik-Abschnitt und 3D (v7)

- **Blender-Masterdatei** `blender/v7/stadtgarden_v7.blend`: öffnen, Szene wählen (Studio, Schnitt, Explosion, Fenster, Fassade), F12 – ohne Skripte und ohne externe Dateien. Gebaut von den Skripten in `blender/v6/` (`sg_master7.build()`). Bepflanzung (Efeutute, Pfennigkraut) und Blattatlas sind eigene Arbeit. `blender/v6/stadtgarden_v6.blend` ist der Vorgänger.
- **Alle Produktbilder** sind Cycles-Renderings aus demselben Modell (`blender/v6/sg_scene.py`, `sg_shots.py`). Der angeheftete Scroll-Film ist seit v7 entfernt; der Abschnitt zeigt Schnittbild, Wasserweg in drei Schritten, den Viewer und aufklappbare Details.
- **Interaktiver Viewer**: dasselbe Modell als optimiertes GLB (`public/models/stadtgarden-v7.glb`), drehen, zoomen, vier Ansichten (`PlanterScene.tsx`, `ProductViewer.tsx`). Lädt erst in der Nähe des Abschnitts; Standbild davor, Rendering ohne WebGL.
- Neu bauen: `npm run model` (GLB) und `npm run images` (Bilder). Details, Zeiten und Lizenzen: `docs/3d-rendering-report.md`.

## Weitere Dokumente

- `docs/deployment-diagnosis.md`: Ursache des 404 auf stadtgarden.de und die nötigen Einstellungen
- `docs/conversion-audit.md`: Befunde, Maßnahmen, Messwerte, Hypothesen für A/B-Tests
- `docs/release-checklist.md`: alles, was vor dem Start erledigt sein muss
- `docs/product-design-system.md`: Farben, Schrift, Formen, Bewegung, CTA
- `docs/3d-rendering-report.md`: Blender-Master, Teardown, GLB, Scroll-Film, Lizenzen
- `docs/bilder.md`: Bildinventar und Prompts

## Veröffentlichen (GitHub Pages)

1. **Settings → Pages → Source:** „GitHub Actions“ (nicht „Deploy from a branch“, sonst laufen zwei Deployments gegeneinander, siehe `docs/deployment-diagnosis.md`).
2. **Custom domain** `stadtgarden.de`, DNS beim Anbieter setzen, „Enforce HTTPS“ aktivieren.
3. **Settings → Secrets and variables → Actions → Variables:** `WAITLIST_ENDPOINT` mit der Worker-URL.
4. Jeder Push auf `main` baut und veröffentlicht (`.github/workflows/deploy.yml`).

## Vor dem öffentlichen Start

- [ ] **Impressum** vollständig ausfüllen (gelb markierte Felder).
- [ ] **Datenschutzerklärung** ergänzen und rechtlich prüfen lassen.
- [ ] **Brevo + Worker** einrichten, `WAITLIST_ENDPOINT` setzen, Anmeldung komplett testen (Mail, Bestätigungslink, `/bestaetigt/`, Abmeldung).
- [ ] Rate-Limiting-Syntax in `waitlist-worker/wrangler.toml` mit der aktuellen Cloudflare-Doku abgleichen.
- [ ] Bilder in höherer Auflösung und mit einheitlicher Montage nachziehen (siehe `docs/bilder.md`).

## Was bewusst nicht behauptet wird

Keine Angaben zu Preis, Termin, Maßen, Tagen ohne Gießen, Wetter- oder Absturzsicherheit, Schimmelfreiheit, Wartungsfreiheit, Nachhaltigkeit oder „passt in jedes Fenster“. Die Montage steht immer mit „an geeigneten Fenstern“, Reservoir und Kapillarbewässerung als „geplant“ bzw. mit „soll“; im 3D-Bereich steht dauerhaft „Konzeptionelle Darstellung · Produkt in Entwicklung“.

## Wie die Design-Skills eingesetzt wurden

- **Frontend Design (Anthropic):** Token-Plan vor dem Bauen, eine mutige Stelle (das große Produkt auf Moos), keine Versalien-Labels, keine 01/02/03-Nummern (die drei Vorteile sind keine Abfolge), keine Pfeile in Buttons, keine Kartenreihen.
- **UI/UX Pro Max:** Storytelling-Muster mit CTA nach jedem Argument und großer Schluss-CTA, sichtbare Formular-Labels, 44-px-Klickflächen (Formular 64 px), AVIF/WebP mit festen Maßen gegen Layout-Sprünge, progressive Offenlegung im 3D-Bereich. Die vorgeschlagene Farbe/Schrift (Grau-Gold, Cinzel) passte nicht zum Briefing und wurde verworfen.
- **Taste:** Seitentyp „product“, Fotos führen, das Produkt in jedem Abschnitt in einem anderen Bild, ein Auftritt beim Laden, keine Fade-ins pro Abschnitt. `copy-lint` meldet die vielen Zwei-Satz-Überschriften („X. Y.“) als Stilmittel-Häufung; sie sind vorgegebener Kampagnentext und bleiben bewusst.
- **Impeccable:** Kontraste gemessen (Text auf Moos ≥ 4,9 : 1 an der hellsten Stelle hinter dem Text, Lime/Wald 9 : 1, Elfenbein-Text auf Wald 8,4 : 1, Platzhalter 4,6 : 1), gestaltete Browserflächen (Markierung in Lime, Fokusringe), alle Formularzustände geprüft.
- **Emil Kowalski:** ease-out für Auftritte, Buttons `scale(0.97)` beim Drücken, Hover nur bei feinem Zeiger, unterbrechbare gedämpfte Bewegungen im 3D-Modell, Pause-Knopf für die Wasserweg-Schleife, sanftes Scrollen zum Formular nur ohne `prefers-reduced-motion`.
- **GSAP (offizielle Skills):** `useGSAP` mit Scope und automatischem Aufräumen, ScrollTrigger nur auf der Timeline, `gsap.matchMedia` für Bildschirmgrößen und reduzierte Bewegung, keine Marker im Code.
