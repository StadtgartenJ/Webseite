import type { Metadata } from "next";
import { LegalPage, Todo } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Datenschutz", robots: { index: false } };

export default function Datenschutz() {
  return (
    <LegalPage title="Datenschutzerklärung">
      <h2>1. Verantwortlich</h2>
      <p>
        <Todo>Name bzw. Firma</Todo>
        <br />
        <Todo>Anschrift</Todo>
        <br />
        E-Mail: <Todo>E-Mail-Adresse für Datenschutzanfragen</Todo>
      </p>

      <h2>2. Kurz gesagt</h2>
      <p>
        Diese Website setzt keine Cookies, nutzt keine Analyse- oder Trackingdienste und bindet keine Inhalte von
        Drittanbietern ein. Schriften und Bilder werden von unserem eigenen Webspace ausgeliefert. Personenbezogene Daten
        verarbeiten wir nur beim Aufruf der Seite (technisch notwendig) und wenn du dich freiwillig in die Warteliste
        einträgst.
      </p>

      <h2>3. Hosting und Server-Logfiles</h2>
      <p>
        Die Website wird über GitHub Pages bereitgestellt (GitHub, Inc., USA). Beim Aufruf verarbeitet der Hoster technisch
        notwendige Daten wie IP-Adresse, Zeitpunkt, aufgerufene Seite und Browserkennung, um die Seite auszuliefern und vor
        Missbrauch zu schützen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse liegt im
        sicheren Betrieb der Website.
      </p>
      <p>
        <Todo>
          Vor Veröffentlichung prüfen: Rechtsgrundlage der Übermittlung in die USA (z. B. EU-US Data Privacy Framework oder
          Standardvertragsklauseln), Speicherdauer der Logs beim Hoster
        </Todo>
      </p>

      <h2>4. Warteliste</h2>
      <p>
        Wenn du dich in die Warteliste einträgst, verarbeiten wir deine E-Mail-Adresse, um dich über den Start und wichtige
        Neuigkeiten zum Produkt zu informieren. Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO).
      </p>
      <p>
        Wir nutzen das Double-Opt-in-Verfahren: Nach der Anmeldung bekommst du eine E-Mail mit einem Bestätigungslink. Erst
        nach dem Klick darauf stehst du auf der Liste. Um die Einwilligung nachweisen zu können, speichern wir den Zeitpunkt
        der Anmeldung und der Bestätigung sowie die dabei verwendete IP-Adresse.
      </p>
      <p>
        Die Anmeldung läuft über einen kleinen Server-Endpunkt bei Cloudflare, Inc. (USA). Verwaltung der Adressen und
        Versand der E-Mails übernimmt Brevo (Sendinblue SAS, Frankreich). Mit beiden Anbietern bestehen bzw. werden
        Verträge zur Auftragsverarbeitung nach Art. 28 DSGVO geschlossen.
      </p>
      <p>
        <Todo>Vor Veröffentlichung prüfen: Anschriften der Anbieter, AV-Verträge, Drittlandübermittlung bei Cloudflare</Todo>
      </p>
      <p>
        Du kannst deine Einwilligung jederzeit widerrufen, etwa über den Abmeldelink in jeder E-Mail oder per Nachricht an
        die oben genannte Adresse. Wir speichern deine Adresse, bis du dich abmeldest oder wir das Projekt beenden; danach
        wird sie gelöscht, soweit keine gesetzliche Pflicht zur Aufbewahrung besteht.
      </p>
      <p>Die Angabe deiner E-Mail-Adresse ist freiwillig. Ohne sie können wir dich nur nicht benachrichtigen.</p>

      <h2>5. Deine Rechte</h2>
      <p>
        Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der
        Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21). Eine erteilte Einwilligung kannst
        du jederzeit mit Wirkung für die Zukunft widerrufen (Art. 7 Abs. 3). Außerdem kannst du dich bei einer
        Datenschutz-Aufsichtsbehörde beschweren (Art. 77), zum Beispiel bei der Behörde deines Wohnorts.
      </p>

      <h2>6. Stand</h2>
      <p>
        <Todo>Datum der Fassung</Todo>
      </p>
    </LegalPage>
  );
}
