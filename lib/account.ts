import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type {
  AccountBidItem,
  AccountDashboardData,
  AppRole,
  NotificationItem,
} from "@/lib/marketplace-shared";
import { isAdminNotificationKind } from "@/lib/marketplace-shared";
import {
  mapListing,
  mapOrder,
  runMarketplaceMaintenance,
  type SupabaseListingRow,
  type SupabaseOrderRow,
} from "@/lib/marketplace";

type WatchlistRow = {
  listings?:
    | SupabaseListingRow
    | SupabaseListingRow[]
    | null;
};

type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string;
  entity_type: string | null;
  entity_id: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
  read_at: string | null;
};

type BidHistoryRow = {
  id: string;
  amount_pence: number;
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
  auctions?:
    | {
        current_bid_id: string | null;
        status: AccountBidItem["auctionStatus"];
        end_at: string | null;
      }
    | {
        current_bid_id: string | null;
        status: AccountBidItem["auctionStatus"];
        end_at: string | null;
      }[]
    | null;
};

export async function getAccountDashboard(
  userId: string,
  role: AppRole,
): Promise<AccountDashboardData> {
  if (!isSupabaseConfigured()) {
    return {
      bids: [],
      watchlist: [],
      notifications: [],
      buyerOrders: [],
      sellerOrders: [],
      sellerListings: [],
    };
  }

  const supabase = await createClient();
  await runMarketplaceMaintenance(supabase);

  const [
    { data: bidRows, error: bidError },
    { data: watchRows, error: watchError },
    { data: notificationRows, error: notificationError },
    { data: buyerOrderRows, error: buyerOrderError },
    { data: sellerOrderRows, error: sellerOrderError },
    { data: sellerListingRows, error: sellerListingError },
  ] = await Promise.all([
    supabase
      .from("bids")
      .select(
        "id, amount_pence, created_at, listings(id, slug, title), auctions(current_bid_id, status, end_at)",
      )
      .eq("bidder_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("watchlist_entries")
      .select(
        "listings(id, slug, title, brand, summary, sale_type, status, hero_image_url, tags, original_price_pence, buy_now_price_pence, starting_bid_pence, bid_increment_pence, reserve_price_pence, current_price_pence, featured, seller_profile_id, winner_profile_id, settlement_order_id, auctions(id, status, start_at, end_at, current_bid_pence, bid_count))",
      )
      .eq("profile_id", userId)
      .order("created_at", { ascending: false })
      .limit(16),
    supabase
      .from("notifications")
      .select("id, kind, title, body, entity_type, entity_id, data, created_at, read_at")
      .eq("profile_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("orders")
      .select(
        "id, kind, status, amount_pence, due_at, payment_reference, payment_notes, created_at, listings!orders_listing_id_fkey(id, slug, title)",
      )
      .eq("buyer_profile_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    role === "seller" || role === "admin"
      ? supabase
          .from("orders")
          .select(
            "id, kind, status, amount_pence, due_at, payment_reference, payment_notes, created_at, listings!orders_listing_id_fkey(id, slug, title)",
          )
          .eq("seller_profile_id", userId)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as SupabaseOrderRow[], error: null }),
    role === "seller" || role === "admin"
      ? supabase
          .from("listings")
          .select(
            "id, slug, title, brand, summary, sale_type, status, hero_image_url, tags, original_price_pence, buy_now_price_pence, starting_bid_pence, bid_increment_pence, reserve_price_pence, current_price_pence, featured, seller_profile_id, winner_profile_id, settlement_order_id, auctions(id, status, start_at, end_at, current_bid_pence, bid_count)",
          )
          .eq("seller_profile_id", userId)
          .order("created_at", { ascending: false })
          .limit(12)
      : Promise.resolve({ data: [] as SupabaseListingRow[], error: null }),
  ]);

  if (bidError) {
    console.error("Failed to load bid history", bidError);
  }

  if (watchError) {
    console.error("Failed to load watchlist", watchError);
  }

  if (notificationError) {
    console.error("Failed to load notifications", notificationError);
  }

  if (buyerOrderError) {
    console.error("Failed to load buyer orders", buyerOrderError);
  }

  if (sellerOrderError) {
    console.error("Failed to load seller orders", sellerOrderError);
  }

  if (sellerListingError) {
    console.error("Failed to load seller listings", sellerListingError);
  }

  const bids =
    (bidRows as BidHistoryRow[] | null)?.map((row) => {
      const listing = Array.isArray(row.listings) ? row.listings[0] : row.listings;
      const auction = Array.isArray(row.auctions) ? row.auctions[0] : row.auctions;

      return {
        id: row.id,
        amountPence: row.amount_pence,
        createdAt: row.created_at,
        listingId: listing?.id ?? null,
        listingSlug: listing?.slug ?? null,
        listingTitle: listing?.title ?? null,
        auctionStatus: auction?.status ?? null,
        auctionEndsAt: auction?.end_at ?? null,
        isWinningBid: auction?.current_bid_id === row.id,
      } satisfies AccountBidItem;
    }) ?? [];

  const watchlist =
    (watchRows as WatchlistRow[] | null)
      ?.map((row) => {
        const listing = Array.isArray(row.listings) ? row.listings[0] : row.listings;
        return listing ? mapListing(listing) : null;
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item)) ?? [];

  const notifications: NotificationItem[] =
    ((notificationRows as NotificationRow[] | null) ?? [])
      .filter((row) => !isAdminNotificationKind(row.kind))
      .map((row) => ({
        id: row.id,
        kind: row.kind,
        title: row.title,
        body: row.body,
        entityType: row.entity_type,
        entityId: row.entity_id,
        data: row.data ?? {},
        createdAt: row.created_at,
        readAt: row.read_at,
      }));

  return {
    bids,
    watchlist,
    notifications,
    buyerOrders: ((buyerOrderRows as SupabaseOrderRow[] | null) ?? []).map(mapOrder),
    sellerOrders: ((sellerOrderRows as SupabaseOrderRow[] | null) ?? []).map(mapOrder),
    sellerListings: ((sellerListingRows as SupabaseListingRow[] | null) ?? []).map(
      mapListing,
    ),
  };
}
