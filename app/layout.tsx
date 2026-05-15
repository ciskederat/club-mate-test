import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Serif_Display } from "next/font/google";
import "./globals.css";

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-bricolage-grotesque",
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  display: "swap",
  weight: "400",
  variable: "--font-dm-serif-display",
});

export const metadata: Metadata = {
  title: "Club Mate Antwerpen",
  description: "Een alternatieve kaart voor cafés en winkels met Club Mate in Antwerpen.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={`${bricolageGrotesque.variable} ${dmSerifDisplay.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
