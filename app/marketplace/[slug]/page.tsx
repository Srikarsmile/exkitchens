import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import CancelReservationButton from "@/app/account/CancelReservationButton";
import OrderCheckoutButton from "@/app/account/OrderCheckoutButton";
import BidForm from "@/app/marketplace/[slug]/BidForm";
import BuyNowCard from "@/app/marketplace/[slug]/BuyNowCard";
import ListingInterestCard from "@/app/marketplace/[slug]/ListingInterestCard";
import ListingImageGallery from "@/app/marketplace/[slug]/ListingImageGallery";
import RealtimeRefresh from "@/app/components/RealtimeRefresh";
import { toggleWatchlistAction } from "@/app/actions/marketplace";
import { getViewer } from "@/lib/auth";
import {
  getMarketplaceContactEmail,
  getMarketplaceContactEmailHref,
  getMarketplaceSupportPhone,
  getMarketplaceSupportPhoneHref,
  getSiteUrl,
} from "@/lib/env";
import {
  getListingBySlug,
  getPublishedListingSeoBySlug,
} from "@/lib/marketplace";
import {
  calculatePercentageOff,
  formatDateTime,
  formatMoney,
  formatTimeRemaining,
  getListingConditionLabel,
  getVisibleListingTags,
} from "@/lib/marketplace-shared";
import { buildListingMetadata } from "@/lib/seo";

