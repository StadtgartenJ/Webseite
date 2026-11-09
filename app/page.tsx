import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Picture } from "@/components/Picture";
import { WaitlistForm } from "@/components/WaitlistForm";
import { WordHighlight } from "@/components/WordHighlight";
import { ProductExplorer } from "@/components/explorer/ProductExplorer";

const DETAILS = [
  {
    n: "01",
    title: "Ohne Bohren",
    text: "Eine Klemmstange spannt sich zwischen die Seiten deiner Fensterlaibung, der Kasten hängt an zwei Haken darunter. So soll die Fassade unversehrt bleiben, wenn die Laibung dafür geeignet ist.",
    img: { name: "detail-rod", w: 324, h: 162, alt: "Weiße Klemmstange mit rundem Endstück an der Laibung, ein Haken hält den Kasten" },
  },
  {
    n: "02",
    title: "Wasser, wenn Pflanzen es brauchen",
    text: "Unten liegt ein Wasserreservoir, darüber ein Docht, der Feuchtigkeit nach oben ins Substrat zieht. Ein schmales Sichtfenster zeigt, wann du nachfüllen solltest.",
    img: { name: "detail-membrane", w: 320, h: 160, alt: "Nahaufnahme eines feinen, saugfähigen Gewebes mit Wassertropfen" },
  },
  {
    n: "03",
    title: "Design, das bleibt",
    text: "Eine weiche, weiße Kapsel ohne Schnörkel. Gezeichnet für Altbau wie Neubau, für Efeutute ebenso wie für Thymian.",
    img: { name: "detail-shell", w: 600, h: 300, alt: "Weiße Kapselform mit schmalem Sichtfenster, darüber hängende Efeutute" },
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="inhalt">
        {/* 01 · Hero */}
        <section className="hero" aria-labelledby="hero-title">
          <div className="wrap hero__grid">
            <div className="hero__copy">
              <h1 id="hero-title" className="hero__title">
                <span className="enter" style={{ "--i": 0 } as React.CSSProperties}>Ein Fenster.</span>{" "}
                <span className="enter" style={{ "--i": 1 } as React.CSSProperties}>Ein kleiner Garten.</span>
              </h1>
              <p className="lead enter" style={{ "--i": 2 } as React.CSSProperties}>
                Ein Pflanzkasten für vor dein Fenster. Er soll ohne Bohren halten und seine Pflanzen aus einem eigenen
                Wasservorrat versorgen. Für mehr Grün mitten in der Stadt.
              </p>
              <div className="enter" style={{ "--i": 3 } as React.CSSProperties}>
                <WaitlistForm
                  note={
                    <>
                      Noch in Entwicklung. Du bekommst eine Mail zur Bestätigung und kannst dich jederzeit abmelden.{" "}
                      <a className="link" href="/datenschutz/">
                        Datenschutz
                      </a>
                    </>
                  }
                />
              </div>
            </div>
            <div className="hero__media">
              <Picture
                name="hero-window"
                widths={[480, 720, 960, 1122]}
                width={1122}
                height={1402}
                sizes="(min-width: 1024px) 46vw, 100vw"
                alt="Weißer Pflanzkasten mit Efeutute und feinen Hängepflanzen vor einem hellen Altbaufenster im Abendlicht"
                className="hero__img"
                priority
              />
            </div>
          </div>
        </section>

        {/* 02 · Die Idee */}
        <section id="konzept" className="section concept" aria-labelledby="konzept-title">
          <div className="wrap concept__grid">
            <div className="concept__statement">
              <WordHighlight
                as="h2"
                className="concept__title"
                text="Nicht jede Stadtwohnung hat einen Balkon. Aber fast jede hat ein Fenster. Dort fängt dein Garten an."
                accent={["Fenster"]}
              />
            </div>
            <div className="concept__body">
              <p>
                Vor der Scheibe liegt oft ungenutzter Platz. Klassische Blumenkästen wollen angeschraubt, abgestützt und
                ständig gegossen werden. Wir entwerfen einen Kasten, der in die Fensterlaibung geklemmt wird und seinen
                eigenen Wasservorrat mitbringt.
              </p>
              <p>Von drinnen siehst du Blätter statt Fassade. Von draußen ein ruhiges Objekt, das zum Haus passt.</p>
            </div>
            <div className="concept__media">
              <Picture
                name="daylight"
                widths={[584]}
                width={584}
                height={336}
                sizes="(min-width: 1024px) 40vw, 100vw"
                alt="Der Pflanzkasten im Tageslicht, an einer Klemmstange vor einem weißen Fenster"
                className="frame-img"
              />
            </div>
          </div>
        </section>

        {/* 03 · Drei Details */}
        <section className="section details" aria-labelledby="details-title">
          <div className="wrap">
            <h2 id="details-title" className="section-title">
              Drei Details, die ihn ausmachen.
            </h2>
            <ol className="details__list">
              {DETAILS.map((d) => (
                <li key={d.n} className="detail">
                  <span className="detail__n" aria-hidden="true">
                    {d.n}
                  </span>
                  <div className="detail__copy">
                    <h3>{d.title}</h3>
                    <p>{d.text}</p>
                  </div>
                  <div className="detail__media">
                    <Picture
                      name={d.img.name}
                      widths={[d.img.w]}
                      width={d.img.w}
                      height={d.img.h}
                      sizes="(min-width: 1024px) 26vw, 100vw"
                      alt={d.img.alt}
                      className="frame-img"
                    />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 04 · Im Inneren */}
        <section id="so-funktionierts" className="section inside" aria-labelledby="inside-title">
          <div className="wrap">
            <div className="inside__head">
              <h2 id="inside-title" className="section-title">
                Durchdacht. Bis ins Detail.
              </h2>
              <p>
                Dreh das Modell, zieh es auseinander, schau hinein. Es zeigt, wie wir uns den Aufbau heute vorstellen. Die
                eigentliche Konstruktion entsteht gerade erst.
              </p>
            </div>
            <ProductExplorer />
          </div>
        </section>

        {/* 05 · Ein bisschen mehr Grün */}
        <section className="section greener" aria-labelledby="greener-title">
          <div className="wrap">
            <div className="greener__head">
              <h2 id="greener-title" className="section-title">
                Ein bisschen Grün, jeden Morgen.
              </h2>
              <p>
                Der erste Blick aus dem Fenster fällt auf Blätter, nicht auf die Hauswand gegenüber. Und die Efeutute hängt
                jede Woche ein Stück tiefer.
              </p>
            </div>
            <div className="greener__media">
              <Picture
                name="window-light"
                widths={[640, 960, 1122]}
                width={1122}
                height={640}
                sizes="(min-width: 1440px) 1312px, 100vw"
                alt="Sprossenfenster eines Altbaus im warmen Abendlicht, Blätter spiegeln sich in der Scheibe"
                className="frame-img"
              />
            </div>
          </div>
        </section>

        {/* 06 · Warteliste */}
        <section id="warteliste" className="section waitlist" aria-labelledby="waitlist-title">
          <div className="wrap waitlist__grid">
            <div className="waitlist__copy">
              <h2 id="waitlist-title" className="waitlist__title">
                Etwas Grünes wächst heran.
              </h2>
              <div className="waitlist__body">
                <p>
                  Wir arbeiten an einem neuen Zuhause für deine Pflanzen. Trag dich ein und erfahre zuerst, wann es losgeht.
                </p>
                <WaitlistForm
                  tone="dark"
                  note={
                    <>
                      Du bekommst eine Mail mit Bestätigungslink. Danach schreiben wir dir nur zum Start und zu wichtigen
                      Neuigkeiten, Abmelden geht jederzeit. Mehr in der{" "}
                      <a className="link" href="/datenschutz/">
                        Datenschutzerklärung
                      </a>
                      .
                    </>
                  }
                />
              </div>
            </div>
            <div className="waitlist__media">
              <Picture
                name="trailing"
                widths={[430]}
                width={430}
                height={520}
                sizes="(min-width: 1024px) 430px, 100vw"
                alt="Efeutute rankt über den Rand des weißen Kastens"
                className="frame-img"
              />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
