import HomePage from "@/app/components/HomePage";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "ExKitchens",
  description:
    "The UK\u2019s largest marketplace for premium ex-display and pre-loved kitchens.",
  url: "https://www.exkitchens.com",
  telephone: "+123456789",
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

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <HomePage />
    </>
  );
}
