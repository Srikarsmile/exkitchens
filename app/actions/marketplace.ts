"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createOrderCheckoutSession } from "@/lib/stripe";
import { requireUser } from "@/lib/auth";
import { deliverPendingNotificationEmails } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { isStripeConfigured, isSupabaseConfigured } from "@/lib/env";
import { runMarketplaceMaintenance } from "@/lib/marketplace";

export interface MarketplaceActionState {
  message?: string;
  success?: boolean;
}

const watchlistSchema = z.object({
  listingId: z.string().uuid(),
  listingSlug: z.string().trim().optional(),
  redirectPath: z.string().trim().optional(),
});

const buyNowSchema = z.object({
  listingId: z.string().uuid(),
  slug: z.string().min(1),
});

const orderCheckoutSchema = z.object({
  orderId: z.string().uuid(),
});

const releaseOrderSchema = z.object({
  orderId: z.string().uuid(),
  listingSlug: z.string().trim().optional(),
  redirectPath: z.string().trim().optional(),
});

const notificationSchema = z.object({
  notificationId: z.string().uuid(),
  redirectPath: z.string().trim().optional(),
});

function normaliseNotificationRedirectPath(value?: string | null) {
  return value === "/admin" ? "/admin" : "/account";
}

function revalidateMarketplacePaths(slug?: string | null, redirectPath?: string | null) {
  revalidatePath("/marketplace");
  revalidatePath("/account");
  revalidatePath("/");

  if (slug) {
    revalidatePath(`/marketplace/${slug}`);
  }

  if (redirectPath) {
    revalidatePath(redirectPath);
  }
}

export async function toggleWatchlistAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const parsed = watchlistSchema.safeParse({
    listingId: formData.get("listingId"),
    listingSlug: formData.get("listingSlug"),
    redirectPath: formData.get("redirectPath"),
  });

  if (!parsed.success) {
    return;
  }

  const viewer = await requireUser(
    parsed.data.redirectPath || `/marketplace/${parsed.data.listingSlug || ""}`,
  );
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("watchlist_entries")
    .select("id")
    .eq("listing_id", parsed.data.listingId)
    .eq("profile_id", viewer.user.id)
    .maybeSingle();

  if (existing?.id) {
    await supabase.from("watchlist_entries").delete().eq("id", existing.id);
  } else {
    await supabase.from("watchlist_entries").insert({
      listing_id: parsed.data.listingId,
      profile_id: viewer.user.id,
    });
  }

  revalidateMarketplacePaths(parsed.data.listingSlug, parsed.data.redirectPath);
}

