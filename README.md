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

## Seitenaufbau und Text

Die Reihenfolge folgt der Positionierung: Gefühl → Alltag → Funktion → Technik → Einladung.

| Abschnitt | Grund | Überschrift | Inhalt |
| --- | --- | --- | --- |
| Hero | Foto (Goldene Stunde) | „Dein Fenster. Dein Garten.“ | Versprechen „Mehr Grün für dein Zuhause – auch ohne Balkon.“, Formular direkt im Hero, Hinweis „In Entwicklung.“ |
| Reveal | Moos, Studiolicht | „Ein kleines Stück Natur. Mitten in der Stadt.“ | freigestelltes Produkt größer als der Text, zweite CTA |
| Vorteile | Elfenbein | „Kleine Idee. Großer Unterschied.“ | drei asymmetrische Kompositionen: Fenster mit Pflanzen · Klemm-Detail · Schnittbild mit Sichtfenster-Ausschnitt und CTA |
| Technik | Botanik-Hellgrün | „Schön durchdacht. Bis ins Innere.“ | Scroll-Film: die 3D-Bühne bleibt stehen, der Kasten öffnet sich beim Scrollen, Wasserweg, setzt sich wieder zusammen. Danach Tabs Produkt / Innenleben / Wasserweg / Montage zum Selbsterkunden |
| Alltag | Fassade vollflächig | „Die Stadt ist grau genug.“ | ruhige Textkarte über dem Foto |
| Warteliste | Waldgrün | „Bald wächst hier etwas.“ | Formular, „Nur Updates zum Produkt. Jederzeit abmeldbar.“ |

**CTA-System:** überall derselbe Text „Auf die Warteliste“ (Hero, Reveal, Vorteile, Abschluss, Kopfzeile am Desktop, Handy-Leiste). Jeder CTA-Link setzt den Cursor direkt ins nächste E-Mail-Feld. Die Handy-Leiste unten erscheint nur, wenn gerade kein anderer CTA und kein Formular im Bild ist. Keine Pop-ups.

**Formularzustände:** Leer und ungültig (am Feld), „Fast geschafft!“ (nur wenn der Server bestätigt, dass die Bestätigungsmail rausging), „Schon dabei“ (Adresse bereits eingetragen oder unbestätigt), ein allgemeiner Fehlertext für alles andere. Ohne konfigurierten Endpunkt sagt das Formular offen, dass die Warteliste noch keine Adressen annimmt.

## Designsystem

- **Farben:** Wald `#173F35`, Moos `#56663F`, Botanik `#C5DBAC` / hell `#E2EBD3`, Elfenbein `#F7F6EF`, Lime `#DCEB91` (Akzent und CTA auf Grün), Tinte `#202522`. Alle Tokens oben in `app/globals.css`.
- **Schrift:** Bricolage Grotesque (Überschriften, optische Größe 56, normale Breite, Gewicht 560) und Figtree (Text, Fließtext ab 17 px). Beide selbst gehostet, SIL OFL. Überschriften brechen nach Sinnzeilen (`.l`-Spans mit `text-wrap: balance`).
- **Formmotiv:** die Kapsel des Produkts. Pill-Buttons mit einem „Füllstand“-Punkt, der beim Hover steigt; Abschnitte mit kapselförmig gerundeten Kanten.
- **Bewegung:** ein Auftritt beim Laden (Bild setzt sich, Zeilen steigen aus einer Maske), das schwebende Produkt im Reveal und der Scroll-Film im Technik-Abschnitt. Unter `prefers-reduced-motion` gibt es keinen Film und keine Kamerafahrt, nur die Tabs.

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
  explorer/              3D-Konzeptmodell (Szene, Geometrie, Texte, Fallbacks)
    film.ts              Drehbuch des Scroll-Films: Schlüsselwerte für Bauteile, Kamera, Schnitt, Wasser, Beschriftungen
    ProductExplorer.tsx  GSAP-Timeline + ScrollTrigger (pin, scrub), Kapiteltexte, Übergabe an die Tabs
    PlanterScene.tsx     R3F-Szene; liest den Film-Zustand oder die Tabs, schreibt als Einzige die Transformationen
lib/waitlist.ts          Client-Adapter zum Wartelisten-Endpunkt
waitlist-worker/         serverseitiger Endpunkt (Cloudflare Worker)
assets-src/v2/           Original-Bilder; npm run images erzeugt public/images/
docs/bilder.md           Bildinventar, fehlende Motive, fertige Prompts
```

## Scroll-Film (GSAP ScrollTrigger + React Three Fiber)

- **Ablauf (0–100 % des Scrollwegs):** Produkt, Kamera fährt näher → Klemmsystem und Pflanzeinsatz heben ab → Trennplatte, Kapillarelemente, Reservoir und Außenschale trennen sich, alle Teile beschriftet → Einsatz sitzt auf, Schnitt öffnet sich, Tropfen steigen in den Kapillarelementen → alles setzt sich zusammen → Kamera zurück in die Produktansicht, die Bühne gibt die Seite frei.
- **Eine Quelle je Wert:** GSAP schreibt nur in ein Zustandsobjekt (`film.ts`), die Szene liest es und setzt als Einzige die Three.js-Transformationen. Alle Spuren sind `fromTo`-Ketten mit festen Start- und Endwerten, deshalb ist jede Scrollposition eindeutig – auch beim Zurückscrollen oder Springen.
- **Bildaufbau:** In beschrifteten Phasen berechnet die Kamera Abstand und Bildausschnitt so, dass das Modell neben der Beschriftungsspalte und dem Kapiteltext Platz hat (Desktop, Tablet, Handy).
- **Übergabe:** Am Ende steht die Kamera exakt in der Ansicht des Tabs „Produkt“; ab dort übernehmen die Tabs. Scrollt man zurück, übernimmt wieder der Film. „Überspringen“ springt ans Ende.
- **Bildschirme:** eigener Scrollweg je Größe (`gsap.matchMedia`), auf dem Handy kompaktere Beschriftungen und Kapiteltext unter der Szene.
- **Schonung:** schwächere Geräte rendern mit weniger Pixeln, kleineren Schatten und weniger Tropfen. Bei „Bewegung reduzieren“ kein Pin, keine Kamerafahrt.
- **Anpassen:** Zeiten und Werte stehen in `components/explorer/film.ts` (Zeitachse 0–10).

## Veröffentlichen (GitHub Pages)

1. **Settings → Pages → Source:** „GitHub Actions“.
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
- **Emil Kowalski:** ease-out für Auftritte, Buttons `scale(0.97)` beim Drücken, Hover nur bei feinem Zeiger, unterbrechbare gedämpfte Bewegungen im 3D-Modell, Pause-Knopf für die Wasserweg-Schleife, sanftes Scrollen zum Formular nur ohne `prefers-reduced-motion`. Im Scroll-Film: Zweck „Erklärung“, Bewegung im Bild mit ease-in-out, Beschriftungen zeichnen erst die Linie und heben dann den Text.
- **GSAP (offizielle Skills):** `useGSAP` mit Scope und automatischem Aufräumen, ScrollTrigger nur auf der Timeline, `gsap.matchMedia` für Bildschirmgrößen und reduzierte Bewegung, keine Marker im Code.
