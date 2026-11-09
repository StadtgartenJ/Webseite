# Wartelisten-Endpunkt

Ein kleiner Cloudflare Worker zwischen der statischen Website und Brevo (E-Mail-Dienst mit Sitz in Frankreich).
Er prüft die Adresse, bremst Bots (Honeypot, Mindestzeit, Rate Limit pro IP) und startet das Double-Opt-in.
Brevo speichert die Adressen, verschickt die Bestätigungsmail und kümmert sich um Abmeldelinks.

## Einrichtung (einmalig, ca. 30 Minuten)

1. **Brevo**
   - Konto anlegen, Absenderadresse und Domain (stadtgarden.de) verifizieren.
   - Unter *Kontakte → Listen* eine Liste „Warteliste“ anlegen, ID notieren.
   - Unter *Vorlagen* eine Double-Opt-in-Vorlage anlegen (Text mit Bestätigungsbutton `{{ doubleoptin }}`), ID notieren.
   - Unter *SMTP & API → API-Schlüssel* einen Schlüssel erzeugen.
   - Auftragsverarbeitungsvertrag (AVV) mit Brevo abschließen.
2. **Cloudflare**
   - Konto anlegen, dann in diesem Ordner:
     ```bash
     npm install -g wrangler        # oder npx wrangler …
     npx wrangler login
     npx wrangler secret put BREVO_API_KEY
     ```
   - In `wrangler.toml` `BREVO_LIST_ID` und `BREVO_DOI_TEMPLATE_ID` eintragen.
   - `npx wrangler deploy` – die ausgegebene URL (z. B. `https://stadtgarden-warteliste.<konto>.workers.dev`) notieren.
   - Optional eine eigene Route wie `https://api.stadtgarden.de/warteliste` einrichten.
3. **Website**
   - Im GitHub-Repository unter *Settings → Secrets and variables → Actions → Variables* die Variable
     `WAITLIST_ENDPOINT` mit der Worker-URL anlegen. Der nächste Deploy schaltet das Formular scharf.

## Testen

```bash
curl -X POST "$URL" -H "Origin: https://stadtgarden.de" -H "Content-Type: application/json" \
  -d '{"email":"du@beispiel.de","company":"","elapsedMs":5000}'
```

Erwartet: `{"status":"pending"}` und eine Bestätigungsmail. Erst nach dem Klick steht die Adresse auf der Liste.
