import HomePage from "@/app/components/HomePage";
import { getFeaturedListings } from "@/lib/marketplace";

export const revalidate = 300;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "ExKitchens",
  description:
    "The UK\u2019s largest marketplace for premium ex-display and pre-loved kitchens.",
  url: "https://www.exkitchens.com",
  email: "info@exkitchens.com",
  address: {
    "@type": "PostalAddress",
    addressLocality: "London",
    addressCountry: "GB",
  },
  priceRange: "$$",
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "5",
    reviewCount: "3",
  },
};

export default async function Page() {
  const featuredListings = await getFeaturedListings();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <HomePage featuredListings={featuredListings} />
    </>
  );
}
