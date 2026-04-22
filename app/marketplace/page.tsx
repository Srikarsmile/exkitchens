import Image from "next/image";
import Link from "next/link";
import RealtimeRefresh from "@/app/components/RealtimeRefresh";
import { getViewer } from "@/lib/auth";
import { getMarketplaceListings } from "@/lib/marketplace";
import { formatMoney, formatTimeRemaining } from "@/lib/marketplace-shared";
import { isSupabaseConfigured } from "@/lib/env";

function getListingBadge(listing: Awaited<ReturnType<typeof getMarketplaceListings>>[number]) {
  if (listing.saleType === "buy_now") {
    return "Buy now";
  }

  if (!listing.auction) {
    return "Auction";
  }

  if (listing.auction.status === "live") {
    return `Ends in ${formatTimeRemaining(listing.auction.endAt)}`;
  }

  if (listing.auction.status === "scheduled") {
    return `Starts ${formatTimeRemaining(listing.auction.startAt)}`;
  }

  if (listing.auction.status === "ended") {
    return "Auction ended";
  }

  return "Auction";
}

export default async function MarketplacePage() {
  const [viewer, listings] = await Promise.all([getViewer(), getMarketplaceListings()]);

  return (
    <main id="main-content" className="mx-auto w-full max-w-7xl px-6 py-12">
      <RealtimeRefresh
        channel="marketplace"
        enabled={isSupabaseConfigured()}
        pollMs={60000}
        targets={[
          { table: "listings" },
          { table: "auctions" },
        ]}
      />

      <section className="relative overflow-hidden rounded-[2rem] bg-[#111111]">
        <div className="absolute inset-0">
          <Image
            src="/assets/kitchen_nano_ultrawide_2.jpg"
            alt="Ex-display kitchen showroom"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/55" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(90,156,100,0.28),transparent_42%)]" />
        </div>

        <div className="relative flex min-h-[360px] flex-col justify-end gap-8 px-6 py-10 md:min-h-[420px] md:px-10 md:py-12 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#9bc2a2]">
              Marketplace
            </p>
            <h1 className="mt-4 text-4xl font-light tracking-tight text-white md:text-5xl lg:text-6xl">
              Live auctions and fixed-price kitchens in one place
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/72">
              Browse active listings, follow bidding, and move into checkout
              without leaving the Ex Kitchens experience.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={viewer.user ? "/account" : "/login?next=/marketplace"}
              className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white hover:text-[#1a1a1a]"
            >
              {viewer.user ? "Account" : "Sign in"}
            </Link>
            {viewer.profile?.role === "admin" ? (
              <Link
                href="/admin"
                className="rounded-full bg-white px-5 py-3 text-sm font-medium text-[#1a1a1a] transition hover:bg-[#dfe8df]"
              >
                Admin panel
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mt-8 space-y-4">
        {!isSupabaseConfigured() ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Add Supabase environment variables to load the live marketplace.
          </p>
        ) : null}

        {viewer.user && viewer.profile?.bidder_status !== "approved" ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Your account is signed in. Bidding and buy-now checkout unlock after an
            admin approves the profile.
          </p>
        ) : null}
      </section>

      {listings.length === 0 ? (
        <div className="mt-10 rounded-[2rem] border border-dashed border-gray-200 bg-white px-8 py-16 text-center shadow-[0_20px_40px_rgba(17,17,17,0.04)]">
          <h2 className="text-2xl font-medium text-gray-900">No listings yet</h2>
          <p className="mt-3 text-sm text-gray-500">
            Sign in as an admin and publish the first kitchen.
          </p>
          <div className="mt-6">
            <Link
              href="/admin"
              className="rounded-full bg-[#3d7a44] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#2f6135]"
            >
              Open admin panel
            </Link>
          </div>
        </div>
      ) : (
        <section className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => (
            <article
              key={listing.id}
              className="overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_60px_rgba(17,17,17,0.06)]"
            >
              <div className="relative h-72 bg-[#f3f3f3]">
                <Image
                  src={listing.heroImageUrl || "/assets/kitchen_nano_square.jpg"}
                  alt={listing.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className="object-cover"
                />
                <div className="absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
                  {getListingBadge(listing)}
                </div>
              </div>

              <div className="space-y-4 p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3d7a44]">
                    {listing.brand || "Curated"}
                  </p>
                  <h2 className="mt-2 text-2xl font-medium text-gray-900">
                    {listing.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    {listing.summary || "Premium ex-display kitchen."}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {listing.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[#f4f7f4] px-3 py-1 text-xs font-medium text-[#3d7a44]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-end justify-between gap-4 border-t border-gray-100 pt-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
                      {listing.saleType === "auction" ? "Current bid" : "Buy now"}
                    </p>
                    <p className="mt-1 text-2xl font-medium text-gray-900">
                      {formatMoney(listing.currentPricePence)}
                    </p>
                  </div>

                  <Link
                    href={`/marketplace/${listing.slug}`}
                    className="rounded-full bg-[#1a1a1a] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#2b2b2b]"
                  >
                    View listing
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
