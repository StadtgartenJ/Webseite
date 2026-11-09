# Stadtgarden · Designsystem v5 „Botanical Premium“

Ziel: eine helle, warme, skandinavisch klare Marke für ein Wohnprodukt, keine Gartenmarkt-Optik. Das Produkt ist der Star, Farbe gibt Rhythmus, Text bleibt kurz.

## Farben

| Token | Wert | Rolle | Wo |
| --- | --- | --- | --- |
| `--cream` / `--ivory` | `#FFF9ED` Warm Cream | Hauptgrund, Flächen für Text, Karten | Kopfzeile, Hero-Textfläche (Handy), Vorteile, Textkarte im Lifestyle-Abschnitt |
| `--sage` / `--botanical-soft` | `#E5EED7` Soft Sage | sanfte Übergänge | Technik-Abschnitt mit 3D-Viewer, Hintergrund hinter dem Lifestyle-Foto |
| `--lime` | `#DCEB91` Fresh Lime | Energie: Buttons auf Grün, Unterzeile im Abschluss, Fokusringe auf Grün | Reveal-CTA, Formular-Button auf Wald, „Sei dabei …“ |
| `--forest` | `#173F35` Forest Green | Gewicht: Überschriften, Hauptbutton auf hellem Grund, Abschluss | Headlines, CTA, Warteliste |
| `--apricot` | `#F0AF76` Soft Apricot | sehr sparsam, nur Wärme-Akzente | Statuspunkt „In Entwicklung“, Hinweis-Schild im Viewer, „Sonne“ an der Lifestyle-Karte |
| `--ink` / `--ink-2` | `#202522` / `#4A514B` | Fließtext | überall |
| `--moss` | `#56663F` | Hintergrund des Studio-Produktbilds | nur Produkt-Reveal (die Farbe steckt im Bild) |

**Rhythmus der Seite:** Foto/Creme → Moos → Creme → Salbei → Foto → Wald. Nie zwei dunkle Abschnitte hintereinander, kein Abschnitt in reinem Weiß. Apricot nie für Text (Kontrast zu gering) und nie großflächig.

**Kontraste (WCAG):** Wald auf Creme 11 : 1; Wald auf Lime 9,1 : 1; Creme auf Wald 11 : 1; Tinte-2 auf Creme 7,8 : 1; Lime auf Wald 9,1 : 1.

## Typografie

- **Überschriften:** Bricolage Grotesque (variabel, selbst gehostet), optische Größe 56, normale Breite, Gewicht 560, Laufweite −0,024 bis −0,028 em. Nicht verdichtet.
- **Text:** Figtree, Fließtext 17 px, Lead 18–21 px, Zeilenhöhe 1,55–1,6, Zeilenlänge höchstens etwa 40 Zeichen bei Leads.
- **Sinnzeilen:** Zweiteilige Überschriften („Dein Fenster. / Dein Garten.“) brechen als `.l`-Spans mit `text-wrap: balance`, damit nie ein einzelnes Wort allein steht.
- **Größen:** Hero `clamp(3.1rem … 6.5rem)`, Display 1 `clamp(3rem … 6.25rem)`, Display 2 `clamp(2.25rem … 4.25rem)`.

## Formen und Flächen

- **Kapselmotiv** aus dem Produkt: Pill-Buttons mit „Füllstand“-Punkt, Abschnitte mit großen Radien (28 / 44 px), Wortmarke als kleine Kapsel mit Lime-Füllstand.
- **Bilder:** immer groß, mit Radius, keine Rahmen. Ein Abschnitt, ein Hauptbild.
- **Keine** Feature-Karten, Icon-Reihen, Versal-Labels oder Nummerierungen.

## Bewegung

- Ein Auftritt beim Laden (Hero), sonst Bewegung nur, wo sie etwas erklärt: schwebendes Produkt im Reveal, gedämpfte Teile im 3D-Viewer.
- Kurven: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` für Auftritte, `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)` für Bewegung auf dem Schirm. Buttons `scale(0.97)` beim Drücken, Hover nur bei feinem Zeiger.
- `prefers-reduced-motion`: keine Auftritte, keine Kamerafahrten, Wasserweg ohne Schleife.

## CTA-System

- Ein Text überall: **„Auf die Warteliste“**.
- Hauptbutton auf hellem Grund: Wald mit Lime-Punkt; auf dunklem Grund: Lime mit Wald-Punkt.
- Formular nur mit E-Mail-Feld, sichtbarem Label, 64 px hohen Feldern.
- Handy: schmale Leiste unten, nur wenn gerade kein anderer CTA und kein Formular zu sehen ist.

## Texte (Ton)

Warm, klar, selbstbewusst, ohne Startup-Floskeln. Ungeprüfte Funktionen immer mit „soll“, „geplant“ oder „Konzept“. Keine Zahlen zu Tagen ohne Gießen, keine Sicherheits- oder Nachhaltigkeitsversprechen.
