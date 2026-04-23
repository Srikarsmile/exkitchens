import { createAdminClient } from "@/lib/supabase/admin";

interface ReleasePendingBuyNowOrderOptions {
  orderId: string;
  reason: string;
  notify?: boolean;
}

interface ReleasePendingBuyNowOrderResult {
  released: boolean;
  listingSlug: string | null;
}

export async function releasePendingBuyNowOrder({
  orderId,
  reason,
  notify = true,
}: ReleasePendingBuyNowOrderOptions): Promise<ReleasePendingBuyNowOrderResult> {
  const supabase = createAdminClient();
  const { data: orderRow, error } = await supabase
    .from("orders")
    .select(
      "id, kind, status, listing_id, buyer_profile_id, seller_profile_id, amount_pence, listings!orders_listing_id_fkey(slug, title, buy_now_price_pence)",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error || !orderRow) {
    if (error) {
      console.error("Failed to load pending order for release", error);
    }

    return { released: false, listingSlug: null };
  }

  if (orderRow.kind !== "buy_now" || orderRow.status !== "awaiting_payment") {
    const listing = Array.isArray(orderRow.listings)
      ? orderRow.listings[0]
      : orderRow.listings;

    return {
      released: false,
      listingSlug: listing?.slug ?? null,
    };
  }

  const listing = Array.isArray(orderRow.listings)
    ? orderRow.listings[0]
    : orderRow.listings;
  const listingSlug = listing?.slug ?? null;

  const { error: orderUpdateError } = await supabase
    .from("orders")
    .update({
      status: "cancelled",
      payment_notes: reason,
    })
    .eq("id", orderId)
    .eq("status", "awaiting_payment");

  if (orderUpdateError) {
    console.error("Failed to cancel pending order", orderUpdateError);
    return {
      released: false,
      listingSlug,
    };
  }

  const { error: listingUpdateError } = await supabase
    .from("listings")
    .update({
      status: "published",
      winner_profile_id: null,
      sold_at: null,
      settlement_order_id: null,
      current_price_pence: listing?.buy_now_price_pence ?? null,
    })
    .eq("id", orderRow.listing_id)
    .eq("settlement_order_id", orderId);

  if (listingUpdateError) {
    console.error("Failed to relist listing after checkout release", listingUpdateError);
    return {
      released: false,
      listingSlug,
    };
  }

  if (notify) {
    const notifications: Array<{
      profile_id: string;
      kind: string;
      title: string;
      body: string;
      entity_type: string;
      entity_id: string;
      data: {
        order_id: string;
        listing_id: string;
        status: string;
      };
    }> = [];

    if (orderRow.buyer_profile_id) {
      notifications.push({
        profile_id: orderRow.buyer_profile_id,
        kind: "checkout_cancelled",
        title: "Checkout cancelled",
        body: "Your buy-now checkout was cancelled and the listing is live again.",
        entity_type: "order",
        entity_id: orderId,
        data: {
          order_id: orderId,
          listing_id: orderRow.listing_id,
          status: "cancelled",
        },
      });
    }

    if (orderRow.seller_profile_id) {
      notifications.push({
        profile_id: orderRow.seller_profile_id,
        kind: "listing_relisted",
        title: "Listing relisted",
        body: "A buy-now checkout was cancelled and the kitchen is available again.",
        entity_type: "order",
        entity_id: orderId,
        data: {
          order_id: orderId,
          listing_id: orderRow.listing_id,
          status: "cancelled",
        },
      });
    }

    if (notifications.length > 0) {
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (notificationError) {
        console.error("Failed to notify checkout release", notificationError);
      }
    }
  }

  return {
    released: true,
    listingSlug,
  };
}
