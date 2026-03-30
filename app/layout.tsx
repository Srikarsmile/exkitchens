import type { Metadata } from "next";
import { Inter, Playfair_Display, Lora } from "next/font/google";
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

export const metadata: Metadata = {
  metadataBase: new URL("https://www.exkitchens.com"),
  title: "ExKitchens | Premium Ex-Display Kitchens Up to 70% Off",
  description:
    "The UK's largest marketplace for premium ex-display and pre-loved kitchens. Browse 2,000+ luxury kitchens from Bulthaup, Poggenpohl, Siematic and more. Up to 70% off retail.",
  keywords: [
    "ex-display kitchens",
    "luxury kitchens",
    "pre-loved kitchens",
    "Bulthaup",
    "Poggenpohl",
    "Siematic",
    "kitchen auction",
    "UK kitchens",
  ],
  openGraph: {
    title: "ExKitchens | Premium Ex-Display Kitchens Up to 70% Off",
    description:
      "The UK's largest marketplace for premium ex-display and pre-loved kitchens. 2,000+ luxury kitchens from 100+ showrooms.",
    url: "https://www.exkitchens.com",
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
    title: "ExKitchens | Premium Ex-Display Kitchens Up to 70% Off",
    description:
      "The UK's largest marketplace for premium ex-display and pre-loved kitchens. Up to 70% off retail.",
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
