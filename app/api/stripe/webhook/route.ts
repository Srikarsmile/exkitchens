import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { sendOrderConfirmationEmail } from "@/lib/email";
import {
  getStripeEnv,
  isStripeConfigured,
  isSupabaseAdminConfigured,
} from "@/lib/env";
import { releasePendingBuyNowOrder } from "@/lib/orders";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeWebhookClient } from "@/lib/stripe";

export async function POST(request: Request) {
  if (!isStripeConfigured() || !isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured." },
      { status: 503 },
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripeWebhookClient().webhooks.constructEvent(
      body,
      signature,
      getStripeEnv().webhookSecret,
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid signature." },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    await handleCheckoutCompleted(
      event.data.object as Stripe.Checkout.Session,
    );
  }

  if (event.type === "checkout.session.expired") {
    await handleCheckoutExpired(
      event.data.object as Stripe.Checkout.Session,
    );
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.order_id;

  if (!orderId) {
    return;
  }

  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, status, listing_id, buyer_profile_id, seller_profile_id, amount_pence, listings!orders_listing_id_fkey(title, slug), buyer:profiles!orders_buyer_profile_id_fkey(full_name, email)",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!order || order.status !== "awaiting_payment") {
    return;
  }

  const now = new Date().toISOString();
  const paymentReference =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.id;
  const paymentNotes = getCheckoutPaymentNotes(session);

  await supabase
    .from("orders")
    .update({
      status: "paid",
      paid_at: now,
      payment_reference: paymentReference,
      payment_notes: paymentNotes,
    })
    .eq("id", orderId);

  const notifications: Array<{
    profile_id: string;
    kind: string;
    title: string;
    body: string;
    entity_type: string;
    entity_id: string;
    data: {
      listing_id: string;
      listing_slug?: string | null;
      status: string;
    };
  }> = [];

  if (order.buyer_profile_id) {
    notifications.push({
      profile_id: order.buyer_profile_id,
      kind: "payment_received",
      title: "Payment received",
      body: "Your payment cleared and the order is marked as paid.",
      entity_type: "order",
      entity_id: orderId,
      data: {
        listing_id: order.listing_id,
        listing_slug: getListingSlug(order.listings),
        status: "paid",
      },
    });
  }

  if (order.seller_profile_id) {
    notifications.push({
      profile_id: order.seller_profile_id,
      kind: "sale_paid",
      title: "Order paid",
      body: "The buyer completed payment. Settlement can move forward.",
      entity_type: "order",
      entity_id: orderId,
      data: {
        listing_id: order.listing_id,
        listing_slug: getListingSlug(order.listings),
        status: "paid",
      },
    });
  }

  if (notifications.length > 0) {
    await supabase.from("notifications").insert(notifications);
  }

  const buyerProfile = Array.isArray(order.buyer) ? order.buyer[0] : order.buyer;
  const recipientEmail =
    session.customer_details?.email?.trim() || buyerProfile?.email?.trim();
  const listingTitle = getListingTitle(order.listings);

  if (recipientEmail && listingTitle) {
    try {
      const result = await sendOrderConfirmationEmail({
        recipientEmail,
        recipientName: buyerProfile?.full_name ?? null,
        listingTitle,
        amountPence: order.amount_pence,
        orderId,
      });

      if (result.error) {
        console.error("Order confirmation email failed after checkout", result.error);
      }
    } catch (error) {
      console.error("Order confirmation email threw after checkout", error);
    }
  }
}

function getCheckoutPaymentNotes(session: Stripe.Checkout.Session) {
  const notes = ["Paid via Stripe Checkout"];
  const checkoutEmail = session.customer_details?.email?.trim();
  const checkoutPhone = session.customer_details?.phone?.trim();

  if (checkoutEmail) {
    notes.push(`Checkout email: ${checkoutEmail}`);
  }

  if (checkoutPhone) {
    notes.push(`Checkout phone: ${checkoutPhone}`);
  }

  return notes.join("\n");
}

function getListingSlug(
  listing:
    | { slug: string | null; title: string | null }
    | { slug: string | null; title: string | null }[]
    | null
    | undefined,
) {
  const item = Array.isArray(listing) ? listing[0] : listing;
  return item?.slug ?? null;
}

function getListingTitle(
  listing:
    | { slug: string | null; title: string | null }
    | { slug: string | null; title: string | null }[]
    | null
    | undefined,
) {
  const item = Array.isArray(listing) ? listing[0] : listing;
  return item?.title ?? null;
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.order_id;

  if (!orderId) {
    return;
  }

  await releasePendingBuyNowOrder({
    orderId,
    reason: "Stripe checkout session expired before payment completed.",
  });
}
