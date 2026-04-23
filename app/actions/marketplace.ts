"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  sendListingInterestAcknowledgementEmail,
  sendListingInterestEmail,
} from "@/lib/email";
import { createOrderCheckoutSession } from "@/lib/stripe";
import { requireUser } from "@/lib/auth";
import {
  getMarketplaceSupportPhone,
  isResendConfigured,
  isSupabaseAdminConfigured,
} from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { isStripeConfigured, isSupabaseConfigured } from "@/lib/env";
import { runMarketplaceMaintenance } from "@/lib/marketplace";
import {
  formatRetryAfter,
  getClientAddress,
  takeRateLimitToken,
} from "@/lib/request-guards";

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

const listingInterestSchema = z.object({
  listingId: z.string().uuid(),
  slug: z.string().min(1),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().min(7).max(40),
  note: z.string().trim().max(1000).optional(),
  requestServices: z.boolean().default(false),
  renderedAt: z.coerce.number().int().positive(),
  website: z.string().trim().optional(),
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

function revalidateMarketplacePaths(
  slug?: string | null,
  redirectPath?: string | null,
) {
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

function createSubmissionFingerprint(input: {
  listingId: string;
  email: string;
  phone: string;
  clientAddress: string;
  userAgent: string;
}) {
  return createHash("sha256")
    .update(
      [
        input.listingId,
        input.email.trim().toLowerCase(),
        input.phone.replace(/[^\d+]/g, ""),
        input.clientAddress,
        input.userAgent,
      ].join("|"),
    )
    .digest("hex");
}

async function limitMarketplaceMutation(
  namespace: string,
  identifier: string,
  limit: number,
  windowMs: number,
) {
  const requestHeaders = await headers();

  return takeRateLimitToken({
    namespace,
    identifier: `${identifier}:${getClientAddress(requestHeaders)}`,
    limit,
    windowMs,
  });
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
  const checkoutAttemptLimit = await limitMarketplaceMutation(
    "marketplace:create-buy-now",
    `${viewer.user.id}:${parsed.data.listingId}`,
    4,
    10 * 60_000,
  );

  if (!checkoutAttemptLimit.ok) {
    return {
      message: `Too many checkout attempts. Try again ${formatRetryAfter(
        checkoutAttemptLimit.retryAfterMs,
      )}.`,
    };
  }

  const buyerEmail = viewer.user.email || viewer.profile?.email;

  if (!buyerEmail) {
    return {
      message:
        "Your account is missing an email address. Add it before starting payment.",
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

  revalidateMarketplacePaths(
    parsed.data.slug,
    `/marketplace/${parsed.data.slug}`,
  );

  const { data: orderRow } = await supabase
    .from("orders")
    .select(
      "id, kind, status, amount_pence, listings!orders_listing_id_fkey(id, slug, title, hero_image_url), buyer_profile_id",
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
        listingHeroImageUrl: listing?.hero_image_url ?? null,
        buyerEmail,
        cancelPath: `/checkout/cancel?listing=${encodeURIComponent(parsed.data.slug)}`,
      });
    } catch (error) {
      console.error("Failed to create Stripe checkout session", error);
      await supabase.rpc("cancel_buy_now_checkout", {
        p_order_id: orderRow.id,
      });
      revalidateMarketplacePaths(
        parsed.data.slug,
        `/marketplace/${parsed.data.slug}`,
      );

      return {
        message:
          "Could not open checkout right now. Please try again in a moment.",
      };
    }

    if (session.url) {
      redirect(session.url);
    }

    await supabase.rpc("cancel_buy_now_checkout", {
      p_order_id: orderRow.id,
    });
    revalidateMarketplacePaths(
      parsed.data.slug,
      `/marketplace/${parsed.data.slug}`,
    );

    return { message: "Checkout could not be opened right now." };
  }

  return {
    message:
      "The order was created, but checkout could not be opened. Open your account and retry payment there.",
  };
}

export async function submitListingInterestAction(
  _prevState: MarketplaceActionState,
  formData: FormData,
): Promise<MarketplaceActionState> {
  if (!isSupabaseConfigured()) {
    return {
      message:
        "Marketplace contact is not configured yet. Please call us instead.",
    };
  }

  const parsed = listingInterestSchema.safeParse({
    listingId: formData.get("listingId"),
    slug: formData.get("slug"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    note: formData.get("note") || undefined,
    requestServices: formData.get("requestServices") === "on",
    renderedAt: formData.get("renderedAt") || undefined,
    website: formData.get("website") || "",
  });

  if (!parsed.success) {
    const hiddenFieldIssue = parsed.error.issues.find(
      (issue) => issue.path[0] === "renderedAt" || issue.path[0] === "website",
    );

    return {
      message: hiddenFieldIssue
        ? "We could not send your details right now. Please refresh the page and try again."
        : parsed.error.issues[0]?.message ||
          "Enter your contact details to continue.",
    };
  }

  if (parsed.data.website) {
    return {
      message:
        "We could not send your details right now. Please call us instead.",
    };
  }

  const elapsedMs = Date.now() - parsed.data.renderedAt;

  if (!Number.isFinite(elapsedMs) || elapsedMs < 1_500) {
    return {
      message:
        "We could not send your details right now. Please call us instead.",
    };
  }

  if (elapsedMs > 24 * 60 * 60_000) {
    return {
      message:
        "This form has been open too long. Refresh the page and try again.",
    };
  }

  const enquiryAttemptLimit = await limitMarketplaceMutation(
    "marketplace:listing-interest",
    `${parsed.data.listingId}:${parsed.data.email}`,
    5,
    10 * 60_000,
  );

  if (!enquiryAttemptLimit.ok) {
    return {
      message: `Too many enquiry attempts. Try again ${formatRetryAfter(
        enquiryAttemptLimit.retryAfterMs,
      )}.`,
    };
  }

  const supabase = createPublicClient();
  const { data: listing, error } = await supabase
    .from("listings")
    .select("title, slug, status")
    .eq("id", parsed.data.listingId)
    .eq("slug", parsed.data.slug)
    .maybeSingle();

  if (error || !listing || listing.status !== "published") {
    return { message: "This listing is no longer available." };
  }

  const canPersistEnquiry = isSupabaseAdminConfigured();
  const canEmailEnquiry = isResendConfigured();

  if (!canPersistEnquiry && !canEmailEnquiry) {
    return {
      message: `Enquiries are not configured yet. Please call us on ${getMarketplaceSupportPhone()}.`,
    };
  }

  const requestHeaders = await headers();
  const normalisedEmail = parsed.data.email.trim().toLowerCase();
  const normalisedPhone = parsed.data.phone.replace(/\s+/g, " ").trim();
  const clientAddress = getClientAddress(requestHeaders);
  const userAgent = requestHeaders.get("user-agent")?.trim() || "unknown";
  const fingerprint = createSubmissionFingerprint({
    listingId: parsed.data.listingId,
    email: normalisedEmail,
    phone: normalisedPhone,
    clientAddress,
    userAgent,
  });

  let enquiryId: string | null = null;
  let enquiryPersisted = false;

  if (canPersistEnquiry) {
    const admin = createAdminClient();
    const duplicateWindowStart = new Date(
      Date.now() - 15 * 60_000,
    ).toISOString();
    const burstWindowStart = new Date(Date.now() - 60 * 60_000).toISOString();
    const [{ count: duplicateCount }, { count: fingerprintCount }] =
      await Promise.all([
        admin
          .from("audit_logs")
          .select("*", { head: true, count: "exact" })
          .eq("entity_type", "listing_enquiry")
          .eq("action", "listing_interest_submitted")
          .gte("created_at", duplicateWindowStart)
          .contains("payload", {
            listing_id: parsed.data.listingId,
            email_normalized: normalisedEmail,
          }),
        admin
          .from("audit_logs")
          .select("*", { head: true, count: "exact" })
          .eq("entity_type", "listing_enquiry")
          .eq("action", "listing_interest_submitted")
          .gte("created_at", burstWindowStart)
          .contains("payload", { fingerprint }),
      ]);

    if ((duplicateCount ?? 0) > 0) {
      return {
        success: true,
        message:
          "We already have your request for this kitchen and will contact you shortly.",
      };
    }

    if ((fingerprintCount ?? 0) >= 3) {
      return {
        message: `Too many enquiry attempts. Please call us on ${getMarketplaceSupportPhone()} if you need help.`,
      };
    }

    enquiryId = randomUUID();
    const enquiryPayload = {
      listing_id: parsed.data.listingId,
      listing_slug: listing.slug,
      listing_title: listing.title,
      full_name: parsed.data.fullName,
      email: parsed.data.email,
      email_normalized: normalisedEmail,
      phone: normalisedPhone,
      note: parsed.data.note?.trim() || null,
      request_services: parsed.data.requestServices,
      status: "new",
      admin_note: null,
      acknowledged_at: null,
      fingerprint,
      source: "listing_detail_page",
    };

    const { error: insertError } = await admin.from("audit_logs").insert({
      actor_id: null,
      entity_type: "listing_enquiry",
      entity_id: enquiryId,
      action: "listing_interest_submitted",
      payload: enquiryPayload,
    });

    if (insertError) {
      console.error("Failed to persist listing enquiry", insertError);
    } else {
      enquiryPersisted = true;

      const { error: notifyError } = await admin.rpc("notify_admins", {
        p_kind: "listing_enquiry",
        p_title: "New buyer enquiry",
        p_body: `${parsed.data.fullName} asked about ${listing.title}.`,
        p_entity_type: "listing_enquiry",
        p_entity_id: enquiryId,
        p_data: {
          enquiry_id: enquiryId,
          listing_id: parsed.data.listingId,
          listing_slug: listing.slug,
          listing_title: listing.title,
          buyer_email: parsed.data.email,
          buyer_phone: normalisedPhone,
        },
      });

      if (notifyError) {
        console.error(
          "Failed to notify admins about listing enquiry",
          notifyError,
        );
      }
    }
  }

  let enquiryEmailDelivered = false;
  let buyerAcknowledged = false;

  if (canEmailEnquiry) {
    try {
      const [internalEmailResult, acknowledgementResult] = await Promise.all([
        sendListingInterestEmail({
          enquiryId,
          listingTitle: listing.title,
          listingSlug: listing.slug,
          fullName: parsed.data.fullName,
          email: parsed.data.email,
          phone: normalisedPhone,
          note: parsed.data.note?.trim() || null,
          requestServices: parsed.data.requestServices,
        }),
        sendListingInterestAcknowledgementEmail({
          enquiryId,
          recipientEmail: parsed.data.email,
          recipientName: parsed.data.fullName,
          listingTitle: listing.title,
          listingSlug: listing.slug,
          requestServices: parsed.data.requestServices,
        }),
      ]);

      if (internalEmailResult.error) {
        console.error(
          "Failed to send listing enquiry email",
          internalEmailResult.error,
        );
      } else {
        enquiryEmailDelivered = true;
      }

      if (acknowledgementResult.error) {
        console.error(
          "Failed to send listing enquiry acknowledgement email",
          acknowledgementResult.error,
        );
      } else {
        buyerAcknowledged = true;
      }
    } catch (emailError) {
      console.error("Listing enquiry email threw unexpectedly", emailError);
    }
  }

  if (buyerAcknowledged && enquiryPersisted && enquiryId) {
    const admin = createAdminClient();
    const acknowledgedAt = new Date().toISOString();

    await admin
      .from("audit_logs")
      .update({
        payload: {
          listing_id: parsed.data.listingId,
          listing_slug: listing.slug,
          listing_title: listing.title,
          full_name: parsed.data.fullName,
          email: parsed.data.email,
          email_normalized: normalisedEmail,
          phone: normalisedPhone,
          note: parsed.data.note?.trim() || null,
          request_services: parsed.data.requestServices,
          status: "new",
          admin_note: null,
          acknowledged_at: acknowledgedAt,
          fingerprint,
          source: "listing_detail_page",
        },
      })
      .eq("entity_type", "listing_enquiry")
      .eq("entity_id", enquiryId);
  }

  if (!enquiryPersisted && !enquiryEmailDelivered) {
    return {
      message:
        "We could not send your details right now. Please try again in a moment.",
    };
  }

  return {
    success: true,
    message:
      "Thanks. Your details are with Ex Kitchens and the team will contact you shortly.",
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
  const checkoutResumeLimit = await limitMarketplaceMutation(
    "marketplace:start-order-checkout",
    `${viewer.user.id}:${parsed.data.orderId}`,
    6,
    10 * 60_000,
  );

  if (!checkoutResumeLimit.ok) {
    return {
      message: `Too many checkout attempts. Try again ${formatRetryAfter(
        checkoutResumeLimit.retryAfterMs,
      )}.`,
    };
  }

  const supabase = await createClient();
  const { data: orderRow, error } = await supabase
    .from("orders")
    .select(
      "id, kind, status, amount_pence, buyer_profile_id, listings!orders_listing_id_fkey(id, slug, title, hero_image_url)",
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
      listingHeroImageUrl: listing?.hero_image_url ?? null,
      buyerEmail,
    });
  } catch (error) {
    console.error("Failed to create Stripe checkout session", error);
    return {
      message:
        "Could not open checkout right now. Please try again in a moment.",
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
  const releaseLimit = await limitMarketplaceMutation(
    "marketplace:cancel-buy-now",
    `${viewer.user.id}:${parsed.data.orderId}`,
    8,
    10 * 60_000,
  );

  if (!releaseLimit.ok) {
    return {
      message: `Too many release attempts. Try again ${formatRetryAfter(
        releaseLimit.retryAfterMs,
      )}.`,
    };
  }

  const supabase = await createClient();
  const { data: orderRow, error } = await supabase
    .from("orders")
    .select(
      "id, kind, status, buyer_profile_id, listings!orders_listing_id_fkey(slug)",
    )
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

  const { error: cancelError, data } = await supabase.rpc(
    "cancel_buy_now_checkout",
    {
      p_order_id: parsed.data.orderId,
    },
  );

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