interface ListingPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
}: Pick<ListingPageProps, "params">): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getPublishedListingSeoBySlug(slug);

  if (!listing) {
    return {
      title: "Listing not found | ExKitchens Marketplace",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return buildListingMetadata(getSiteUrl(), listing);
}

export default async function ListingPage({
  params,
  searchParams,
}: ListingPageProps) {
  const [{ slug }, resolvedSearchParams, viewer] = await Promise.all([
    params,
    searchParams,
    getViewer(),
  ]);
  const supportPhone = getMarketplaceSupportPhone();
  const supportPhoneHref = getMarketplaceSupportPhoneHref();
  const contactEmail = getMarketplaceContactEmail();
  const contactEmailHref = getMarketplaceContactEmailHref();
  const { listing, bids } = await getListingBySlug(slug, viewer.user?.id);

  if (!listing) {
    notFound();
  }

  const heroImage = listing.heroImageUrl || "/assets/kitchen_nano_square.jpg";
  const galleryImages = Array.from(
    new Set(listing.galleryUrls.filter(Boolean)),
  );
  const canBid =
    Boolean(viewer.user) &&
    (viewer.profile?.role === "admin" ||
      viewer.profile?.bidder_status === "approved");
  const isAdminViewer = viewer.profile?.role === "admin";
  const isLiveAuction =
    listing.saleType === "auction" && listing.auction?.status === "live";
  const buyNowAvailable =
    listing.saleType === "buy_now" &&
    listing.status === "published" &&
    !listing.order;
  const buyNowPricePence =
    listing.buyNowPricePence ?? listing.currentPricePence;
  const buyNowDiscountPercent = calculatePercentageOff(
    listing.originalPricePence,
    buyNowPricePence,
  );
  const savingsPence =
    listing.originalPricePence != null &&
    buyNowPricePence != null &&
    listing.originalPricePence > buyNowPricePence
      ? listing.originalPricePence - buyNowPricePence
      : null;
  const listingConditionLabel = getListingConditionLabel(
    listing.title,
    listing.summary,
    listing.description,
    ...listing.tags,
  );
  const visibleTags = getVisibleListingTags(listing.tags);
  const ownsListing = Boolean(
    viewer.user &&
    listing.sellerProfileId &&
    viewer.user.id === listing.sellerProfileId,
  );
  const paymentState =
    typeof resolvedSearchParams.payment === "string"
      ? resolvedSearchParams.payment
      : null;
  const viewerOwnsOrder = Boolean(
    viewer.user &&
    listing.order &&
    listing.winnerProfileId &&
    viewer.user.id === listing.winnerProfileId,
  );

  return (
    <main id="main-content" className="mx-auto w-full max-w-7xl px-6 py-12">
      <RealtimeRefresh
        channel={`listing-${listing.id}`}
        enabled={Boolean(listing.auction || viewer.user)}
        pollMs={30000}
        targets={[
          { table: "listings", filter: `id=eq.${listing.id}` },
          ...(listing.auction
            ? [{ table: "auctions", filter: `id=eq.${listing.auction.id}` }]
            : []),
          ...(viewer.user
            ? [
                {
                  table: "notifications",
                  filter: `profile_id=eq.${viewer.user.id}`,
                },
              ]
            : []),
        ]}
      />

      <div className="space-y-8">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#3d7a44] transition hover:text-[#2f6135]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to marketplace
        </Link>

        <section className="space-y-4">
          <ListingImageGallery
            title={listing.title}
            heroImage={heroImage}
            galleryImages={galleryImages}
          />
        </section>

        <div className="grid items-start gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-full bg-[#f2f7f2] px-4 py-2 text-sm font-medium text-[#3d7a44]">
                    {listing.brand || "Curated listing"}
                  </div>
                  {listingConditionLabel ? (
                    <div className="rounded-full border border-[#d6e3d6] bg-white px-4 py-2 text-sm font-medium text-gray-700">
                      {listingConditionLabel}
                    </div>
                  ) : null}
                  {viewer.user ? (
                    <form action={toggleWatchlistAction}>
                      <input
                        type="hidden"
                        name="listingId"
                        value={listing.id}
                      />
                      <input
                        type="hidden"
                        name="listingSlug"
                        value={listing.slug}
                      />
                      <input
                        type="hidden"
                        name="redirectPath"
                        value={`/marketplace/${listing.slug}`}
                      />
                      <button
                        type="submit"
                        className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
                      >
                        {listing.isWatched ? "Watching" : "Watch listing"}
                      </button>
                    </form>
                  ) : (
                    <Link
                      href={`/login?next=${encodeURIComponent(`/marketplace/${listing.slug}`)}`}
                      className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
                    >
                      Sign in to watch
                    </Link>
                  )}
                </div>

                <h1 className="mt-4 text-4xl font-light tracking-tight text-gray-900 md:text-5xl">
                  {listing.title}
                </h1>
              </div>
            </div>

            <div className="rounded-[2rem] bg-white p-8 shadow-[0_20px_40px_rgba(17,17,17,0.05)]">
              {listing.saleType === "buy_now" ? (
                <div className="grid gap-6 md:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
                      Offer price
                    </p>
                    <p className="mt-2 text-3xl font-medium text-gray-900">
                      {formatMoney(buyNowPricePence)}
                    </p>
                    <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-[#3d7a44]">
                      Final cost shown clearly
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
                      RRP
                    </p>
                    <p className="mt-2 text-2xl font-medium text-gray-400 line-through">
                      {listing.originalPricePence
                        ? formatMoney(listing.originalPricePence)
                        : "On request"}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      Original showroom reference price
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
                      Discount
                    </p>
                    <p className="mt-2 text-2xl font-medium text-[#3d7a44]">
                      {buyNowDiscountPercent
                        ? `${buyNowDiscountPercent}% off`
                        : "Seller offer"}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      {savingsPence
                        ? `Save ${formatMoney(savingsPence)} against retail`
                        : "Discount shown when an RRP is available"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
                      Location
                    </p>
                    <p className="mt-2 text-base text-gray-800">
                      {listing.location || "UK"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
                      Price
                    </p>
                    <p className="mt-2 text-2xl font-medium text-gray-900">
                      {formatMoney(listing.currentPricePence)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
                      Location
                    </p>
                    <p className="mt-2 text-base text-gray-800">
                      {listing.location || "UK"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
                      Auction timer
                    </p>
                    <p className="mt-2 text-base text-gray-800">
                      {listing.auction
                        ? formatTimeRemaining(listing.auction.endAt)
                        : "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
                      Reserve
                    </p>
                    <p className="mt-2 text-base text-gray-800">
                      {listing.reservePricePence
                        ? listing.auction?.reserveMet
                          ? "Reserve met"
                          : "Reserve active"
                        : "No reserve"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-[2rem] bg-white p-8 shadow-[0_20px_40px_rgba(17,17,17,0.05)]">
              <h2 className="text-xl font-medium text-gray-900">
                Kitchen details
              </h2>
              <div className="mt-4 whitespace-pre-line text-base leading-7 text-gray-600">
                {listing.description ||
                  listing.summary ||
                  "Premium ex-display kitchen."}
              </div>

              <div className="mt-8 rounded-[1.75rem] border border-[#dfe5df] bg-[#f7faf7] p-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Dismantling, delivery, and installation
                </h3>
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  Ex Kitchens can quote separately for professional dismantling,
                  nationwide delivery, and installation support. Ask for the
                  service package when you enquire about this kitchen.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <a
                    href={supportPhoneHref}
                    className="inline-flex items-center justify-center rounded-full bg-[#1a1a1a] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#2b2b2b]"
                  >
                    Call {supportPhone}
                  </a>
                  <a
                    href={contactEmailHref}
                    className="inline-flex items-center justify-center rounded-full border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
                  >
                    Email {contactEmail}
                  </a>
                </div>
              </div>

              {visibleTags.length > 0 ? (
                <div className="mt-8 flex flex-wrap gap-2">
                  {visibleTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[#f4f7f4] px-3 py-1 text-xs font-medium text-[#3d7a44]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          <aside className="space-y-6 lg:sticky lg:top-24">
            {paymentState === "cancel" ? (
              <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm">
                <h2 className="text-xl font-medium text-amber-900">
                  Checkout cancelled
                </h2>
                <p className="mt-3 text-sm leading-6 text-amber-800">
                  Checkout was cancelled. You can try again, finish payment from
                  your account, or release the reservation if you no longer want
                  the kitchen.
                </p>
              </div>
            ) : null}

            {listing.order ? (
              <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-medium text-gray-900">
                  {viewerOwnsOrder ? "Complete your payment" : "Settlement"}
                </h2>
                <p className="mt-3 text-sm leading-6 text-gray-500">
                  {viewerOwnsOrder &&
                  listing.order.status === "awaiting_payment"
                    ? `This kitchen is reserved in your account while payment is pending. Payment is due ${formatDateTime(listing.order.dueAt)}.`
                    : `Status ${listing.order.status.replaceAll("_", " ")}. Payment due ${formatDateTime(listing.order.dueAt)}.`}
                </p>
                {listing.order.paymentReference ? (
                  <p className="mt-3 text-sm text-gray-600">
                    Reference {listing.order.paymentReference}
                  </p>
                ) : null}
                <div className="mt-5 flex flex-wrap gap-3">
                  {viewerOwnsOrder &&
                  listing.order.status === "awaiting_payment" ? (
                    <OrderCheckoutButton
                      orderId={listing.order.id}
                      className="space-y-3"
                    />
                  ) : null}
                  {viewerOwnsOrder &&
                  listing.order.kind === "buy_now" &&
                  listing.order.status === "awaiting_payment" ? (
                    <CancelReservationButton
                      orderId={listing.order.id}
                      listingSlug={listing.slug}
                      redirectPath={`/marketplace/${listing.slug}`}
                    />
                  ) : null}
                  {viewer.user ? (
                    <Link
                      href="/account"
                      className="rounded-full bg-[#1a1a1a] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#2b2b2b]"
                    >
                      Open account
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : isLiveAuction && listing.auction ? (
              viewer.user ? (
                ownsListing && isAdminViewer ? (
                  <BidForm
                    auctionId={listing.auction.id}
                    slug={listing.slug}
                    minimumBidPence={listing.auction.minimumNextBidPence}
                    previewOnly
                  />
                ) : ownsListing ? (
                  <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-medium text-gray-900">
                      Seller view
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-gray-500">
                      This listing is assigned to your account as the seller, so
                      live bidding is hidden here.
                    </p>
                  </div>
                ) : canBid ? (
                  <BidForm
                    auctionId={listing.auction.id}
                    slug={listing.slug}
                    minimumBidPence={listing.auction.minimumNextBidPence}
                  />
                ) : (
                  <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm">
                    <h2 className="text-xl font-medium text-amber-900">
                      Approval required
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-amber-800">
                      Your account is signed in, but bidding starts after an
                      admin approves the profile.
                    </p>
                    <div className="mt-5 flex">
                      <Link
                        href="/account"
                        className="inline-flex w-full items-center justify-center rounded-full bg-amber-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-amber-950 sm:w-auto"
                      >
                        Open account
                      </Link>
                    </div>
                  </div>
                )
              ) : (
                <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-medium text-gray-900">
                    Sign in to bid
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-gray-500">
                    Buyers must sign in and be approved before they can join a
                    live auction.
                  </p>
                  <div className="mt-5 flex">
                    <Link
                      href={`/login?next=${encodeURIComponent(`/marketplace/${listing.slug}`)}`}
                      className="inline-flex w-full items-center justify-center rounded-full bg-[#3d7a44] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#2f6135] sm:w-auto"
                    >
                      Sign in
                    </Link>
                  </div>
                </div>
              )
            ) : buyNowAvailable ? (
              viewer.user ? (
                ownsListing && isAdminViewer ? (
                  <div className="space-y-4">
                    <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm">
                      <h2 className="text-xl font-medium text-amber-900">
                        Admin seller preview
                      </h2>
                      <p className="mt-3 text-sm leading-6 text-amber-800">
                        Your account owns this listing, so a live self-purchase
                        is still blocked. The card below is a preview of the
                        real buyer checkout panel.
                      </p>
                      <div className="mt-5 flex">
                        <Link
                          href="/admin#listings"
                          className="inline-flex w-full items-center justify-center rounded-full bg-amber-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-amber-950 sm:w-auto"
                        >
                          Open listing controls
                        </Link>
                      </div>
                    </div>
                    <BuyNowCard
                      listingId={listing.id}
                      slug={listing.slug}
                      amountPence={listing.buyNowPricePence}
                      originalPricePence={listing.originalPricePence}
                      supportPhone={supportPhone}
                      supportPhoneHref={supportPhoneHref}
                      previewOnly
                    />
                  </div>
                ) : ownsListing ? (
                  <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-medium text-gray-900">
                      Seller view
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-gray-500">
                      This listing is assigned to your account as the seller, so
                      checkout is hidden here. Reassign the seller from admin or
                      sign in with a different buyer account to use buy now.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <BuyNowCard
                      listingId={listing.id}
                      slug={listing.slug}
                      amountPence={listing.buyNowPricePence}
                      originalPricePence={listing.originalPricePence}
                      supportPhone={supportPhone}
                      supportPhoneHref={supportPhoneHref}
                    />
                    <ListingInterestCard
                      listingId={listing.id}
                      slug={listing.slug}
                      title={listing.title}
                      supportPhone={supportPhone}
                      supportPhoneHref={supportPhoneHref}
                      contactEmail={contactEmail}
                      contactEmailHref={contactEmailHref}
                    />
                  </div>
                )
              ) : (
                <ListingInterestCard
                  listingId={listing.id}
                  slug={listing.slug}
                  title={listing.title}
                  supportPhone={supportPhone}
                  supportPhoneHref={supportPhoneHref}
                  contactEmail={contactEmail}
                  contactEmailHref={contactEmailHref}
                />
              )
            ) : (
              <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-medium text-gray-900">
                  {listing.saleType === "auction"
                    ? "Auction status"
                    : "Listing status"}
                </h2>
                <p className="mt-3 text-sm leading-6 text-gray-500">
                  {listing.saleType === "auction"
                    ? listing.auction
                      ? `${listing.auction.status[0].toUpperCase()}${listing.auction.status.slice(1)}. Starts ${formatDateTime(listing.auction.startAt)} and ends ${formatDateTime(listing.auction.endAt)}.`
                      : "This auction is not currently available."
                    : listing.status === "sold" && listing.settlementOrderId
                      ? "This kitchen is currently in checkout and temporarily unavailable."
                      : "This listing is already reserved or no longer available."}
                </p>
              </div>
            )}

            <div className="rounded-[2rem] bg-white p-6 shadow-[0_20px_40px_rgba(17,17,17,0.05)]">
              <h2 className="text-xl font-medium text-gray-900">
                Latest bid activity
              </h2>
              <div className="mt-5 space-y-3">
                {bids.length === 0 ? (
                  <p className="text-sm text-gray-500">No bids yet.</p>
                ) : (
                  bids.map((bid) => (
                    <div
                      key={bid.id}
                      className="rounded-2xl bg-[#fafafa] px-4 py-3 text-sm text-gray-700"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-gray-900">
                          {formatMoney(bid.amountPence)}
                        </span>
                        <span className="text-xs uppercase tracking-[0.2em] text-gray-400">
                          {new Date(bid.createdAt).toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        {bid.isCurrent ? "Current leading bid" : "Accepted bid"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
