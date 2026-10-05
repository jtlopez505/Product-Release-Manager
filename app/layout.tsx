import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";

import "./globals.css";

// Tipografías de docs/arquitectura/marca.md: Inter para la interfaz, IBM Plex Mono para
// números de versión y datos tabulares.
const inter = Inter({
  variable: "--fuente-interfaz",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--fuente-datos",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ReleaseView",
  description:
    "Panel interno para saber qué versión y qué features tiene cada cliente.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.variable} ${ibmPlexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
