import type { Metadata } from "next";

export interface ListingSeoDetails {
  slug: string;
  title: string;
  brand: string | null;
  summary: string | null;
  description: string | null;
  heroImageUrl: string | null;
  tags: string[] | null;
  location: string | null;
}

export function buildHomePageStructuredData(siteUrl: string, supportPhone: string) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "ExKitchens",
      url: siteUrl,
      description:
        "The UK's marketplace for premium ex-display and pre-loved kitchens.",
      logo: `${siteUrl}/assets/og_leaf.png`,
      contactPoint: supportPhone
        ? [
            {
              "@type": "ContactPoint",
              telephone: supportPhone,
              contactType: "customer support",
              areaServed: "GB",
              availableLanguage: ["en-GB"],
            },
          ]
        : undefined,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "ExKitchens",
      url: siteUrl,
      description:
        "Browse premium ex-display and pre-loved kitchens with clear buy-now pricing.",
    },
  ];
}

export function getListingSeoDescription(listing: ListingSeoDetails) {
  return (
    listing.summary ||
    listing.description ||
    [
      listing.brand || "ExKitchens",
      listing.location || "UK",
      "premium ex-display kitchen listing",
    ]
      .filter(Boolean)
      .join(" • ")
  );
}

export function buildListingMetadata(
  siteUrl: string,
  listing: ListingSeoDetails,
): Metadata {
  const description = getListingSeoDescription(listing);
  const title = `${listing.title} | ExKitchens Marketplace`;
  const canonicalPath = `/marketplace/${listing.slug}`;
  const images = [listing.heroImageUrl || "/assets/og_leaf.png"];

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    keywords: listing.tags ?? undefined,
    openGraph: {
      title,
      description,
      url: `${siteUrl}${canonicalPath}`,
      siteName: "ExKitchens",
      type: "website",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
  };
}
