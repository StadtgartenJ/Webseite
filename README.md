# Stadtgarden – Pre-Launch-Website

Einseitige Website für einen Pflanzkasten, der vor dem Fenster hängt. Ziel: Interesse sammeln über eine Warteliste mit Double-Opt-in. **Das Produkt ist in Entwicklung**; alle Bilder sind Konzeptvisualisierungen, das 3D-Modell ist ein prozedurales Konzeptmodell, keine Konstruktion.

- **Stack:** Next.js 15 (statischer Export), React 19, TypeScript, plain CSS mit Design-Tokens, React Three Fiber + Drei für das 3D-Modell
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

## Aufbau

```
app/
  page.tsx               Startseite: Hero, Konzept, Details, 3D, Mehr Grün, Warteliste
  impressum/ datenschutz/ Rechtsseiten mit markierten Platzhaltern
  bestaetigt/            Ziel des Bestätigungslinks aus der Double-Opt-in-Mail
  globals.css            Designsystem (Tokens, Raster, Komponenten)
  fonts/                 Familjen Grotesk + Instrument Sans (SIL OFL), selbst gehostet
components/
  WaitlistForm.tsx       Formular mit Lade-, Fehler- und Erfolgszustand, Honeypot
  WordHighlight.tsx      Der eine Scroll-Moment der Seite (Satz wird Wort für Wort dunkel)
  explorer/              3D-Konzeptmodell
    PlanterScene.tsx       Szene, Bauteile, Wasserweg, Montage, Kamera
    geometry.ts            prozedurale Geometrie (Kapsel, Einsatz, Reservoir, Blätter)
    parts.ts               Texte zu Bauteilen und Ansichten
    ProductExplorer.tsx    Bedienoberfläche, Lazy Loading, Fallback
    CutawayFallback.tsx    statische Schnittzeichnung (ohne WebGL / beim Laden)
lib/waitlist.ts          Client-Adapter zum Wartelisten-Endpunkt
waitlist-worker/         serverseitiger Endpunkt (Cloudflare Worker)
assets-src/              Originalbilder; npm run images erzeugt public/images/
```

## Bilder austauschen

Neue Fotos nach `assets-src/` legen, Ausschnitte in `scripts/optimize-images.mjs` anpassen, `npm run images` ausführen. Es entstehen AVIF- und WebP-Varianten plus `public/og.jpg` für Link-Vorschauen.

## Veröffentlichen (GitHub Pages)

1. Im Repository unter **Settings → Pages → Build and deployment → Source** „GitHub Actions“ wählen.
2. Unter **Settings → Pages → Custom domain** `stadtgarden.de` eintragen, beim Domain-Anbieter die DNS-Einträge für GitHub Pages setzen, danach „Enforce HTTPS“ aktivieren.
3. Unter **Settings → Secrets and variables → Actions → Variables** `WAITLIST_ENDPOINT` anlegen (URL des Workers).
4. Jeder Push auf `main` baut und veröffentlicht die Seite (`.github/workflows/deploy.yml`).

## Vor dem öffentlichen Start (Launch-Blocker)

- [ ] **Impressum** vollständig ausfüllen (alle gelb markierten Felder).
- [ ] **Datenschutzerklärung** ergänzen und rechtlich prüfen lassen (Verantwortlicher, Drittlandübermittlung GitHub/Cloudflare, Anschrift Brevo, Stand).
- [ ] **Brevo** einrichten: Liste, Double-Opt-in-Vorlage, Absenderdomain, AV-Vertrag.
- [ ] **Worker** deployen, `WAITLIST_ENDPOINT` setzen, Anmeldung einmal komplett testen (Mail, Bestätigungslink, `/bestaetigt/`, Abmeldelink).
- [ ] Rate-Limiting-Syntax in `waitlist-worker/wrangler.toml` mit der aktuellen Cloudflare-Doku abgleichen.
- [ ] Wortzeichen und Favicon sind vorläufig; bei Bedarf durch das endgültige Logo ersetzen.
- [ ] Optional: echte Fotos eines Prototyps ergänzen; die jetzigen sind KI-Konzeptbilder in begrenzter Auflösung (größtes Bild 1122 px breit).

