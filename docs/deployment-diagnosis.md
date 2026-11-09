# Diagnose: GitHub-Pages-404 auf stadtgarden.de

Stand: 09.11.2026. Ermittelt ohne Admin-Zugang zum Repository: Repository-, Actions- und Deployment-Daten über die öffentliche GitHub-API, die Domain im eingebauten Browser auf dem Rechner, DNS über dns.google. Die Seite **Settings → Pages** selbst ist ohne Anmeldung nicht einsehbar.

## Ergebnis in einem Satz

DNS und Build sind in Ordnung. GitHub hat aber im Moment **keine Pages-Site, die die Domain `stadtgarden.de` beansprucht**. Deshalb liefert GitHub seine eigene Fehlerseite aus, nicht die Next.js-Seite.

## Belege

| Prüfung | Ergebnis |
| --- | --- |
| Aufruf `https://stadtgarden.de/` im Browser | HTTP 404, Titel „Site not found · GitHub Pages“, Text „There isn't a GitHub Pages site here.“ Das ist die **domainweite** Fehlerseite von GitHub. Ein Fehler in Next.js oder ein fehlendes `index.html` sähe anders aus: Dann käme unser eigenes `404.html` oder „File not found“. |
| DNS `stadtgarden.de` A | 185.199.108.153, .109.153, .110.153, .111.153 – die vier GitHub-Pages-Adressen, korrekt |
| DNS `stadtgarden.de` AAAA | nur 2606:50c0:8000::153 (GitHub empfiehlt alle vier oder keine; ist aber nicht die Ursache) |
| DNS `www.stadtgarden.de` | CNAME → `stadtgartenj.github.io.`, korrekt |
| GitHub-API `GET /repos/…/pages` | `404 Not Found` (unangemeldet; deutet darauf hin, dass gerade keine Pages-Site eingerichtet oder veröffentlicht ist) |
| Letzter Push auf GitHub | `feda5fd` „Version1“, 09.11. 11:11 UTC; danach keine Pushes, keine Workflow-Läufe, keine Deployments |
| Workflow „Website bauen und veröffentlichen“ (`deploy.yml`) | aktiv; letzter Lauf erfolgreich; Artefakt `github-pages` 1,9 MB = Inhalt von `out/` |
| Deployment `feda5fd` (Actions) | `success`, Umgebung `github-pages`, URL `http://stadtgarden.de/` (11:12:58 UTC) |
| Zweiter Workflow „pages build and deployment“ (Jekyll) | läuft **ebenfalls** bei jedem Push und deployt den Quellcode des Repos (Artefakt 6,2 MB) |

Kurz nach dem Push war die Seite erreichbar (die Version 1 war online). Seitdem gab es auf GitHub keinen neuen Lauf und kein neues Deployment. Die Seite ist also nicht durch einen Build oder Deploy kaputtgegangen, sondern durch eine **Änderung in den Pages-Einstellungen**. Infrage kommen: „Unpublish site“, Pages deaktiviert oder Custom Domain entfernt. Zum Abschalten der Seite hatte ich genau diesen Weg (Settings → Pages → Unpublish site) beschrieben. Welcher der drei Schalter es genau war, zeigt nur die Einstellungsseite.

## Zweites, unabhängiges Problem: zwei Deploy-Wege gleichzeitig

Bei jedem Push laufen zwei Deployments gegeneinander:

1. **„pages build and deployment“** (Jekyll, von GitHub automatisch). Er läuft, weil die Pages-Quelle auf **„Deploy from a branch“** steht. Er veröffentlicht den *Quellcode* des Repos, also kein `index.html` von Next.js.
2. **„Website bauen und veröffentlichen“** (unser `deploy.yml`) veröffentlicht das gebaute `out/`.

Online ist, wer zuletzt fertig wird. Bei Version 1 hat zufällig unser Workflow gewonnen (11:12:58 gegen 11:12:30). Gewinnt beim nächsten Push Jekyll, zeigt die Domain plötzlich ein README oder einen 404, obwohl alle Läufe grün sind. Genau dieses Muster („Actions erfolgreich, Seite 404“) entsteht dadurch.

