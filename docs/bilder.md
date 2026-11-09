# Bildinventar und Bildplan

Alle Produktbilder sind **KI-generierte Konzeptvisualisierungen**, keine Fotos eines Prototyps. Die Website sagt das im Footer. Originale liegen in `assets-src/v2/`, optimierte AVIF/WebP-Varianten erzeugt `npm run images` nach `public/images/`.

## Produkt-Steckbrief (für jedes neue Bild gleich halten)

- **Form:** lange, weiche Kapsel; oben gerade offen, Seiten und Boden stark gerundet; Verhältnis Breite zu Höhe etwa 2,8 : 1
- **Material:** mattes bis seidenmattes Warmweiß (etwa #F3F1EA), keine Hochglanzreflexe, keine Logos
- **Front:** ein schmales, senkrechtes Sichtfenster in Kapselform, mittig, darin blaues Wasser auf etwa halber Höhe
- **Montage:** weiße Klemmstange (etwa 25 mm) zwischen den Seitenwänden der Fensterlaibung, runde weiße Endkappen, zwei flache weiße Bandhaken laufen über die Stange in den Kasten
- **Position:** vor der Scheibe, knapp über der äußeren Fensterbank
- **Bepflanzung:** goldene Efeutute (gelbgrün panaschiert) links und überhängend, rechts eine kleinblättrige Hängepflanze (etwa Pfennigkraut)

## Vorhandene Bilder

| Datei (`assets-src/v2/`) | Größe | Motiv | Einsatz auf der Seite | Bewertung |
| --- | --- | --- | --- | --- |
| `hero-wide.png` | 1672 × 941 | Kasten am Fenster, Goldene Stunde | Hero Desktop, Ausschnitt `hero-mobile` für Handy/Tablet, Link-Vorschau | Stärkstes Bild. Für 2×-Displays auf 1440 px etwas weich. |
| `studio-float.png` | 1122 × 1402 | Freigestellt auf Moosgrün | Produkt-Reveal | Sehr gut. Zeigt J-Haken ohne Stange (weicht von der Montage ab). |
| `window-plants.png` | 1122 × 1402 | Kasten im Fenster, Hochformat | Vorteil „Dein Garten beginnt am Fenster.“ | Gut. |
| `mount-detail.png` | 1122 × 1402 | Stange, Endkappe, Bandhaken | Vorteil „Einspannen statt bohren.“ (Querformat-Ausschnitt) | Gut, Geometrie stimmig. |
| `macro-gauge.png` | 1122 × 1402 | Makro Sichtfenster | Ausschnitt im Vorteil „Weniger gießen. Mehr genießen.“ | Sehr gut. |
| `cutaway.png` | 1122 × 1402 | Schnitt am Fenster mit Dochten | Vorteil „Weniger gießen. Mehr genießen.“ | Gut; als Konzept klar erkennbar. |
| `exploded.png` | 1122 × 1402 | Explosionsansicht auf Salbeigrün | Ersatzbild, wenn der Browser kein 3D kann | Gut. J-Haken wie im Studiobild. |
| `facade.png` | 1536 × 1024 | Pariser Fassade, Kasten am Fenster | „Die Stadt ist grau genug.“ (vollflächig) | Sehr stimmungsvoll; vollflächig auf großen Bildschirmen leicht weich. |

Nicht mehr verwendet und löschbar: `assets-src/hero-window.png`, `assets-src/concept-sheet.png` sowie in `public/images/` alle Dateien, die mit `hero-window-`, `daylight-`, `detail-`, `window-light-` oder `trailing-` beginnen. Ebenso `app/fonts/FamiljenGrotesk-Variable.woff2`, `app/fonts/InstrumentSans-Variable.woff2` und ihre Lizenzdateien sowie `components/Chapters.tsx` (seit Version 3 ungenutzt).

## Was noch fehlt

1. **Hero in höherer Auflösung** (mindestens 2880 px breit) plus eigenes Hochformat fürs Handy.
2. **Studio- und Explosionsbild mit derselben Montage** (Bandhaken an Stange statt J-Haken), damit das Produkt überall identisch aussieht.
3. **Fassade in höherer Auflösung** (mindestens 2560 px breit).
4. Sobald es einen Prototyp gibt: echte Fotos, mindestens Hero, Montage und Sichtfenster.

Ein Bildgenerator stand in dieser Sitzung nicht zur Verfügung. Die folgenden Prompts sind für Midjourney, Firefly, Imagen oder ähnliche Werkzeuge geschrieben. Am besten jeweils eines der vorhandenen Bilder als Strukturreferenz mitgeben (Bild-zu-Bild oder „Style/Structure Reference“).

## Prompts

Gemeinsamer Produktblock (in jeden Prompt einsetzen):

> a long capsule-shaped window planter in matte warm-white plastic (#F3F1EA), straight open top, strongly rounded sides and bottom, width-to-height ratio about 2.8:1, one slim vertical pill-shaped water-level window centred on the front showing blue water at half height, no logos, no screws; mounted with a slim white tension rod pressed between the two side walls of the exterior window reveal, round white end caps, two flat white strap hooks looping over the rod into the planter; planted with golden pothos (yellow-green variegated) trailing over the left edge and a fine small-leaved trailing plant (creeping jenny) on the right

**1 · Hero Desktop (16:9, 2880 × 1620 oder größer)**
> photorealistic architectural product photograph, [PRODUKTBLOCK], installed outside a tall white-framed window of a renovated European apartment building, just above the stone window sill, golden-hour sunlight from the left, soft leaf shadows on warm plaster wall occupying the left 45% of the frame as calm negative space, three-quarter view from slightly below eye level, 50mm lens, shallow depth of field on the street behind the glass, premium campaign look, natural colours, no people, no text

**1b · Hero Handy (4:5, 1600 × 2000)**
> same scene and lighting as the desktop hero, vertical composition, the planter fills the lower two thirds of the frame, window glass with soft reflections above, calm area at the top for the headline, [PRODUKTBLOCK]

**2 · Studio freigestellt (4:5, 2400 × 3000)**
> high-end catalogue product photograph, [PRODUKTBLOCK], the tension rod and strap hooks included and floating above the planter at the correct height, isolated on a soft moss-green studio backdrop (#56663F to #8C9865 gradient), large softbox from upper left, subtle rim light, gentle contact shadow below, satin material with controlled reflections, perfectly symmetric geometry

**3 · Makro Sichtfenster (4:5)**
> extreme close-up macro photograph of the front of [PRODUKTBLOCK], the slim water-level window with blue water and a soft meniscus, fine matte surface texture, a golden pothos leaf crossing the top edge, warm morning light with leaf shadows, 100mm macro lens, f/4

**4 · Montage (4:5)**
> detailed product photograph of the mounting system of [PRODUKTBLOCK]: the tension rod's round white end cap pressed flat against the textured plaster of the window reveal, one strap hook looping cleanly over the rod down into the planter rim, correct mechanical geometry, the rod clearly spans between the reveal walls, soft daylight, shallow depth of field

**5 · Schnittbild (4:5) – als Konzept kennzeichnen**
> photorealistic technical cutaway render of [PRODUKTBLOCK] mounted at a window, the front quarter of the shell cut away to reveal: a removable dark planting insert with soil and roots and ventilation slots, a white perforated separation plate below it, two white fabric wicks reaching down into a translucent water reservoir at the bottom, small blue arrows on the wicks showing water moving upwards, the water-level window aligned with the reservoir, clean edges, soft daylight, conceptual engineering illustration

**6 · Fassade / Alltag (3:2, 2880 × 1920)**
> cinematic street photograph of a bright European apartment facade with stone details, tall windows and street trees, late-afternoon sun, one window on the first floor has [PRODUKTBLOCK] installed outside, believable scale (about 80 cm wide), the planter is the clear focal point but integrated naturally, no people, no cars in focus

**7 · Pflanzen-Detail (4:5)**
> close-up of lush golden pothos cascading over the rounded edge of [PRODUKTBLOCK], real leaf texture with fine veins and natural imperfections, backlit golden light through the leaves, the curved white shell in soft focus, tactile and calm, editorial botanical photography

**Negativ-Prompt (falls unterstützt):**
> glossy cheap plastic, melted or changing geometry, extra rods, metal brackets drilled into the wall, screws, inconsistent hooks, plastic-looking plants, text, logos, watermark, distorted windows, people
