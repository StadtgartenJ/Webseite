import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Picture } from "@/components/Picture";
import { WaitlistForm } from "@/components/WaitlistForm";
import { WaitlistLink } from "@/components/WaitlistLink";
import { ScrollFloat } from "@/components/ScrollFloat";
import { StickyCta } from "@/components/StickyCta";
import { ProductExplorer } from "@/components/explorer/ProductExplorer";

const PORTRAIT = { widths: [640, 900, 1122], width: 1122, height: 1402 };

export default function Home() {
  return (
    <>
      <SiteHeader overlay />
      <main id="inhalt">
        {/* 01 · Hero: das Gefühl zuerst */}
        <section id="hero" className="hero" aria-labelledby="hero-title">
          <div className="hero__media">
            <Picture
              name="hero-wide"
              widths={[960, 1440, 1672]}
              width={1672}
              height={941}
              sizes="100vw"
              alt="Weißer Pflanzkasten mit Efeutute hängt an einer Spannstange vor einem Altbaufenster, warmes Abendlicht fällt auf die Fassade"
              className="hero__img"
              priority
              art={{ name: "hero-mobile", widths: [600, 910], media: "(max-width: 639px)", sizes: "100vw", width: 910, height: 941 }}
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
                <span className="l">Mehr Grün für dein Zuhause –</span> <span className="l">auch ohne Balkon.</span>
              </p>
              <p className="hero__lead">
                Entdecke einen Pflanzkasten, der sich ohne Bohren am passenden Fenster befestigen lässt und mit einem
                durchdachten Bewässerungskonzept das Gießen erleichtern soll.
              </p>
            </div>
            <div className="hero__form">
              <WaitlistForm
                size="lg"
                inputId="hero-email"
                note={
                  <>
                    <strong>In Entwicklung.</strong> Erfahre als Erstes vom Launch.{" "}
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
                <span className="l">Ein kleines Stück Natur.</span> <span className="l">Mitten in der Stadt.</span>
              </h2>
              <p className="reveal__text">
                Wenig Platz, große Ideen. Unser Fensterpflanzkasten verbindet zeitloses Design mit einer cleveren
                Befestigung und einer neuen Art der Pflanzenversorgung. Für alle, die sich ein bisschen mehr Grün wünschen.
              </p>
              <WaitlistLink className="btn btn--lime" inline />
            </div>
            <ScrollFloat className="reveal__product">
              <Picture
                name="studio-float"
                {...PORTRAIT}
                sizes="(min-width: 1024px) 66vw, 110vw"
                alt="Der weiße Pflanzkasten mit Efeutute und feinen Hängepflanzen, freigestellt vor sattgrünem Hintergrund"
                className="reveal__img"
              />
            </ScrollFloat>
          </div>
        </section>

        {/* 03 · Vorteile: was er kann */}
        <section id="vorteile" className="benefits" aria-labelledby="benefits-title">
          <div className="wrap">
            <h2 id="benefits-title" className="display-2 benefits__title">
              <span className="l">Kleine Idee.</span> <span className="l">Großer Unterschied.</span>
            </h2>

            <article className="benefit benefit--garden">
              <div className="benefit__media">
                <Picture
                  name="window-plants"
                  {...PORTRAIT}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  alt="Pflanzkasten voller Efeutute und Pfennigkraut vor einem sonnigen Fenster, dahinter eine Altbaufassade"
                  className="benefit__img"
                />
              </div>
              <div className="benefit__copy">
                <h3>Dein Garten beginnt am Fenster.</h3>
                <p>Kein Balkon? Kein Problem. Nutze den Platz vor deinem Fenster für etwas, das wächst.</p>
              </div>
            </article>

            <article className="benefit benefit--mount">
              <div className="benefit__copy">
                <h3>Einspannen statt bohren.</h3>
                <p>
                  Ein dezentes Klemmsystem soll die Montage an geeigneten Fenstern ermöglichen – ohne Löcher in der Fassade.
                </p>
              </div>
              <div className="benefit__media">
                <Picture
                  name="mount-detail"
                  {...PORTRAIT}
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  alt="Nahaufnahme der Halterung: Ein weißes Band läuft über die Spannstange, deren rundes Endstück an der Laibung anliegt"
                  className="benefit__img"
                />
              </div>
            </article>

            <article className="benefit benefit--water">
              <div className="benefit__media">
                <Picture
                  name="cutaway"
                  {...PORTRAIT}
                  sizes="(min-width: 1024px) 46vw, 100vw"
                  alt="Konzeptschnitt durch den Kasten: Pflanzeinsatz mit Erde, gelochte Platte und zwei Kapillarelemente im Wasserreservoir"
                  className="benefit__img"
                />
                <div className="benefit__inset">
                  <Picture
                    name="macro-gauge"
                    {...PORTRAIT}
                    sizes="(min-width: 1024px) 16vw, 36vw"
                    alt="Das schmale Sichtfenster vorne am Kasten, darin blaues Wasser"
                    className="benefit__img"
                  />
                </div>
              </div>
              <div className="benefit__copy">
                <h3>Weniger gießen. Mehr genießen.</h3>
                <p>
                  Ein integriertes Wasserreservoir mit geplanter Kapillarbewässerung soll deine Pflanzen länger mit
                  Feuchtigkeit versorgen.
                </p>
                <WaitlistLink className="btn btn--forest" inline />
              </div>
            </article>
          </div>
        </section>

        {/* 04 · Technik: Vertrauen und Neugier */}
        <section id="so-funktionierts" className="inside" aria-labelledby="inside-title">
          <div className="wrap">
            <div className="inside__head">
              <h2 id="inside-title" className="display-2">
                <span className="l">Schön durchdacht.</span> <span className="l">Bis ins Innere.</span>
              </h2>
              <p>
                Außen eine klare Form. Innen ein durchdachtes Konzept: Ein Wasserreservoir und Kapillarelemente sollen
                Feuchtigkeit dorthin bringen, wo die Wurzeln sie brauchen.
              </p>
            </div>
            <ProductExplorer />
          </div>
        </section>

        {/* 05 · Lifestyle */}
        <section id="alltag" className="city" aria-labelledby="city-title">
          <div className="city__media">
            <Picture
              name="facade"
              widths={[960, 1536]}
              width={1536}
              height={1024}
              sizes="100vw"
              alt="Helle Pariser Altbaufassade mit Laternen und Bäumen; an einem Fenster hängt der weiße Pflanzkasten mit Efeutute"
              className="city__img"
            />
          </div>
          <div className="wrap city__wrap">
            <div className="city__panel">
              <h2 id="city-title" className="display-2">
                Die Stadt ist
                <br />
                grau genug.
              </h2>
              <p>Ein bisschen Grün verändert den Blick nach draußen. Und vielleicht auch das Gefühl drinnen.</p>
            </div>
          </div>
        </section>

        {/* 06 · Warteliste */}
        <section id="warteliste" className="final" aria-labelledby="final-title">
          <div className="wrap final__grid">
            <div className="final__copy">
              <h2 id="final-title" className="display-1 final__title">
                Bald wächst
                <br />
                hier etwas.
              </h2>
              <p className="final__text">
                Wir entwickeln einen neuen Platz für deine Pflanzen. Trag dich ein und erfahre als Erstes, wenn es
                Neuigkeiten zum Launch gibt.
              </p>
            </div>
            <div className="final__form">
              <WaitlistForm
                tone="dark"
                size="lg"
                inputId="waitlist-email"
                note={
                  <>
                    Nur Updates zum Produkt. Jederzeit abmeldbar.{" "}
                    <a className="link" href="/datenschutz/">
                      Datenschutz
                    </a>
                  </>
                }
              />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <StickyCta />
    </>
  );
}
