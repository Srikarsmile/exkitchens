"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { deliverPendingNotificationEmails } from "@/lib/email";
import {
  getListingImageHostPolicyMessage,
  isAllowedListingImageUrl,
} from "@/lib/listing-image-hosts";
import {
  readGalleryImageFiles,
  readHeroImageFile,
  removeListingImages,
  uploadListingImages,
} from "@/lib/listing-image-storage";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { bidAmountToPence } from "@/lib/marketplace-shared";
import { runMarketplaceMaintenance } from "@/lib/marketplace";

export interface AdminActionState {
  message?: string;
  success?: boolean;
  listingSlug?: string;
}

const createListingSchema = z.object({
  title: z.string().trim().min(3, "Title is too short."),
  slug: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  summary: z.string().trim().min(10, "Add a short summary."),
  description: z.string().trim().optional(),
  location: z.string().trim().optional(),
  uploadedHeroImageUrl: z.string().trim().optional(),
  uploadedGalleryUrls: z.string().optional(),
  uploadedHeroImagePath: z.string().trim().optional(),
  uploadedGalleryPaths: z.string().optional(),
  heroImageUrl: z
    .string()
    .trim()
    .refine(
      (value) =>
        !value || value.startsWith("/") || z.string().url().safeParse(value).success,
      "Hero image must be a valid URL or site-relative path.",
    ),
  galleryUrls: z.string().optional(),
  tags: z.string().optional(),
  saleType: z.enum(["auction", "buy_now"]),
  originalPrice: z.coerce.number().positive().optional(),
  buyNowPrice: z.coerce.number().positive().optional(),
  startingBid: z.coerce.number().positive().optional(),
  bidIncrement: z.coerce.number().positive().optional(),
  reservePrice: z.coerce.number().positive().optional(),
  auctionStartsAt: z.string().optional(),
  auctionEndsAt: z.string().optional(),
  auctionStartsAtOffsetMinutes: z.coerce.number().int().min(-840).max(840).optional(),
  auctionEndsAtOffsetMinutes: z.coerce.number().int().min(-840).max(840).optional(),
  sellerProfileId: z.string().uuid().optional().or(z.literal("")),
  featured: z.boolean().optional(),
});

const updateUserAccessSchema = z.object({
  profileId: z.string().uuid(),
  role: z.enum(["buyer", "seller", "admin"]),
  bidderStatus: z.enum(["pending", "approved", "rejected"]),
  bidderStatusReason: z.string().trim().optional(),
  phoneVerified: z.boolean().optional(),
});

const updateListingStatusSchema = z.object({
  listingId: z.string().uuid(),
  status: z.enum(["draft", "published", "archived", "sold"]),
  slug: z.string().trim().optional(),
});

const auctionActionSchema = z.object({
  auctionId: z.string().uuid(),
  listingId: z.string().uuid(),
  slug: z.string().trim().optional(),
});

