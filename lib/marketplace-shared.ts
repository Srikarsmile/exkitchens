export type AppRole = "buyer" | "seller" | "admin";
export type BidderStatus = "pending" | "approved" | "rejected";
export type ListingSaleType = "auction" | "buy_now";
export type ListingStatus = "draft" | "published" | "sold" | "archived";
export type AuctionStatus = "scheduled" | "live" | "ended" | "cancelled";
export type OrderKind = "auction_win" | "buy_now";
export type OrderStatus =
  | "awaiting_payment"
  | "paid"
  | "fulfilled"
  | "cancelled"
  | "refunded";

export interface AuctionSnapshot {
  id: string;
  status: AuctionStatus;
  startAt: string;
  endAt: string;
  currentBidPence: number | null;
  bidCount: number;
  minimumNextBidPence: number | null;
  reservePricePence: number | null;
  reserveMet: boolean;
}

export interface ListingCardData {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  summary: string | null;
  saleType: ListingSaleType;
  heroImageUrl: string | null;
  tags: string[];
  status: ListingStatus;
  originalPricePence: number | null;
  buyNowPricePence: number | null;
  startingBidPence: number | null;
  bidIncrementPence: number;
  reservePricePence: number | null;
  currentPricePence: number | null;
  featured: boolean;
  sellerProfileId: string | null;
  winnerProfileId: string | null;
  settlementOrderId: string | null;
  auction: AuctionSnapshot | null;
}

export interface OrderSummary {
  id: string;
  kind: OrderKind;
  status: OrderStatus;
  amountPence: number;
  dueAt: string | null;
  paymentReference: string | null;
  paymentNotes: string | null;
  createdAt: string;
  listingId: string;
  listingSlug: string | null;
  listingTitle: string | null;
}

export interface ListingDetailData extends ListingCardData {
  description: string | null;
  location: string | null;
  galleryUrls: string[];
  isWatched: boolean;
  order: OrderSummary | null;
}

export interface PublicBidFeedItem {
  id: string;
  amountPence: number;
  createdAt: string;
  isCurrent: boolean;
}

export interface AccountBidItem {
  id: string;
  amountPence: number;
  createdAt: string;
  listingId: string | null;
  listingSlug: string | null;
  listingTitle: string | null;
  auctionStatus: AuctionStatus | null;
  auctionEndsAt: string | null;
  isWinningBid: boolean;
}

export interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  data: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
}

export const ADMIN_NOTIFICATION_KINDS = ["order_created"] as const;

export function isAdminNotificationKind(kind: string) {
  return ADMIN_NOTIFICATION_KINDS.includes(
    kind as (typeof ADMIN_NOTIFICATION_KINDS)[number],
  );
}

export interface AccountDashboardData {
  bids: AccountBidItem[];
  watchlist: ListingCardData[];
  notifications: NotificationItem[];
  buyerOrders: OrderSummary[];
  sellerOrders: OrderSummary[];
  sellerListings: ListingCardData[];
}

export interface AdminUserRecord {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  role: AppRole;
  bidderStatus: BidderStatus;
  bidderStatusReason: string | null;
  phoneVerifiedAt: string | null;
  bidderApprovedAt: string | null;
  createdAt: string;
}

export interface SellerOption {
  id: string;
  label: string;
  role: AppRole;
}

export interface AdminOrderRecord extends OrderSummary {
  buyerName: string | null;
  buyerEmail: string | null;
  sellerName: string | null;
  sellerEmail: string | null;
}

export function formatMoney(pence: number | null | undefined) {
  if (pence == null) {
    return "TBC";
  }

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(pence / 100);
}

export function calculatePercentageOff(
  originalPricePence: number | null | undefined,
  offerPricePence: number | null | undefined,
) {
  if (
    originalPricePence == null ||
    offerPricePence == null ||
    originalPricePence <= 0 ||
    offerPricePence <= 0 ||
    offerPricePence >= originalPricePence
  ) {
    return null;
  }

  return Math.round(((originalPricePence - offerPricePence) / originalPricePence) * 100);
}

export function formatTimeRemaining(endAt: string | null | undefined) {
  if (!endAt) {
    return "No deadline";
  }

  const diffMs = new Date(endAt).getTime() - Date.now();

  if (diffMs <= 0) {
    return "Ended";
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "TBC";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatOrderStatus(status: OrderStatus) {
  switch (status) {
    case "awaiting_payment":
      return "Awaiting payment";
    case "paid":
      return "Paid";
    case "fulfilled":
      return "Fulfilled";
    case "cancelled":
      return "Cancelled";
    case "refunded":
      return "Refunded";
    default:
      return status;
  }
}

export function formatBidderStatus(status: BidderStatus) {
  switch (status) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "pending":
    default:
      return "Pending review";
  }
}

export function bidAmountToPence(value: string | number) {
  const numeric = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numeric)) {
    return null;
  }

  return Math.round(numeric * 100);
}
