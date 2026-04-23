import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";
import { getPublishedListingSitemapEntries } from "@/lib/marketplace";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();
  const listings = await getPublishedListingSitemapEntries();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/marketplace`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  const listingRoutes: MetadataRoute.Sitemap = listings.map((listing) => ({
    url: `${siteUrl}/marketplace/${listing.slug}`,
    lastModified: listing.updatedAt || now.toISOString(),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...staticRoutes, ...listingRoutes];
}
