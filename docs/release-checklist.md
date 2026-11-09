# Release-Checkliste v5

Reihenfolge: erst alles unter **A** (Freigabe und Recht), dann **B** (Warteliste), dann **C** (Veröffentlichen). Nichts davon passiert automatisch.

## A · Freigabe und Pflichtangaben

- [ ] v5 auf dem Branch `v5-botanical` angesehen (lokal: `npm ci && npm run build && npx serve out`) und freigegeben
- [ ] **Impressum** (`app/impressum/page.tsx`), alle Platzhalter ersetzen:
  - [ ] Name bzw. Firma mit Rechtsform
  - [ ] Straße, Hausnummer, PLZ, Ort (ladungsfähige Anschrift, kein Postfach)
  - [ ] bei Gesellschaften: vertretungsberechtigte Person(en)
  - [ ] E-Mail-Adresse
  - [ ] zweiter schneller Kontaktweg (Telefon oder Kontaktformular)
  - [ ] falls vorhanden: Registergericht und -nummer, USt-IdNr.
  - [ ] verantwortlich für den Inhalt nach § 18 Abs. 2 MStV: Name und Anschrift
  - [ ] vor Verkaufsstart: Angabe zur Verbraucherstreitbeilegung (VSBG)
- [ ] **Datenschutzerklärung** (`app/datenschutz/page.tsx`):
  - [ ] Verantwortlicher: Name, Anschrift, E-Mail für Datenschutzanfragen
  - [ ] Rechtsgrundlage und Garantien für eine mögliche Drittlandübermittlung (Cloudflare, ggf. GitHub)
  - [ ] Anschriften der Anbieter, AV-Verträge mit Brevo und Cloudflare abgeschlossen
  - [ ] Datum der Fassung
- [ ] Rechtliche Prüfung durch eine fachkundige Person (die Texte sind Vorlagen, keine Rechtsberatung)
- [ ] Danach: Keine sichtbaren gelben Platzhalter mehr auf `/impressum/` und `/datenschutz/`

Die Website erfindet keine Betreiberdaten. Solange Platzhalter drin sind, ist die Seite **nicht** veröffentlichungsreif.

## B · Warteliste scharf schalten

- [ ] Brevo: Konto, verifizierte Absenderdomain, Liste „Warteliste“, Double-Opt-in-Vorlage, API-Schlüssel, AVV (Details: `waitlist-worker/README.md`)
- [ ] Cloudflare Worker: `BREVO_API_KEY` als Secret, `BREVO_LIST_ID` und `BREVO_DOI_TEMPLATE_ID` in `wrangler.toml`, `npx wrangler deploy`
- [ ] Worker-Antwort prüfen: neue **und** bekannte Adresse liefern beide `{"status":"pending"}` (keine Auskunft, wer eingetragen ist)
- [ ] GitHub → Settings → Secrets and variables → Actions → **Variables**: `WAITLIST_ENDPOINT` = Worker-URL (kein Secret nötig; der Schlüssel bleibt im Worker)
- [ ] Bestätigungsmail kommt an, Link führt auf `/bestaetigt/`, Kontakt steht danach in der Liste
- [ ] Abmeldelink in der Mail funktioniert

## C · Veröffentlichen

- [ ] Branch `v5-botanical` committen, pushen, in `main` übernehmen (nur nach ausdrücklicher Freigabe)
- [ ] GitHub → Settings → Pages: Source = **GitHub Actions**, Custom domain = `stadtgarden.de` (siehe `docs/deployment-diagnosis.md`)
- [ ] Nur **ein** Workflow pro Push („Website bauen und veröffentlichen“)
- [ ] **Enforce HTTPS** einschalten, sobald das Zertifikat bereit ist
- [ ] Live prüfen: Startseite, `/impressum/`, `/datenschutz/`, `/bestaetigt/`, Neuladen auf Unterseiten, `www` leitet um
- [ ] 3D-Viewer live auf einem echten Handy (iOS Safari, Android Chrome) und einem Laptop: Laden, Drehen, vier Ansichten, Bildrate
- [ ] Formular live mit einer eigenen Adresse

## D · Aufräumen bei GitHub (optional, aus der Verlaufsbereinigung)

- [ ] Umgebung `github-pages` mit den alten Deployments löschen, falls noch sichtbar (Settings → Environments). Sie wird beim nächsten Deploy neu angelegt.
- [ ] Der alte Commit `feda5fd` (mit dem früheren Autorenprofil) ist nur über eine Anfrage beim GitHub-Support endgültig zu entfernen (Cached views / „Remove sensitive data“). Die Contributor-Anzeige aktualisiert GitHub selbst, das kann Tage dauern.

## Nicht Teil dieses Releases

- DNS-Änderungen (z. B. fehlende AAAA-Einträge, Domain-Verifizierung): nur nach gesonderter Freigabe
- Analyse-Tools, Cookies, Tracking: keine