const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  listingId: z.string().uuid(),
  listingSlug: z.string().trim().optional(),
  status: z.enum([
    "awaiting_payment",
    "paid",
    "fulfilled",
    "cancelled",
    "refunded",
  ]),
  paymentReference: z.string().trim().optional(),
  paymentNotes: z.string().trim().optional(),
});

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normaliseTagList(input: string | undefined) {
  return (input || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normaliseGalleryUrls(input: string | undefined) {
  return (input || "")
    .split(/\r?\n|,/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function normaliseDateTimeInput(
  input: string | undefined,
  offsetMinutes: number | undefined,
) {
  const value = input?.trim();

  if (!value) {
    return null;
  }

  if (offsetMinutes == null || !Number.isFinite(offsetMinutes)) {
    return null;
  }

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second = "0"] = match;
  const utcTimestamp =
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    ) +
    offsetMinutes * 60_000;

  return new Date(utcTimestamp).toISOString();
}

function revalidateAppPaths(slug?: string | null) {
  revalidatePath("/");
  revalidatePath("/marketplace");
  revalidatePath("/admin");
  revalidatePath("/account");

  if (slug) {
    revalidatePath(`/marketplace/${slug}`);
  }
}

async function cleanupListingImages(paths: string[]) {
  if (paths.length === 0) {
    return;
  }

  try {
    await removeListingImages(paths);
  } catch {
    // Cleanup is best-effort and should not replace the original failure.
  }
}

export async function createListingAction(
  _prevState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  if (!isSupabaseConfigured()) {
    return {
      message:
        "Supabase is not configured yet. Add the environment variables before creating listings.",
    };
  }

  const parsed = createListingSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    brand: formData.get("brand"),
    summary: formData.get("summary"),
    description: formData.get("description"),
    location: formData.get("location"),
    uploadedHeroImageUrl: formData.get("uploadedHeroImageUrl"),
    uploadedGalleryUrls: formData.get("uploadedGalleryUrls"),
    uploadedHeroImagePath: formData.get("uploadedHeroImagePath"),
    uploadedGalleryPaths: formData.get("uploadedGalleryPaths"),
    heroImageUrl: formData.get("heroImageUrl"),
    galleryUrls: formData.get("galleryUrls"),
    tags: formData.get("tags"),
    saleType: formData.get("saleType"),
    originalPrice: formData.get("originalPrice") || undefined,
    buyNowPrice: formData.get("buyNowPrice") || undefined,
    startingBid: formData.get("startingBid") || undefined,
    bidIncrement: formData.get("bidIncrement") || undefined,
    reservePrice: formData.get("reservePrice") || undefined,
    auctionStartsAt: formData.get("auctionStartsAt")?.toString().trim() || undefined,
    auctionEndsAt: formData.get("auctionEndsAt")?.toString().trim() || undefined,
    auctionStartsAtOffsetMinutes:
      formData.get("auctionStartsAtOffsetMinutes")?.toString().trim() || undefined,
    auctionEndsAtOffsetMinutes:
      formData.get("auctionEndsAtOffsetMinutes")?.toString().trim() || undefined,
    sellerProfileId: formData.get("sellerProfileId")?.toString().trim() || undefined,
    featured: formData.get("featured") === "on",
  });

  if (!parsed.success) {
    return {
      message: parsed.error.issues[0]?.message || "Invalid listing data.",
    };
  }

  const admin = await requireAdmin("/admin/listings/new");
  const data = parsed.data;
  const slug = slugify(data.slug || data.title);
  const heroFile = readHeroImageFile(formData);
  const galleryFiles = readGalleryImageFiles(formData);
  const auctionStartsAt = normaliseDateTimeInput(
    data.auctionStartsAt,
    data.auctionStartsAtOffsetMinutes,
  );
  const auctionEndsAt = normaliseDateTimeInput(
    data.auctionEndsAt,
    data.auctionEndsAtOffsetMinutes,
  );
  let uploadedPaths = [
    ...(data.uploadedHeroImagePath ? [data.uploadedHeroImagePath] : []),
    ...normaliseGalleryUrls(data.uploadedGalleryPaths),
  ];

  if (data.auctionStartsAt && !auctionStartsAt) {
    await cleanupListingImages(uploadedPaths);
    return {
      message:
        "Auction start time is not valid. Pick the date again so the timezone can be captured.",
    };
  }

  if (data.auctionEndsAt && !auctionEndsAt) {
    await cleanupListingImages(uploadedPaths);
    return {
      message:
        "Auction end time is not valid. Pick the date again so the timezone can be captured.",
    };
  }

  let heroImageUrl = data.uploadedHeroImageUrl || data.heroImageUrl || null;
  let galleryImageUrls = [
    ...normaliseGalleryUrls(data.uploadedGalleryUrls),
    ...normaliseGalleryUrls(data.galleryUrls),
  ];

  const invalidHostedImageUrls = [heroImageUrl, ...galleryImageUrls].filter(
    (value): value is string => Boolean(value && !isAllowedListingImageUrl(value)),
  );

  if (invalidHostedImageUrls.length > 0) {
    await cleanupListingImages(uploadedPaths);
    return {
      message: getListingImageHostPolicyMessage(),
    };
  }

  if (heroFile || galleryFiles.length > 0) {
    try {
      const uploaded = await uploadListingImages({
        listingSlug: slug,
        heroFile,
        galleryFiles,
      });

      uploadedPaths = [...uploadedPaths, ...uploaded.uploadedPaths];
      heroImageUrl = uploaded.heroImageUrl || heroImageUrl;
      galleryImageUrls = [...uploaded.galleryImageUrls, ...galleryImageUrls];
    } catch (error) {
      await cleanupListingImages(uploadedPaths);
      return {
        message:
          error instanceof Error
            ? error.message
            : "Image upload failed. Try again.",
      };
    }
  }

  const supabase = await createClient();

  const { data: listingResult, error } = await supabase.rpc("create_listing_with_auction", {
    p_title: data.title,
    p_slug: slug,
    p_brand: data.brand || null,
    p_summary: data.summary,
    p_description: data.description || null,
    p_location: data.location || null,
    p_hero_image_url: heroImageUrl,
    p_gallery_urls: galleryImageUrls,
    p_tags: normaliseTagList(data.tags),
    p_sale_type: data.saleType,
    p_featured: data.featured ?? false,
    p_original_price_pence:
      data.originalPrice != null ? bidAmountToPence(data.originalPrice) : null,
    p_buy_now_price_pence:
      data.buyNowPrice != null ? bidAmountToPence(data.buyNowPrice) : null,
    p_starting_bid_pence:
      data.startingBid != null ? bidAmountToPence(data.startingBid) : null,
    p_bid_increment_pence: bidAmountToPence(data.bidIncrement ?? 50) ?? 5000,
    p_reserve_price_pence:
      data.reservePrice != null ? bidAmountToPence(data.reservePrice) : null,
    p_auction_starts_at: auctionStartsAt,
    p_auction_ends_at: auctionEndsAt,
    p_seller_profile_id: data.sellerProfileId || admin.user?.id || null,
  });

  if (error) {
    await cleanupListingImages(uploadedPaths);
    return { message: error.message };
  }

  const created = Array.isArray(listingResult) ? listingResult[0] : listingResult;
  revalidateAppPaths(created?.listing_slug ?? slug);

  return {
    success: true,
    message: `Listing created: ${created?.listing_slug ?? slug}`,
    listingSlug: created?.listing_slug ?? slug,
  };
}

