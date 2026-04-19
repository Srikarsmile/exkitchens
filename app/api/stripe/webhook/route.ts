import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { deliverPendingNotificationEmails } from "@/lib/email";
import {
  getStripeEnv,
  isStripeConfigured,
  isSupabaseAdminConfigured,
} from "@/lib/env";
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
    .select("id, status, listing_id, buyer_profile_id, seller_profile_id")
    .eq("id", orderId)
    .maybeSingle();

  if (!order || order.status === "paid" || order.status === "fulfilled") {
    return;
  }

  const now = new Date().toISOString();
  const paymentReference =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.id;

  await supabase
    .from("orders")
    .update({
      status: "paid",
      paid_at: now,
      payment_reference: paymentReference,
      payment_notes: "Paid via Stripe Checkout",
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
        status: "paid",
      },
    });
  }

  if (notifications.length > 0) {
    await supabase.from("notifications").insert(notifications);
  }

  await deliverPendingNotificationEmails();
}
