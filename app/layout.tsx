import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Schriften liegen im Projekt (SIL Open Font License) und werden von der eigenen Domain
// ausgeliefert: keine Verbindung zu Google Fonts beim Seitenaufruf (wichtig für die DSGVO).
const display = localFont({
  src: "./fonts/FamiljenGrotesk-Variable.woff2",
  weight: "400 700",
  variable: "--font-display",
  display: "swap",
});

const text = localFont({
  src: "./fonts/InstrumentSans-Variable.woff2",
  weight: "400 700",
  variable: "--font-text",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://stadtgarden.de";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Stadtgarden – Ein Pflanzkasten für dein Fenster",
    template: "%s · Stadtgarden",
  },
  description:
    "Ein Pflanzkasten, der ohne Bohren vor deinem Fenster hängen soll – mit eigenem Wasserreservoir. Noch in Entwicklung. Trag dich in die Warteliste ein.",
  applicationName: "Stadtgarden",
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: "/",
    siteName: "Stadtgarden",
    title: "Ein Fenster. Ein kleiner Garten.",
    description:
      "Ein Pflanzkasten für vor dein Fenster. Noch in Entwicklung – trag dich in die Warteliste ein.",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Weißer Pflanzkasten mit Efeutute vor einem Altbaufenster im Abendlicht" }],
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#F8F7F3",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${display.variable} ${text.variable}`}>
      <body>
        <a className="skip-link" href="#inhalt">
          Zum Inhalt springen
        </a>
        {children}
      </body>
    </html>
  );
}
