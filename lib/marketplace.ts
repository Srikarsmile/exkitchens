import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseAdminConfigured, isSupabaseConfigured } from "@/lib/env";
import type {
  AuctionSnapshot,
  ListingCardData,
  ListingDetailData,
  ListingSaleType,
  ListingStatus,
  OrderKind,
  OrderStatus,
  OrderSummary,
  PublicBidFeedItem,
} from "@/lib/marketplace-shared";

type MarketplaceDbClient =
  | ReturnType<typeof createAdminClient>
  | ReturnType<typeof createPublicClient>
  | Awaited<ReturnType<typeof createClient>>;

export type SupabaseListingRow = {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  summary: string | null;
  description?: string | null;
  location?: string | null;
  sale_type: ListingSaleType;
  status: ListingStatus;
  hero_image_url: string | null;
  gallery_urls?: string[] | null;
  tags: string[] | null;
  original_price_pence: number | null;
  buy_now_price_pence: number | null;
  starting_bid_pence: number | null;
  bid_increment_pence: number | null;
  reserve_price_pence: number | null;
  current_price_pence: number | null;
  featured: boolean;
  seller_profile_id: string | null;
  winner_profile_id: string | null;
  settlement_order_id: string | null;
  auctions?:
    | {
        id: string;
        status: "scheduled" | "live" | "ended" | "cancelled";
        start_at: string;
        end_at: string;
        current_bid_pence: number | null;
        bid_count: number;
      }
    | {
        id: string;
        status: "scheduled" | "live" | "ended" | "cancelled";
        start_at: string;
        end_at: string;
        current_bid_pence: number | null;
        bid_count: number;
      }[]
    | null;
};

export type SupabaseOrderRow = {
  id: string;
  kind: OrderKind;
  status: OrderStatus;
  amount_pence: number;
  due_at: string | null;
  payment_reference: string | null;
  payment_notes: string | null;
  created_at: string;
  listings?:
    | {
        id: string;
        slug: string | null;
        title: string | null;
      }
    | {
        id: string;
        slug: string | null;
        title: string | null;
      }[]
    | null;
};

type PublicBidFeedRow = {
  id: string;
  amount_pence: number;
  created_at: string;
  is_current: boolean;
};

type PublicListingSeoRow = {
  slug: string;
  title: string;
  brand: string | null;
  summary: string | null;
  description: string | null;
  hero_image_url: string | null;
  tags: string[] | null;
  location: string | null;
};

type PublicListingSitemapRow = {
  slug: string;
  updated_at: string | null;
};

const MARKETPLACE_MAINTENANCE_THROTTLE_MS = 15_000;

let marketplaceMaintenancePromise: Promise<void> | null = null;
let lastMarketplaceMaintenanceAt = 0;

function normaliseAuction(row: SupabaseListingRow) {
  const auction = Array.isArray(row.auctions) ? row.auctions[0] : row.auctions;

  if (!auction) {
    return null;
  }

  const increment = row.bid_increment_pence ?? 5000;
  const minimumNextBidPence =
    auction.current_bid_pence == null
      ? row.starting_bid_pence ?? 0
      : auction.current_bid_pence + increment;

  return {
    id: auction.id,
    status: auction.status,
    startAt: auction.start_at,
    endAt: auction.end_at,
    currentBidPence: auction.current_bid_pence,
    bidCount: auction.bid_count,
    minimumNextBidPence,
    reservePricePence: row.reserve_price_pence,
    reserveMet:
      row.reserve_price_pence == null ||
      (auction.current_bid_pence ?? 0) >= row.reserve_price_pence,
  } satisfies AuctionSnapshot;
}

export function mapListing(row: SupabaseListingRow): ListingCardData {
  const auction = normaliseAuction(row);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    brand: row.brand,
    summary: row.summary,
    saleType: row.sale_type,
    heroImageUrl: row.hero_image_url,
    tags: row.tags ?? [],
    status: row.status,
    originalPricePence: row.original_price_pence,
    buyNowPricePence: row.buy_now_price_pence,
    startingBidPence: row.starting_bid_pence,
    bidIncrementPence: row.bid_increment_pence ?? 5000,
    reservePricePence: row.reserve_price_pence,
    currentPricePence:
      row.current_price_pence ??
      auction?.currentBidPence ??
      row.buy_now_price_pence ??
      row.starting_bid_pence ??
      null,
    featured: row.featured,
    sellerProfileId: row.seller_profile_id,
    winnerProfileId: row.winner_profile_id,
    settlementOrderId: row.settlement_order_id,
    auction,
  };
}

export function mapOrder(row: SupabaseOrderRow): OrderSummary {
  const listing = Array.isArray(row.listings) ? row.listings[0] : row.listings;

  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    amountPence: row.amount_pence,
    dueAt: row.due_at,
    paymentReference: row.payment_reference,
    paymentNotes: row.payment_notes,
    createdAt: row.created_at,
    listingId: listing?.id ?? "",
    listingSlug: listing?.slug ?? null,
    listingTitle: listing?.title ?? null,
  };
}

export async function runMarketplaceMaintenance(supabase?: MarketplaceDbClient) {
  if (!isSupabaseConfigured()) {
    return;
  }

  if (marketplaceMaintenancePromise) {
    await marketplaceMaintenancePromise;
    return;
  }

  if (
    lastMarketplaceMaintenanceAt > 0 &&
    Date.now() - lastMarketplaceMaintenanceAt < MARKETPLACE_MAINTENANCE_THROTTLE_MS
  ) {
    return;
  }

  const client =
    supabase ??
    (isSupabaseAdminConfigured() ? createAdminClient() : await createClient());

  marketplaceMaintenancePromise = (async () => {
    const { error } = await client.rpc("sync_auction_states");

    if (error) {
      console.error("Failed to sync auction states", error);
      return;
    }

    lastMarketplaceMaintenanceAt = Date.now();
  })();

  try {
    await marketplaceMaintenancePromise;
  } finally {
    marketplaceMaintenancePromise = null;
  }
}

