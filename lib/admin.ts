import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type {
  AdminOrderRecord,
  AdminUserRecord,
  SellerOption,
} from "@/lib/marketplace-shared";
import {
  mapListing,
  mapOrder,
  runMarketplaceMaintenance,
  type SupabaseListingRow,
  type SupabaseOrderRow,
} from "@/lib/marketplace";

type SellerProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: SellerOption["role"];
};

type AdminListingRow = SupabaseListingRow & {
  seller?:
    | {
        full_name: string | null;
        email: string | null;
      }
    | {
        full_name: string | null;
        email: string | null;
      }[]
    | null;
};

type AdminOrderRow = SupabaseOrderRow & {
  buyer?:
    | {
        full_name: string | null;
        email: string | null;
      }
    | {
        full_name: string | null;
        email: string | null;
      }[]
    | null;
  seller?:
    | {
        full_name: string | null;
        email: string | null;
      }
    | {
        full_name: string | null;
        email: string | null;
      }[]
    | null;
};

export interface AdminListingRecord extends ReturnType<typeof mapListing> {
  sellerName: string | null;
  sellerEmail: string | null;
}

export interface AdminCounts {
  totalListings: number;
  liveAuctions: number;
  registeredUsers: number;
  pendingApprovals: number;
  openOrders: number;
}

export async function getAdminCounts(): Promise<AdminCounts> {
  if (!isSupabaseConfigured()) {
    return {
      totalListings: 0,
      liveAuctions: 0,
      registeredUsers: 0,
      pendingApprovals: 0,
      openOrders: 0,
    };
  }

  const supabase = await createClient();
  await runMarketplaceMaintenance(supabase);

  const [
    { count: totalListings },
    { count: liveAuctions },
    { count: registeredUsers },
    { count: pendingApprovals },
    { count: openOrders },
  ] = await Promise.all([
    supabase.from("listings").select("*", { count: "exact", head: true }),
    supabase
      .from("auctions")
      .select("*", { count: "exact", head: true })
      .eq("status", "live"),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("bidder_status", "pending"),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .in("status", ["awaiting_payment", "paid"]),
  ]);

  return {
    totalListings: totalListings ?? 0,
    liveAuctions: liveAuctions ?? 0,
    registeredUsers: registeredUsers ?? 0,
    pendingApprovals: pendingApprovals ?? 0,
    openOrders: openOrders ?? 0,
  };
}

export async function getAdminListings(limit = 24) {
  if (!isSupabaseConfigured()) {
    return [] as AdminListingRecord[];
  }

  const supabase = await createClient();
  await runMarketplaceMaintenance(supabase);

  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, slug, title, brand, summary, sale_type, status, hero_image_url, tags, original_price_pence, buy_now_price_pence, starting_bid_pence, bid_increment_pence, reserve_price_pence, current_price_pence, featured, seller_profile_id, winner_profile_id, settlement_order_id, seller:profiles!listings_seller_profile_id_fkey(full_name, email), auctions(id, status, start_at, end_at, current_bid_pence, bid_count)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error("Failed to load admin listings", error);
    return [];
  }

  return (data as AdminListingRow[]).map((row) => {
    const seller = Array.isArray(row.seller) ? row.seller[0] : row.seller;

    return {
      ...mapListing(row),
      sellerName: seller?.full_name ?? null,
      sellerEmail: seller?.email ?? null,
    };
  });
}

export async function getAdminUsers(limit = 60) {
  if (!isSupabaseConfigured()) {
    return [] as AdminUserRecord[];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, phone, role, bidder_status, bidder_status_reason, phone_verified_at, bidder_approved_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error("Failed to load admin users", error);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    bidderStatus: row.bidder_status,
    bidderStatusReason: row.bidder_status_reason,
    phoneVerifiedAt: row.phone_verified_at,
    bidderApprovedAt: row.bidder_approved_at,
    createdAt: row.created_at,
  })) as AdminUserRecord[];
}

export async function getSellerOptions() {
  if (!isSupabaseConfigured()) {
    return [] as SellerOption[];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .in("role", ["seller", "admin"])
    .order("full_name", { ascending: true });

  if (error || !data) {
    console.error("Failed to load seller options", error);
    return [];
  }

  return (data as SellerProfileRow[]).map((profile) => ({
    id: profile.id,
    role: profile.role,
    label:
      profile.full_name && profile.email
        ? `${profile.full_name} (${profile.email})`
        : profile.full_name || profile.email || profile.id.slice(0, 8),
  }));
}

export async function getAdminOrders(limit = 24) {
  if (!isSupabaseConfigured()) {
    return [] as AdminOrderRecord[];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, kind, status, amount_pence, due_at, payment_reference, payment_notes, created_at, listings(id, slug, title), buyer:profiles!orders_buyer_profile_id_fkey(full_name, email), seller:profiles!orders_seller_profile_id_fkey(full_name, email)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error("Failed to load admin orders", error);
    return [];
  }

  return (data as AdminOrderRow[]).map((row) => {
    const buyer = Array.isArray(row.buyer) ? row.buyer[0] : row.buyer;
    const seller = Array.isArray(row.seller) ? row.seller[0] : row.seller;

    return {
      ...mapOrder(row),
      buyerName: buyer?.full_name ?? null,
      buyerEmail: buyer?.email ?? null,
      sellerName: seller?.full_name ?? null,
      sellerEmail: seller?.email ?? null,
    };
  });
}
