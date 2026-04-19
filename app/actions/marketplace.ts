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

const notificationSchema = z.object({
  notificationId: z.string().uuid(),
});

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

  if (isStripeConfigured()) {
    const { data: orderRow } = await supabase
      .from("orders")
      .select(
        "id, kind, status, amount_pence, listings(id, slug, title), buyer_profile_id",
      )
      .eq("listing_id", parsed.data.listingId)
      .eq("buyer_profile_id", viewer.user.id)
      .eq("status", "awaiting_payment")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (orderRow) {
      const buyerEmail = viewer.user.email || viewer.profile?.email;

      if (!buyerEmail) {
        return {
          success: true,
          message:
            "Order created. Add an email address to the account before starting online payment.",
        };
      }

      const listing = Array.isArray(orderRow.listings)
        ? orderRow.listings[0]
        : orderRow.listings;
      const session = await createOrderCheckoutSession({
        id: orderRow.id,
        amountPence: orderRow.amount_pence,
        kind: orderRow.kind,
        listingId: listing?.id ?? parsed.data.listingId,
        listingTitle: listing?.title ?? null,
        listingSlug: listing?.slug ?? parsed.data.slug,
        buyerEmail,
      });

      if (session.url) {
        redirect(session.url);
      }
    }
  }

  return {
    success: true,
    message: "Order created. Payment is now tracked in your account.",
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
        "Stripe checkout is not configured yet. The order stays visible in your account until payment keys are added.",
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
      "id, kind, status, amount_pence, buyer_profile_id, listings(id, slug, title)",
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

  if (!viewer.user.email) {
    return { message: "Your account is missing an email address." };
  }

  const listing = Array.isArray(orderRow.listings)
    ? orderRow.listings[0]
    : orderRow.listings;

  const session = await createOrderCheckoutSession({
    id: orderRow.id,
    amountPence: orderRow.amount_pence,
    kind: orderRow.kind,
    listingId: listing?.id ?? "",
    listingTitle: listing?.title ?? null,
    listingSlug: listing?.slug ?? null,
    buyerEmail: viewer.user.email,
  });

  if (!session.url) {
    return { message: "Stripe did not return a checkout URL." };
  }

  redirect(session.url);
}

export async function markNotificationReadAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const parsed = notificationSchema.safeParse({
    notificationId: formData.get("notificationId"),
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

  revalidatePath("/account");
}

export async function markAllNotificationsReadAction() {
  if (!isSupabaseConfigured()) {
    return;
  }

  const viewer = await requireUser("/account");
  const supabase = await createClient();

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("profile_id", viewer.user.id)
    .is("read_at", null);

  revalidatePath("/account");
}
