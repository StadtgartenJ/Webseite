# Conversion-Audit (v4, heuristisch)

Ziel: mehr **echte** Wartelisten-Anmeldungen (Double-Opt-in), ohne Vertrauen zu verspielen. Das Audit ist heuristisch, nicht gemessen; Messwerte gibt es erst mit echten Besucherdaten (siehe Hypothesen unten).

## Befunde und Maßnahmen

| Bereich | Befund | Maßnahme in v4 |
| --- | --- | --- |
| **Formular funktioniert nicht** | Ohne `WAITLIST_ENDPOINT` nimmt das Formular keine Adressen an (es sagt das offen). Das ist die größte Bremse. | Nicht im Code lösbar: Brevo und Cloudflare Worker einrichten und die Variable setzen (siehe `waitlist-worker/README.md`). **Launch-Voraussetzung.** |
| Erster Bildschirm (Desktop) | Überschrift, Versprechen, Formular und Produkt sind sofort sichtbar; der Text liegt auf der ruhigen, hellen Wand, das Produkt bleibt frei. | Beibehalten. |
| Erster Bildschirm (Handy) | Vorher war der Kasten unten angeschnitten, weil die Textfläche über dem Bild lag. | Eigener Handy-Ausschnitt aus der Nahaufnahme: ganzes Produkt mit Stange und Halterungen im Bild. Auf kurzen Handys (360 × 740) ist das Bild flacher, damit der Button im ersten Bildschirm bleibt. Geprüft: Button-Unterkante 836 px bei 844 px (390 px breit), bei 360 × 740 innerhalb des Bildschirms. |
| CTA-Sprache | Überall „Auf die Warteliste“ | Beibehalten. Kontrast: Wald auf Elfenbein 10,8 : 1, Wald auf Lime 9,1 : 1. |
| Formular-Reibung | Ein Feld, sichtbares Label, 64 px hoch, Honeypot statt Captcha | Beibehalten. |
| Zustände | Leer, ungültig, „Fast geschafft!“ (nur nach Serverbestätigung), „Schon dabei“, allgemeiner Fehler | Erneut getestet, siehe Testprotokoll. |
| Glaubwürdigkeit Technik | Der 3D-Erkunder wirkte künstlich (Pflanzen, Licht) und schwächte das hochwertige Bild der Fotos. | Ersetzt durch vier hochwertige Konzeptbilder mit kurzen Erklärungen. Der Hinweis „Konzeptionelle Darstellung · Produkt in Entwicklung“ bleibt sichtbar. |
| Ladezeit | Der Erkunder brachte three.js, React Three Fiber und GSAP mit. | Entfällt. Erstladung JS 160 → 108 kB laut Build. |
| Vertrauen | Entwicklungshinweis im Hero, im Technik-Bild und im Footer; Datenschutz-Link am Formular. | Beibehalten. **Impressum und Datenschutz enthalten noch Platzhalter → Launch-Voraussetzung.** |
| Aussagen | Keine Preise, Termine, Tage ohne Gießen, Sicherheitsversprechen. „Soll“ und „geplant“ bei allen ungeprüften Funktionen. | Beibehalten. Formulierungen aus dem Storyboard wie „Speicher für mehrere Tage“ bewusst nicht übernommen. |

## Hypothesen für spätere A/B-Tests

Erst sinnvoll, wenn die Warteliste läuft und eine datensparsame Messung vorhanden ist (z. B. serverseitige Zählung der Anmeldungen je Variante, ohne Cookies).

1. **Hero-Bild:** Nahaufnahme ohne Fenster (Produkt größer) gegen das Fensterbild mit Abendlicht. Erwartung: Die Nahaufnahme erklärt das Produkt schneller, das Fensterbild verkauft das Gefühl besser.
2. **Vertrauen am Hero-Formular:** Der Zusatz „Nur Updates zum Produkt. Jederzeit abmeldbar.“ direkt unter dem Button (heute nur am Abschlussformular).
3. **Mehrwert der Anmeldung:** Ein echtes, einlösbares Versprechen wie „Du erfährst Preis und Starttermin vor allen anderen.“ – nur, wenn es so kommt.
4. **Abschluss mit Produktbild:** Das Abschlussformular neben einem Produktbild statt auf reinem Grün.
5. **Technik-Abschnitt kürzer:** drei statt vier Stationen (ohne Montage, die schon bei den Vorteilen vorkommt).