export async function updateUserAccessAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const parsed = updateUserAccessSchema.safeParse({
    profileId: formData.get("profileId"),
    role: formData.get("role"),
    bidderStatus: formData.get("bidderStatus"),
    bidderStatusReason: formData.get("bidderStatusReason")?.toString().trim() || undefined,
    phoneVerified: formData.get("phoneVerified") === "on",
  });

  if (!parsed.success) {
    return;
  }

  const admin = await requireAdmin("/admin");
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role, bidder_status, phone_verified_at")
    .eq("id", parsed.data.profileId)
    .maybeSingle();

  const updatePayload = {
    role: parsed.data.role,
    bidder_status: parsed.data.bidderStatus,
    bidder_status_reason: parsed.data.bidderStatusReason || null,
    bidder_approved_at:
      parsed.data.bidderStatus === "approved" ? now : null,
    bidder_approved_by:
      parsed.data.bidderStatus === "approved" ? admin.user?.id ?? null : null,
    phone_verified_at: parsed.data.phoneVerified
      ? currentProfile?.phone_verified_at || now
      : null,
  };

  const { error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", parsed.data.profileId);

  if (!error && currentProfile) {
    const shouldNotify =
      currentProfile.bidder_status !== parsed.data.bidderStatus ||
      currentProfile.role !== parsed.data.role;

    if (shouldNotify) {
      await supabase.from("notifications").insert({
        profile_id: parsed.data.profileId,
        kind: "account_updated",
        title: "Account status updated",
        body:
          parsed.data.bidderStatus === "approved"
            ? "Your account is approved for bidding."
            : parsed.data.bidderStatus === "rejected"
              ? "Your bidder approval was declined."
              : "Your bidder approval is pending review.",
        entity_type: "profile",
        entity_id: parsed.data.profileId,
        data: {
          role: parsed.data.role,
          bidder_status: parsed.data.bidderStatus,
        },
      });
    }
  }

  revalidateAppPaths();
  await deliverPendingNotificationEmails();
}

export async function updateListingStatusAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const parsed = updateListingStatusSchema.safeParse({
    listingId: formData.get("listingId"),
    status: formData.get("status"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    return;
  }

  await requireAdmin("/admin");
  const supabase = await createClient();

  const { data: listing } = await supabase
    .from("listings")
    .select("id, sale_type")
    .eq("id", parsed.data.listingId)
    .maybeSingle();

  await supabase
    .from("listings")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.listingId);

  if (parsed.data.status === "archived" && listing?.sale_type === "auction") {
    await supabase
      .from("auctions")
      .update({
        status: "cancelled",
        cancelled_reason: "Listing archived by admin",
        ended_at: new Date().toISOString(),
      })
      .eq("listing_id", parsed.data.listingId)
      .in("status", ["scheduled", "live"]);
  }

  revalidateAppPaths(parsed.data.slug);
  await deliverPendingNotificationEmails();
}

