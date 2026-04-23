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

type CheckoutBrandingSettings = {
  background_color: string;
  border_style: "pill" | "rectangular" | "rounded";
  button_color: string;
  display_name: string;
  font_family: "default" | "inter" | "lora" | "open_sans";
  logo: {
    type: "url";
    url: string;
  };
};

type BrandedCheckoutSessionCreateParams = Stripe.Checkout.SessionCreateParams & {
  branding_settings?: CheckoutBrandingSettings;
};

export interface CheckoutOrderDetails {
  id: string;
  amountPence: number;
  kind: OrderKind;
  listingId: string;
  listingTitle: string | null;
  listingSlug: string | null;
  listingHeroImageUrl?: string | null;
  buyerEmail: string;
  successPath?: string | null;
  cancelPath?: string | null;
}

function getAbsoluteUrl(siteUrl: string, value: string) {
  return new URL(value, siteUrl).href;
}

function getCheckoutImageUrls({
  siteUrl,
  listingHeroImageUrl,
}: {
  siteUrl: string;
  listingHeroImageUrl?: string | null;
}) {
  if (!listingHeroImageUrl) {
    return [];
  }

  return [getAbsoluteUrl(siteUrl, listingHeroImageUrl)].slice(0, 8);
}

export async function createOrderCheckoutSession(order: CheckoutOrderDetails) {
  if (!isStripeConfigured()) {
    throw new Error("Stripe checkout is not configured yet.");
  }

  const stripe = getStripeClient();
  const siteUrl = getSiteUrl();
  const listingName = order.listingTitle || "Ex Kitchens order";
  const successPath = order.successPath || "/account?payment=success";
  const cancelPath = order.cancelPath || "/account?payment=cancel";
  const productImages = getCheckoutImageUrls({
    siteUrl,
    listingHeroImageUrl: order.listingHeroImageUrl,
  });
  const productData: NonNullable<
    NonNullable<
      NonNullable<Stripe.Checkout.SessionCreateParams.LineItem["price_data"]>
    >["product_data"]
  > = {
    name: listingName,
    description: getOrderLabel(order.kind),
  };

  if (productImages.length > 0) {
    productData.images = productImages;
  }

  const sessionParams: BrandedCheckoutSessionCreateParams = {
    mode: "payment",
    adaptive_pricing: {
      enabled: false,
    },
    customer_email: order.buyerEmail,
    client_reference_id: order.id,
    branding_settings: {
      background_color: "#ffffff",
      border_style: "rounded",
      button_color: "#111111",
      display_name: "Ex Kitchens",
      font_family: "inter",
      logo: {
        type: "url",
        url: getAbsoluteUrl(siteUrl, "/assets/exkitchens_leaf_logo.png"),
      },
    },
    locale: "en-GB",
    metadata: {
      order_id: order.id,
      listing_id: order.listingId,
      listing_slug: order.listingSlug || "",
      order_kind: order.kind,
    },
    payment_method_types: ["card"],
    wallet_options: {
      link: {
        display: "never",
      },
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: order.amountPence,
          product_data: productData,
        },
      },
    ],
    success_url: `${siteUrl}${successPath}`,
    cancel_url: `${siteUrl}${cancelPath}`,
  };

  return stripe.checkout.sessions.create(sessionParams);
}

export function getStripeWebhookClient() {
  return getStripeClient();
}
