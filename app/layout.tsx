import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Serif_Display, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

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

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
const previewImage = {
  url: "/website-front.png",
  width: 1000,
  height: 1000,
  alt: "Mate Alert kaart met Club Mate locaties",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Mate Alert",
  description: "Een alternatieve kaart voor cafés en winkels met Club Mate in Antwerpen.",
  openGraph: {
    title: "Mate Alert",
    description: "Een alternatieve kaart voor cafés en winkels met Club Mate in Antwerpen.",
    url: "/",
    siteName: "Mate Alert",
    images: [previewImage],
    locale: "nl_BE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mate Alert",
    description: "Een alternatieve kaart voor cafés en winkels met Club Mate in Antwerpen.",
    images: [previewImage],
  },
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
    <html lang="nl" className={cn("h-full", "antialiased", bricolageGrotesque.variable, dmSerifDisplay.variable, "font-sans", geist.variable)}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