export async function closeAuctionAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const parsed = auctionActionSchema.safeParse({
    auctionId: formData.get("auctionId"),
    listingId: formData.get("listingId"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    return;
  }

  await requireAdmin("/admin");
  const supabase = await createClient();

  await supabase
    .from("auctions")
    .update({
      end_at: new Date().toISOString(),
      status: "ended",
      ended_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.auctionId);

  await runMarketplaceMaintenance(supabase);
  revalidateAppPaths(parsed.data.slug);
}

export async function cancelAuctionAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const parsed = auctionActionSchema.safeParse({
    auctionId: formData.get("auctionId"),
    listingId: formData.get("listingId"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    return;
  }

  await requireAdmin("/admin");
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: auction } = await supabase
    .from("auctions")
    .select("current_bid_id")
    .eq("id", parsed.data.auctionId)
    .maybeSingle();

  await supabase
    .from("auctions")
    .update({
      status: "cancelled",
      cancelled_reason: "Cancelled by admin",
      ended_at: now,
    })
    .eq("id", parsed.data.auctionId);

  await supabase
    .from("listings")
    .update({ status: "archived" })
    .eq("id", parsed.data.listingId);

  if (auction?.current_bid_id) {
    const { data: currentBid } = await supabase
      .from("bids")
      .select("bidder_id")
      .eq("id", auction.current_bid_id)
      .maybeSingle();

    if (currentBid?.bidder_id) {
      await supabase.from("notifications").insert({
        profile_id: currentBid.bidder_id,
        kind: "auction_cancelled",
        title: "Auction cancelled",
        body: "An admin cancelled the auction before settlement.",
        entity_type: "auction",
        entity_id: parsed.data.auctionId,
        data: {
          listing_id: parsed.data.listingId,
        },
      });
    }
  }

  revalidateAppPaths(parsed.data.slug);
}

export async function updateOrderStatusAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const parsed = updateOrderStatusSchema.safeParse({
    orderId: formData.get("orderId"),
    listingId: formData.get("listingId"),
    listingSlug: formData.get("listingSlug"),
    status: formData.get("status"),
    paymentReference: formData.get("paymentReference")?.toString().trim() || undefined,
    paymentNotes: formData.get("paymentNotes")?.toString().trim() || undefined,
  });

  if (!parsed.success) {
    return;
  }

  await requireAdmin("/admin");
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: order } = await supabase
    .from("orders")
    .select("id, buyer_profile_id, seller_profile_id, auction_id, kind")
    .eq("id", parsed.data.orderId)
    .maybeSingle();

  const updatePayload = {
    status: parsed.data.status,
    payment_reference: parsed.data.paymentReference || null,
    payment_notes: parsed.data.paymentNotes || null,
    paid_at:
      parsed.data.status === "paid" || parsed.data.status === "fulfilled" ? now : null,
    fulfilled_at: parsed.data.status === "fulfilled" ? now : null,
    cancelled_at:
      parsed.data.status === "cancelled" || parsed.data.status === "refunded" ? now : null,
  };

  await supabase.from("orders").update(updatePayload).eq("id", parsed.data.orderId);

  if (parsed.data.status === "cancelled" || parsed.data.status === "refunded") {
    await supabase
      .from("listings")
      .update({
        status: "published",
        winner_profile_id: null,
        sold_at: null,
        settlement_order_id: null,
      })
      .eq("id", parsed.data.listingId);
  }

  if (order?.buyer_profile_id) {
    await supabase.from("notifications").insert({
      profile_id: order.buyer_profile_id,
      kind: "order_updated",
      title: "Order updated",
      body:
        parsed.data.status === "paid"
          ? "Your order is marked as paid."
          : parsed.data.status === "fulfilled"
            ? "Your order is marked as fulfilled."
            : parsed.data.status === "cancelled"
              ? "Your order was cancelled."
              : parsed.data.status === "refunded"
                ? "Your order was refunded."
                : "Your order is awaiting payment.",
      entity_type: "order",
      entity_id: parsed.data.orderId,
      data: {
        listing_id: parsed.data.listingId,
        status: parsed.data.status,
      },
    });
  }

  if (order?.seller_profile_id) {
    await supabase.from("notifications").insert({
      profile_id: order.seller_profile_id,
      kind: "order_updated",
      title: "Sale updated",
      body: `Order status changed to ${parsed.data.status.replaceAll("_", " ")}.`,
      entity_type: "order",
      entity_id: parsed.data.orderId,
      data: {
        listing_id: parsed.data.listingId,
        status: parsed.data.status,
      },
    });
  }

  revalidateAppPaths(parsed.data.listingSlug);
  await deliverPendingNotificationEmails();
}