## Was bewusst nicht behauptet wird

Keine Angaben zu Preis, Termin, Maßen, Tagen ohne Gießen, Wetter- oder Absturzsicherheit, Schimmelfreiheit oder „passt in jedes Fenster“. Mechanismen sind als „soll“, „geplant“ oder „Konzept“ formuliert; im 3D-Bereich steht dauerhaft „Konzeptmodell, keine finale Konstruktion“, und der Wasserweg-Text nennt, wovon Feuchtigkeitsmanagement tatsächlich abhängt.

## Design-Notizen und Skill-Prüfungen

**Richtung:** warmes Weiß, Porzellan, Anthrazit, Waldgrün; Familjen Grotesk (schwedische Grotesk) für Überschriften, Instrument Sans für Text. Kapselförmige Buttons greifen die Produktform auf, Fotos bleiben rechteckig und architektonisch. Ein gemeinsames 12-Spalten-Raster, alle Splits teilen dieselbe Linie (Spalte 8).

**Taste Skill:** Seitentyp „product“ (physisches Produkt, Fotos führen). Palette und Schrift kommen aus dem Briefing statt aus dem Taste-Deal (Briefing hat Vorrang; der Deal schlug „moss-sand“ und Bricolage Grotesque vor, die eher verspielt wirken). Gedealter Moment: `word-highlight` im Konzept-Abschnitt. Hero tritt einmal beim Laden auf, sonst keine Scroll-Fades. Finish-Gate: `GATE: OPEN` nach drei Runden; offen sind vor allem Regeln zur exakten Bildschirmhöhe jedes Abschnitts (der 3D-Bereich ist bewusst länger) und Strukturerwartungen an Klassennamen des Taste-Kits (`header.nav`, `footer.closing`), die dieses Next.js-Projekt nicht verwendet. Begründete Ausnahmen stehen in `.taste-skill/waivers.json` (nicht im Repo, lokal).

**Impeccable (craft floor):** keine Kicker über Überschriften, keine Karten-Raster, keine Verläufe; Nummern 01–03 nur, weil das Briefing sie verlangt. Kontraste geprüft (Fließtext 6,6:1, Platzhalter 4,8:1, Text auf Waldgrün ≥ 5,3:1). Browserflächen gestaltet: Markierung, Cursorfarbe, Fokusring, Scrollbar, Unterstreichungen, tabellarische Ziffern. Zustände: Hover, Laden, Fehler, Erfolg, leer.

**Emil Kowalski (Bewegung):**

| Vorher (typisch) | Jetzt | Warum |
| --- | --- | --- |
| Fade-in bei jedem Abschnitt | nur Hero-Auftritt + ein Scroll-Moment | wird nicht abgenutzt, die Seite bleibt ruhig |
| `ease-in` / Standardkurven | `cubic-bezier(0.23, 1, 0.32, 1)` | sofortige Reaktion, klarer Auslauf |
| Buttons ohne Druckgefühl | `scale(0.97)` bei `:active`, 160 ms | das Interface „hört zu“ |
| Hover auch auf Touch | Hover nur unter `(hover: hover) and (pointer: fine)` | keine Fehlauslöser beim Tippen |
| Keyframes für 3D-Übergänge | gedämpfte, unterbrechbare Interpolation | Richtungswechsel ohne Ruck |
| Endlosanimation ohne Kontrolle | Wasserweg-Schleife ~3,4 s mit Pause-Knopf | Kontrolle bleibt bei der Person |
| volle Bewegung immer | `prefers-reduced-motion`: alles statisch, Partikel ruhen | Rücksicht auf Bewegungsempfindlichkeit |
