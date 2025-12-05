import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Koin Player - Next-Gen Web Retro Emulation",
  description: "High-performance web-based emulator for NES, SNES, GBA, and more. Built by The Retro Saga.",
  keywords: ["retro gaming", "emulator", "web assembly", "nostalgist", "nextjs", "react", "koin deck"],
  openGraph: {
    title: "Koin Player - Next-Gen Web Retro Emulation",
    description: "Play your favorite retro games directly in the browser with high performance and save support.",
    type: "website",
    siteName: "Koin Player",
  },
  twitter: {
    card: "summary_large_image",
    creator: "@theretrosaga",
    title: "Koin Player",
    description: "Next-Gen Web Retro Emulation by The Retro Saga",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
