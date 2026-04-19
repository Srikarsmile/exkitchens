import Stripe from "stripe";
import { getSiteUrl, getStripeEnv, isStripeConfigured } from "@/lib/env";
import type { OrderKind } from "@/lib/marketplace-shared";

let stripeClient: Stripe | null = null;

function getStripeClient() {
  if (!stripeClient) {
    stripeClient = new Stripe(getStripeEnv().secretKey, {
      apiVersion: "2025-08-27.basil",
      typescript: true,
    });
  }

  return stripeClient;
}

function getOrderLabel(kind: OrderKind) {
  return kind === "auction_win" ? "Auction settlement" : "Buy-now checkout";
}

export interface CheckoutOrderDetails {
  id: string;
  amountPence: number;
  kind: OrderKind;
  listingId: string;
  listingTitle: string | null;
  listingSlug: string | null;
  buyerEmail: string;
}

export async function createOrderCheckoutSession(order: CheckoutOrderDetails) {
  if (!isStripeConfigured()) {
    throw new Error("Stripe checkout is not configured yet.");
  }

  const stripe = getStripeClient();
  const siteUrl = getSiteUrl();
  const listingName = order.listingTitle || "Ex Kitchens order";

  return stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: order.buyerEmail,
    client_reference_id: order.id,
    metadata: {
      order_id: order.id,
      listing_id: order.listingId,
      listing_slug: order.listingSlug || "",
      order_kind: order.kind,
    },
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: order.amountPence,
          product_data: {
            name: listingName,
            description: getOrderLabel(order.kind),
          },
        },
      },
    ],
    success_url: `${siteUrl}/account?payment=success&order=${encodeURIComponent(order.id)}`,
    cancel_url: `${siteUrl}/account?payment=cancel&order=${encodeURIComponent(order.id)}`,
  });
}

export function getStripeWebhookClient() {
  return getStripeClient();
}