export async function getFeaturedListings(limit = 6) {
  if (!isSupabaseConfigured()) {
    return [] as ListingCardData[];
  }

  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, slug, title, brand, summary, sale_type, status, hero_image_url, tags, original_price_pence, buy_now_price_pence, starting_bid_pence, bid_increment_pence, reserve_price_pence, current_price_pence, featured, seller_profile_id, winner_profile_id, settlement_order_id, auctions(id, status, start_at, end_at, current_bid_pence, bid_count)",
    )
    .eq("status", "published")
    .eq("sale_type", "buy_now")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error("Failed to load featured listings", error);
    return [];
  }

  return (data as SupabaseListingRow[]).map(mapListing);
}

export async function getMarketplaceListings() {
  if (!isSupabaseConfigured()) {
    return [] as ListingCardData[];
  }

  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, slug, title, brand, summary, sale_type, status, hero_image_url, tags, original_price_pence, buy_now_price_pence, starting_bid_pence, bid_increment_pence, reserve_price_pence, current_price_pence, featured, seller_profile_id, winner_profile_id, settlement_order_id, auctions(id, status, start_at, end_at, current_bid_pence, bid_count)",
    )
    .eq("status", "published")
    .eq("sale_type", "buy_now")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Failed to load marketplace listings", error);
    return [];
  }

  return (data as SupabaseListingRow[]).map(mapListing);
}

export async function getPublishedListingSeoBySlug(slug: string) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("listings")
    .select("slug, title, brand, summary, description, hero_image_url, tags, location")
    .eq("slug", slug)
    .eq("status", "published")
    .eq("sale_type", "buy_now")
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("Failed to load listing SEO data", error);
    }

    return null;
  }

  const row = data as PublicListingSeoRow;

  return {
    slug: row.slug,
    title: row.title,
    brand: row.brand,
    summary: row.summary,
    description: row.description,
    heroImageUrl: row.hero_image_url,
    tags: row.tags ?? [],
    location: row.location,
  };
}

export async function getPublishedListingSitemapEntries() {
  if (!isSupabaseConfigured()) {
    return [] as Array<{ slug: string; updatedAt: string | null }>;
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("listings")
    .select("slug, updated_at")
    .eq("status", "published")
    .eq("sale_type", "buy_now")
    .order("updated_at", { ascending: false });

  if (error || !data) {
    if (error) {
      console.error("Failed to load listing sitemap entries", error);
    }

    return [];
  }

  return (data as PublicListingSitemapRow[]).map((row) => ({
    slug: row.slug,
    updatedAt: row.updated_at,
  }));
}

export async function getListingBySlug(slug: string, viewerId?: string | null) {
  if (!isSupabaseConfigured()) {
    return {
      listing: null,
      bids: [] as PublicBidFeedItem[],
      isWatched: false,
    };
  }

  const supabase = await createClient();
  await runMarketplaceMaintenance(supabase);

  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, slug, title, brand, summary, description, location, sale_type, status, hero_image_url, gallery_urls, tags, original_price_pence, buy_now_price_pence, starting_bid_pence, bid_increment_pence, reserve_price_pence, current_price_pence, featured, seller_profile_id, winner_profile_id, settlement_order_id, auctions(id, status, start_at, end_at, current_bid_pence, bid_count)",
    )
    .eq("slug", slug)
    .eq("sale_type", "buy_now")
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("Failed to load listing", error);
    }

    return {
      listing: null,
      bids: [] as PublicBidFeedItem[],
      isWatched: false,
    };
  }

  const mappedListing = mapListing(data as SupabaseListingRow);
  let order: OrderSummary | null = null;

  if (
    mappedListing.settlementOrderId &&
    viewerId &&
    (mappedListing.winnerProfileId === viewerId ||
      mappedListing.sellerProfileId === viewerId)
  ) {
    const { data: orderRow } = await supabase
      .from("orders")
      .select(
        "id, kind, status, amount_pence, due_at, payment_reference, payment_notes, created_at, listings!orders_listing_id_fkey(id, slug, title)",
      )
      .eq("id", mappedListing.settlementOrderId)
      .maybeSingle();

    if (orderRow) {
      order = mapOrder(orderRow as SupabaseOrderRow);
    }
  }

  let bids: PublicBidFeedItem[] = [];

  if (mappedListing.auction) {
    const { data: bidRows, error: bidError } = await supabase.rpc("get_bid_feed", {
      p_auction_id: mappedListing.auction.id,
      p_limit: 8,
    });

    if (bidError) {
      console.error("Failed to load bid feed", bidError);
    } else {
      bids =
        (bidRows as PublicBidFeedRow[] | null)?.map((bid) => ({
          id: bid.id,
          amountPence: bid.amount_pence,
          createdAt: bid.created_at,
          isCurrent: bid.is_current,
        })) ?? [];
    }
  }

  let isWatched = false;

  if (viewerId) {
    const { data: watchEntry } = await supabase
      .from("watchlist_entries")
      .select("id")
      .eq("listing_id", mappedListing.id)
      .eq("profile_id", viewerId)
      .maybeSingle();

    isWatched = Boolean(watchEntry);
  }

  const listing = {
    ...mappedListing,
    description: data.description ?? null,
    location: data.location ?? null,
    galleryUrls: Array.isArray(data.gallery_urls) ? data.gallery_urls : [],
    isWatched,
    order,
  } satisfies ListingDetailData;

  return { listing, bids, isWatched };
}