export async function createBuyNowOrderAction(
  _prevState: MarketplaceActionState,
  formData: FormData,
): Promise<MarketplaceActionState> {
  if (!isSupabaseConfigured()) {
    return {
      message:
        "Supabase is not configured yet. Add the environment variables before using checkout.",
    };
  }

  const parsed = buyNowSchema.safeParse({
    listingId: formData.get("listingId"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    return { message: "Invalid listing." };
  }

  const viewer = await requireUser(`/marketplace/${parsed.data.slug}`);
  const buyerEmail = viewer.user.email || viewer.profile?.email;

  if (!buyerEmail) {
    return {
      message: "Your account is missing an email address. Add it before starting payment.",
    };
  }

  if (!isStripeConfigured()) {
    return {
      message:
        "Checkout is not configured yet. Add the production payment keys before taking payment.",
    };
  }

  const supabase = await createClient();
  await runMarketplaceMaintenance(supabase);

  const { error } = await supabase.rpc("start_buy_now_checkout", {
    p_listing_id: parsed.data.listingId,
  });

  if (error) {
    return { message: error.message };
  }

  await deliverPendingNotificationEmails();
  revalidateMarketplacePaths(parsed.data.slug, `/marketplace/${parsed.data.slug}`);

  const { data: orderRow } = await supabase
    .from("orders")
    .select(
      "id, kind, status, amount_pence, listings!orders_listing_id_fkey(id, slug, title), buyer_profile_id",
    )
    .eq("listing_id", parsed.data.listingId)
    .eq("buyer_profile_id", viewer.user.id)
    .eq("status", "awaiting_payment")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (orderRow) {
    const listing = Array.isArray(orderRow.listings)
      ? orderRow.listings[0]
      : orderRow.listings;

    let session: Awaited<ReturnType<typeof createOrderCheckoutSession>>;

    try {
      session = await createOrderCheckoutSession({
        id: orderRow.id,
        amountPence: orderRow.amount_pence,
        kind: orderRow.kind,
        listingId: listing?.id ?? parsed.data.listingId,
        listingTitle: listing?.title ?? null,
        listingSlug: listing?.slug ?? parsed.data.slug,
        buyerEmail,
        cancelPath: `/checkout/cancel?listing=${encodeURIComponent(parsed.data.slug)}`,
      });
    } catch (error) {
      console.error("Failed to create Stripe checkout session", error);
      await supabase.rpc("cancel_buy_now_checkout", {
        p_order_id: orderRow.id,
      });
      revalidateMarketplacePaths(parsed.data.slug, `/marketplace/${parsed.data.slug}`);
      await deliverPendingNotificationEmails();

      return {
        message: "Could not open checkout right now. Please try again in a moment.",
      };
    }

    if (session.url) {
      redirect(session.url);
    }

    await supabase.rpc("cancel_buy_now_checkout", {
      p_order_id: orderRow.id,
    });
    revalidateMarketplacePaths(parsed.data.slug, `/marketplace/${parsed.data.slug}`);
    await deliverPendingNotificationEmails();

    return { message: "Checkout could not be opened right now." };
  }

  return {
    message:
      "The order was created, but checkout could not be opened. Open your account and retry payment there.",
  };
}

export async function startOrderCheckoutAction(
  _prevState: MarketplaceActionState,
  formData: FormData,
): Promise<MarketplaceActionState> {
  if (!isSupabaseConfigured()) {
    return {
      message:
        "Supabase is not configured yet. Add the environment variables before using checkout.",
    };
  }

  if (!isStripeConfigured()) {
    return {
      message:
        "Checkout is not configured yet. The order stays visible in your account until payment keys are added.",
    };
  }

  const parsed = orderCheckoutSchema.safeParse({
    orderId: formData.get("orderId"),
  });

  if (!parsed.success) {
    return { message: "Invalid order." };
  }

  const viewer = await requireUser("/account");
  const supabase = await createClient();
  const { data: orderRow, error } = await supabase
    .from("orders")
    .select(
      "id, kind, status, amount_pence, buyer_profile_id, listings!orders_listing_id_fkey(id, slug, title)",
    )
    .eq("id", parsed.data.orderId)
    .eq("buyer_profile_id", viewer.user.id)
    .maybeSingle();

  if (error || !orderRow) {
    return { message: "Order not found." };
  }

  if (orderRow.status !== "awaiting_payment") {
    return { message: "This order is no longer waiting for payment." };
  }

  const buyerEmail = viewer.user.email || viewer.profile?.email;

  if (!buyerEmail) {
    return { message: "Your account is missing an email address." };
  }

  const listing = Array.isArray(orderRow.listings)
    ? orderRow.listings[0]
    : orderRow.listings;

  let session: Awaited<ReturnType<typeof createOrderCheckoutSession>>;

  try {
    session = await createOrderCheckoutSession({
      id: orderRow.id,
      amountPence: orderRow.amount_pence,
      kind: orderRow.kind,
      listingId: listing?.id ?? "",
      listingTitle: listing?.title ?? null,
      listingSlug: listing?.slug ?? null,
      buyerEmail,
    });
  } catch (error) {
    console.error("Failed to create Stripe checkout session", error);
    return {
      message: "Could not open checkout right now. Please try again in a moment.",
    };
  }

  if (!session.url) {
    return { message: "Checkout could not be opened right now." };
  }

  redirect(session.url);
}

export async function cancelPendingBuyNowOrderAction(
  _prevState: MarketplaceActionState,
  formData: FormData,
): Promise<MarketplaceActionState> {
  if (!isSupabaseConfigured()) {
    return {
      message:
        "Supabase is not configured yet. Add the environment variables before using checkout.",
    };
  }

  const parsed = releaseOrderSchema.safeParse({
    orderId: formData.get("orderId"),
    listingSlug: formData.get("listingSlug"),
    redirectPath: formData.get("redirectPath"),
  });

  if (!parsed.success) {
    return { message: "Invalid order." };
  }

  const viewer = await requireUser(parsed.data.redirectPath || "/account");
  const supabase = await createClient();
  const { data: orderRow, error } = await supabase
    .from("orders")
    .select("id, kind, status, buyer_profile_id, listings!orders_listing_id_fkey(slug)")
    .eq("id", parsed.data.orderId)
    .maybeSingle();

  if (error || !orderRow || orderRow.buyer_profile_id !== viewer.user.id) {
    return { message: "Order not found." };
  }

  if (orderRow.kind !== "buy_now") {
    return { message: "Only buy-now reservations can be released here." };
  }

  if (orderRow.status !== "awaiting_payment") {
    return { message: "This order is no longer waiting for payment." };
  }

  const { error: cancelError, data } = await supabase.rpc("cancel_buy_now_checkout", {
    p_order_id: parsed.data.orderId,
  });

  if (cancelError) {
    return { message: cancelError.message };
  }

  const listingRelation = orderRow.listings as
    | { slug: string | null }
    | { slug: string | null }[]
    | null
    | undefined;
  const releaseResult = Array.isArray(data) ? data[0] : data;
  const listingSlug =
    (releaseResult?.listing_slug as string | null | undefined) ||
    (Array.isArray(listingRelation)
      ? listingRelation[0]?.slug
      : listingRelation?.slug) ||
    parsed.data.listingSlug ||
    null;

  revalidateMarketplacePaths(listingSlug, parsed.data.redirectPath);
  await deliverPendingNotificationEmails();

  return {
    success: true,
    message: "Reservation released. The kitchen is live again.",
  };
}

export async function markNotificationReadAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const parsed = notificationSchema.safeParse({
    notificationId: formData.get("notificationId"),
    redirectPath: formData.get("redirectPath"),
  });

  if (!parsed.success) {
    return;
  }

  const viewer = await requireUser("/account");
  const supabase = await createClient();

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", parsed.data.notificationId)
    .eq("profile_id", viewer.user.id)
    .is("read_at", null);

  revalidatePath(normaliseNotificationRedirectPath(parsed.data.redirectPath));
}

export async function markAllNotificationsReadAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const redirectPath = normaliseNotificationRedirectPath(
    String(formData.get("redirectPath") || ""),
  );
  const viewer = await requireUser("/account");
  const supabase = await createClient();

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("profile_id", viewer.user.id)
    .is("read_at", null);

  revalidatePath(redirectPath);
}
