import type { Metadata } from "next";
import { Archivo_Black, Space_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const archivoBlack = Archivo_Black({
  weight: "400",
  variable: "--font-archivo-black",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  variable: "--font-space-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "koin.js — Browser Retro Game Emulation for React",
  description: "The drop-in React component for browser-based retro game emulation. 27 systems. Cloud saves. Zero backend required.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${archivoBlack.variable} ${spaceMono.variable} antialiased font-mono bg-zinc-100 text-black`}
      >
        {children}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-JFKRKDRVHV"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-JFKRKDRVHV');
          `}
        </Script>
      </body>
    </html>
  );
}
