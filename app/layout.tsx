import type { Metadata } from "next";
import { Inter, Playfair_Display, Lora } from "next/font/google";
import { getSiteUrl } from "@/lib/env";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "ExKitchens | Premium Ex-Display Kitchens For Sale",
  description:
    "The UK's marketplace for premium ex-display and pre-loved kitchens. Browse luxury kitchens from Bulthaup, Poggenpohl, Siematic and more with original-price savings shown upfront.",
  keywords: [
    "ex-display kitchens",
    "luxury kitchens",
    "pre-loved kitchens",
    "Bulthaup",
    "Poggenpohl",
    "Siematic",
    "used kitchens",
    "UK kitchens",
  ],
  openGraph: {
    title: "ExKitchens | Premium Ex-Display Kitchens For Sale",
    description:
      "The UK's marketplace for premium ex-display and pre-loved kitchens with clear buy-now pricing.",
    url: siteUrl,
    siteName: "ExKitchens",
    images: [
      {
        url: "/assets/og_leaf.png",
        width: 1200,
        height: 630,
        alt: "ExKitchens leaf logo",
      },
    ],
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ExKitchens | Premium Ex-Display Kitchens For Sale",
    description:
      "Browse premium ex-display and pre-loved kitchens with clear buy-now pricing.",
    images: ["/assets/og_leaf.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large" as const,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${playfair.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#fafafa] text-[#111111] font-sans selection:bg-green-600/20 selection:text-green-900">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[#3d7a44] focus:text-white focus:text-sm focus:font-medium"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
