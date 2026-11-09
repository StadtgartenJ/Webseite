import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Schriften liegen im Projekt (SIL Open Font License) und werden von der eigenen Domain
// ausgeliefert: keine Verbindung zu Google Fonts beim Seitenaufruf (wichtig für die DSGVO).
const display = localFont({
  src: "./fonts/BricolageGrotesque-Variable.woff2",
  weight: "200 800",
  variable: "--font-display",
  display: "swap",
});

const text = localFont({
  src: "./fonts/Figtree-Variable.woff2",
  weight: "300 900",
  variable: "--font-text",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://stadtgarden.de";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Dein Fenster. Dein Garten. | Stadtgarden",
    template: "%s | Stadtgarden",
  },
  description:
    "Mehr Grün für dein Zuhause – auch ohne Balkon. Entdecke unseren Fensterpflanzkasten mit bohrfreier Montageidee und cleverem Bewässerungskonzept. Jetzt auf die Warteliste.",
  applicationName: "Stadtgarden",
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: "/",
    siteName: "Stadtgarden",
    title: "Dein Fenster. Dein Garten.",
    description:
      "Mehr Grün für dein Zuhause – auch ohne Balkon. Ein Fensterpflanzkasten mit bohrfreier Montageidee und cleverem Bewässerungskonzept. Jetzt auf die Warteliste.",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "Weißer Pflanzkasten mit Efeutute vor einem Altbaufenster im warmen Abendlicht",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#F7F6EF",
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
