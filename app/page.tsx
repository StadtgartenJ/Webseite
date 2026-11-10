import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Picture } from "@/components/Picture";
import { WaitlistForm } from "@/components/WaitlistForm";
import { WaitlistLink } from "@/components/WaitlistLink";
import { ScrollFloat } from "@/components/ScrollFloat";
import { StickyCta } from "@/components/StickyCta";
import { ProductViewer } from "@/components/explorer/ProductViewer";

// v7: alle Produktbilder aus dem Blender-Mastermodell (blender/v6), siehe docs/stadtgarden-master-design.md
const SQUARE = { widths: [640, 900, 1200], width: 1200, height: 1200 };

export default function Home() {
  return (
    <>
      <SiteHeader overlay />
      <main id="inhalt">
        {/* 01 · Hero: das Gefühl zuerst */}
        <section id="hero" className="hero" aria-labelledby="hero-title">
          <div className="hero__media">
            <Picture
              name="v7-hero"
              widths={[960, 1440, 1920, 2560]}
              width={2560}
              height={1440}
              sizes="100vw"
              alt="Weißer Pflanzkasten mit Efeutute und Pfennigkraut steht auf dem Steinsims eines Altbaufensters, hinter ihm die Spannstange in der Laibung, warmes Nachmittagslicht mit Blattschatten auf der Fassade"
              className="hero__img"
              priority
              art={{ name: "v7-hero-phone", widths: [640, 960, 1280, 1600], media: "(max-width: 639px)", sizes: "100vw", width: 1600, height: 1200 }}
            />
          </div>
          <div className="wrap hero__content">
            <h1 id="hero-title" className="hero__title">
              <span className="line">
                <span style={{ "--i": 0 } as React.CSSProperties}>Dein Fenster.</span>
              </span>
              <span className="line">
                <span style={{ "--i": 1 } as React.CSSProperties}>Dein Garten.</span>
              </span>
            </h1>
            <div className="hero__text">
              <p className="hero__promise">
                <span className="l">Mehr Grün zu Hause.</span> <span className="l">Auch ohne Balkon.</span>
              </p>
              <p className="hero__lead">
                Ein neuer Platz für deine Pflanzen: direkt vor deinem Fenster. Mit minimalistischem Design, einer
                Montageidee ohne Bohren und einem durchdachten Bewässerungskonzept.
              </p>
            </div>
            <div className="hero__form">
              <WaitlistForm
                size="lg"
                inputId="hero-email"
                note={
                  <>
                    <span className="status-dot" aria-hidden="true" />
                    <strong>In Entwicklung.</strong> Kostenlos und unverbindlich vormerken.{" "}
                    <a className="link" href="/datenschutz/">
                      Datenschutz
                    </a>
                  </>
                }
              />
            </div>
          </div>
        </section>

        {/* 02 · Produkt-Reveal: die Verwandlung */}
        <section id="produkt" className="reveal" aria-labelledby="reveal-title">
          <div className="wrap reveal__grid">
            <div className="reveal__copy">
              <h2 id="reveal-title" className="display-2">
                <span className="l">Ein bisschen Natur.</span> <span className="l">Mitten in der Stadt.</span>
              </h2>
              <p className="reveal__text">
                Nicht jeder hat einen Balkon. Aber fast jedes Zuhause hat ein Fenster. Stadtgarden macht aus diesem Platz
                etwas Besonderes – mit einem Pflanzkasten, der genauso schön sein soll wie die Pflanzen darin.
              </p>
              <WaitlistLink className="btn btn--forest" inline />
            </div>
            <ScrollFloat className="reveal__product">
              <Picture
                name="v7-studio"
                widths={[640, 900, 1200, 1800]}
                width={1800}
                height={1200}
                sizes="(min-width: 1024px) 66vw, 110vw"
                alt="Der weiße Pflanzkasten mit Spannstange und zwei Bügeln steht im Studio vor salbeigrünem Hintergrund, bepflanzt mit Efeutute und Pfennigkraut, deren Ranken über die Kante hängen"
                className="reveal__img"
              />
            </ScrollFloat>
          </div>
        </section>

        {/* 03 · Vorteile: was er kann */}
        <section id="vorteile" className="benefits" aria-labelledby="benefits-title">
          <div className="wrap">
            <h2 id="benefits-title" className="display-2 benefits__title">
              <span className="l">Mehr Grün.</span> <span className="l">Weniger Aufwand.</span>
            </h2>

            <article className="benefit benefit--garden">
              <div className="benefit__media">
                <Picture
                  name="v7-seite"
                  widths={[640, 900, 1200, 1624]}
                  width={1624}
                  height={1900}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  alt="Seitlicher Blick in die Fensterlaibung: Der Pflanzkasten steht auf dem Sims, Ranken hängen über die Kante"
                  className="benefit__img"
                />
              </div>
              <div className="benefit__copy">
                <h3>Dein Garten beginnt am Fenster.</h3>
                <p>Ob Kräuter, Blumen oder hängendes Grün: Dein Fenster bekommt einen ganz neuen Platz für Pflanzen.</p>
              </div>
            </article>

            <article className="benefit benefit--mount">
              <div className="benefit__copy">
                <h3>Einspannen statt bohren.</h3>
                <p>
                  Eine dezente Spannstange mit zwei Halterungen soll die Montage an geeigneten Fenstern ermöglichen – ganz
                  ohne Bohrlöcher.
                </p>
              </div>
              <div className="benefit__media">
                <Picture
                  name="v7-montage"
                  widths={[640, 900, 1200, 1600]}
                  width={1600}
                  height={1120}
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  alt="Nahaufnahme der Halterung: Hinter dem Kasten liegt die weiße Spannstange in der Laibung, ein breiter Bügel läuft über die Stange, die Endkappe drückt gegen die Laibung"
                  className="benefit__img"
                />
              </div>
            </article>

            <article className="benefit benefit--water">
              <div className="benefit__media">
                <Picture
                  name="v7-anzeige"
                  {...SQUARE}
                  sizes="(min-width: 1024px) 46vw, 100vw"
                  alt="Nahaufnahme der mittig in die Schale eingelassenen Wasserstandsanzeige mit gedämpft aquafarbenem Wasser"
                  className="benefit__img"
                />
              </div>
              <div className="benefit__copy">
                <h3>Weniger gießen. Mehr genießen.</h3>
                <p>
                  Ein integriertes Wasserreservoir und die geplante Kapillarbewässerung sollen deine Pflanzen länger mit
                  Feuchtigkeit versorgen.
                </p>
                <WaitlistLink className="btn btn--forest" inline />
              </div>
            </article>
          </div>
        </section>

        {/* 04 · Technik: ein zusammenhängender Ablauf – Schnittbild, Viewer, Details auf Wunsch */}
        <section id="so-funktionierts" className="inside" aria-labelledby="inside-title">
          <div className="wrap">
            <div className="inside__head">
              <h2 id="inside-title" className="display-2">
                <span className="l">Sechs Teile.</span> <span className="l">Ein Prinzip.</span>
              </h2>
              <p>
                Hinter der klaren Form steckt eine einfache Idee: Wasser speichern und über Kapillarelemente zu den Wurzeln
                leiten. Entdecke, wie unser Konzept aufgebaut ist.
              </p>
            </div>

            <div className="inside__story">
              <figure className="inside__cut">
                <Picture
                  name="v7-schnitt"
                  widths={[800, 1200, 1600, 1920]}
                  width={1920}
                  height={1200}
                  sizes="(min-width: 1024px) 62vw, 100vw"
                  alt="Konzeptschnitt durch den Pflanzkasten: oben der schwarze Pflanzeinsatz mit Substrat und Wurzeln, darunter die gelochte Trennplatte, zwei Kapillardochte und das Wasserreservoir; in der Mitte die Wasserstandsanzeige"
                  className="inside__img"
                />
                <figcaption className="inside__badge">Konzeptionelle Darstellung<span className="inside__badge-more"> · Produkt in Entwicklung</span></figcaption>
              </figure>
              <div className="inside__flow">
                <h3>Der geplante Wasserweg.</h3>
                <ol>
                  <li>Unten speichert das Reservoir das Wasser.</li>
                  <li>Zwei Kapillardochte sollen es nach oben leiten.</li>
                  <li>Das Substrat nimmt die Feuchtigkeit auf.</li>
                </ol>
                <p className="inside__note">
                  Wie gut das im Alltag funktioniert, hängt auch von Erde, Pflanzen und Standort ab und muss sich in Tests
                  noch zeigen.
                </p>
              </div>
            </div>

            <ProductViewer />

            <details className="inside__more">
              <summary>Technik im Detail entdecken</summary>
              <ol className="inside__parts">
                <li>
                  <b>Außenschale</b> Weich gerundete Kapsel in Warmweiß. Vorne mittig eingelassen: das schmale Fenster für
                  den Wasserstand.
                </li>
                <li>
                  <b>Pflanzeinsatz</b> Herausnehmbar, mit Platz für Substrat und Wurzeln.
                </li>
                <li>
                  <b>Trennplatte</b> Gelocht, trennt Erde und Wasser.
                </li>
                <li>
                  <b>Kapillarelemente</b> Zwei Dochte sollen Feuchtigkeit aus dem Reservoir nach oben leiten.
                </li>
                <li>
                  <b>Wasserreservoir</b> Ein integrierter Speicher für die geplante passive Wasserversorgung.
                </li>
                <li>
                  <b>Halterung</b> Der Kasten steht auf dem Außensims. Eine Spannstange hinter dem oberen Kastenrand und
                  zwei breite Bügel sollen ihn in Position halten – ganz ohne Bohren.
                </li>
              </ol>
              <p className="inside__note">
                Alles hier ist ein Konzept. Haltekraft, Eignung für verschiedene Fenster und das Verhalten bei Wind und
                Wetter werden vor einem Verkauf geprüft.
              </p>
            </details>
          </div>
        </section>

        {/* 05 · Lifestyle */}
        <section id="alltag" className="city" aria-labelledby="city-title">
          <div className="city__media">
            <Picture
              name="v7-stadt"
              widths={[960, 1600, 2400]}
              width={2400}
              height={1600}
              sizes="100vw"
              alt="Helle Altbaufassade mit drei Fenstern im Nachmittagslicht; auf dem Sims des mittleren Fensters steht der weiße Pflanzkasten"
              className="city__img"
            />
          </div>
          <div className="wrap city__wrap">
            <div className="city__panel">
              <h2 id="city-title" className="display-2">
                <span className="l">Mach Platz</span> <span className="l">für mehr Grün.</span>
              </h2>
              <p>Ein bisschen Grün verändert den Blick nach draußen. Und vielleicht auch das Gefühl drinnen.</p>
            </div>
          </div>
        </section>

        {/* 06 · Warteliste: das Ziel der Seite */}
        <section id="warteliste" className="final" aria-labelledby="final-title">
          <div className="wrap final__grid">
            <figure className="final__media">
              <Picture
                name="v7-nah"
                widths={[800, 1200, 1600, 2000]}
                width={2000}
                height={1500}
                sizes="(min-width: 1024px) 42vw, 100vw"
                alt="Der weiße Pflanzkasten von rechts vorne: auf dem Fenstersims, voller Grün, im warmen Sonnenlicht"
                className="final__img"
              />
            </figure>
            <div className="final__copy">
              <h2 id="final-title" className="display-1 final__title">
                <span className="l">Hier wächst</span> <span className="l">etwas Neues.</span>
              </h2>
              <p className="final__sub">Sei dabei, wenn Stadtgarden startet.</p>
              <p className="final__text">
                Wir entwickeln einen neuen Platz für deine Pflanzen. Trag dich ein und erfahre als Erstes, wenn es
                Neuigkeiten gibt.
              </p>
              <div className="final__form">
                <WaitlistForm
                  tone="dark"
                  size="lg"
                  inputId="waitlist-email"
                  note={
                    <>
                      Kostenlos und unverbindlich. Nur Produktupdates. Jederzeit abmeldbar.{" "}
                      <a className="link" href="/datenschutz/">
                        Datenschutz
                      </a>
                    </>
                  }
                />
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <StickyCta />
    </>
  );
}