Auch die Datei `CNAME` im Wurzelverzeichnis des Repos kam über diesen Branch-Modus: Commit „Create CNAME“ hat GitHub beim Eintragen der Domain angelegt. Bei Veröffentlichung über GitHub Actions bestimmt **nicht** diese Datei die Domain, sondern das Feld „Custom domain“ in den Einstellungen.

## Was im Repository geprüft wurde (in Ordnung)

- `next.config.mjs`: `output: "export"`, `trailingSlash: true`, `images.unoptimized: true`, **kein** `basePath`, **kein** `assetPrefix`. Für eine Apex-Domain ist das richtig; `basePath: "/Webseite"` wäre hier falsch.
- `deploy.yml`: `actions/upload-pages-artifact@v3` mit `path: out`, `actions/deploy-pages@v4`, Rechte `pages: write` und `id-token: write`, Umgebung `github-pages`. Es gibt keinen doppelten eigenen Workflow.
- Exportinhalt (lokal gebaut, siehe Testprotokoll): `index.html` im Wurzelverzeichnis, `404.html`, `impressum/index.html`, `datenschutz/index.html`, `bestaetigt/index.html`, `_next/static/…`, `images/…`, `og.jpg`, `robots.txt`, `sitemap.xml`, `CNAME`, `.nojekyll`. Alle Pfade beginnen mit `/`, Dateinamen nur in Kleinbuchstaben.

## Behebung (Einstellungen, nur durch dich möglich)

Unter github.com/StadtgartenJ/Webseite → **Settings → Pages**:

1. **Build and deployment → Source: „GitHub Actions“** auswählen (nicht „Deploy from a branch“). Damit verschwindet der Jekyll-Lauf und das Wettrennen.
2. **Custom domain:** `stadtgarden.de` eintragen und speichern. Den DNS-Check abwarten (grüner Haken).
3. Wenn oben „Your site is unpublished“ steht oder ein Knopf zum Veröffentlichen erscheint: neu veröffentlichen. Alternativ unter **Actions → „Website bauen und veröffentlichen“ → Run workflow** einen neuen Lauf starten. Jedes neue Deployment veröffentlicht die Seite wieder.
4. Sobald das Zertifikat bereit ist (meist Minuten, selten bis 24 h): **Enforce HTTPS** einschalten.
5. Empfohlen gegen Domain-Übernahme: Domain im Profil unter **Settings → Pages → Verified domains** verifizieren (TXT-Eintrag `_github-pages-challenge-StadtgartenJ`). Das ist eine DNS-Änderung und nur nach deiner Freigabe.

Eine DNS-Änderung ist für die Behebung **nicht** nötig. Optional: die drei fehlenden AAAA-Einträge (2606:50c0:8001::153, 8002::153, 8003::153) ergänzen. Auch das nur nach Freigabe.

## Änderungen im Repository

- Keine an Workflow oder `next.config.mjs` nötig; beides ist korrekt.
- `public/CNAME` und `public/.nojekyll` bleiben drin. Sie schaden nicht und sind nützlich, falls jemand wieder auf den Branch-Modus umstellt.
- Die `CNAME`-Datei im Wurzelverzeichnis des Repos kann bleiben. Sie wird im Actions-Modus ignoriert.

## So prüfst du die Behebung

1. Settings → Pages zeigt „Your site is live at https://stadtgarden.de/“.
2. Actions: Pro Push läuft nur noch **ein** Workflow („Website bauen und veröffentlichen“), kein „pages build and deployment“ mehr.
3. `https://stadtgarden.de/` zeigt „Dein Fenster. Dein Garten.“; `https://stadtgarden.de/impressum/` und `/datenschutz/` laden auch beim Neuladen; `https://www.stadtgarden.de/` leitet auf die Apex-Domain um.
4. Im Browser lädt `/_next/static/…` ohne 404 (Entwicklertools → Netzwerk).

## Noch offene Unsicherheit

Ohne Einsicht in Settings → Pages lässt sich nicht unterscheiden, ob die Site „unpublished“, Pages ganz deaktiviert oder nur die Custom Domain entfernt wurde. Die Schritte 1–3 oben decken alle drei Fälle ab.
