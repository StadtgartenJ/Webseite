import type { Metadata } from "next";
import { LegalPage, Todo } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Impressum", robots: { index: false } };

export default function Impressum() {
  return (
    <LegalPage title="Impressum">
      <h2>Angaben gemäß § 5 DDG</h2>
      <p>
        <Todo>Vollständiger Name bzw. Firma mit Rechtsform</Todo>
        <br />
        <Todo>Straße und Hausnummer</Todo>
        <br />
        <Todo>Postleitzahl und Ort</Todo>
        <br />
        Deutschland
      </p>

      <h2>Vertreten durch</h2>
      <p>
        <Todo>Nur bei Gesellschaften: vertretungsberechtigte Person(en)</Todo>
      </p>

      <h2>Kontakt</h2>
      <p>
        E-Mail: <Todo>E-Mail-Adresse</Todo>
        <br />
        <Todo>Zweiter schneller Kontaktweg, z. B. Telefon oder Kontaktformular</Todo>
      </p>

      <h2>Registereintrag</h2>
      <p>
        <Todo>Falls vorhanden: Registergericht und Registernummer</Todo>
      </p>

      <h2>Umsatzsteuer-ID</h2>
      <p>
        <Todo>Falls vorhanden: Umsatzsteuer-Identifikationsnummer nach § 27a UStG</Todo>
      </p>

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>
        <Todo>Name und Anschrift der verantwortlichen Person</Todo>
      </p>

      <h2>Hinweis zum Produkt</h2>
      <p>
        Der auf dieser Website gezeigte Pflanzkasten befindet sich in Entwicklung. Abbildungen und das 3D-Modell sind
        Konzeptvisualisierungen. Es werden derzeit keine Produkte verkauft.
      </p>

      <h2>Verbraucherstreitbeilegung</h2>
      <p>
        <Todo>Vor Verkaufsstart prüfen: Angaben zur Teilnahme an Streitbeilegungsverfahren (VSBG)</Todo>
      </p>
    </LegalPage>
  );
}
