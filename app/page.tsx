import HomePage from "@/app/components/HomePage";
import { getMarketplaceSupportPhone, getSiteUrl } from "@/lib/env";
import { getFeaturedListings } from "@/lib/marketplace";
import { buildHomePageStructuredData } from "@/lib/seo";

export const revalidate = 300;

export default async function Page() {
  const featuredListings = await getFeaturedListings();
  const structuredData = buildHomePageStructuredData(
    getSiteUrl(),
    getMarketplaceSupportPhone(),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <HomePage featuredListings={featuredListings} />
    </>
  );
}
