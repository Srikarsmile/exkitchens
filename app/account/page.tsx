import Link from "next/link";
import OrderCheckoutButton from "@/app/account/OrderCheckoutButton";
import SignOutButton from "@/app/account/SignOutButton";
import RealtimeRefresh from "@/app/components/RealtimeRefresh";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
  toggleWatchlistAction,
} from "@/app/actions/marketplace";
import { requireUser } from "@/lib/auth";
import { getAccountDashboard } from "@/lib/account";
import {
  formatBidderStatus,
  formatDateTime,
  formatMoney,
  formatOrderStatus,
  formatTimeRemaining,
} from "@/lib/marketplace-shared";

interface AccountPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = await searchParams;
  const { user, profile } = await requireUser("/account");
  const email = user?.email ?? profile?.email ?? "Unknown account";
  const dashboard = await getAccountDashboard(user.id, profile?.role || "buyer");
  const unreadNotifications = dashboard.notifications.filter((item) => !item.readAt).length;
  const paymentState =
    typeof params.payment === "string" ? params.payment : null;
  const passwordUpdated = params.passwordUpdated === "1";

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-20">
      <RealtimeRefresh
        channel={`account-${user.id}`}
        pollMs={60000}
        targets={[
          { table: "notifications", filter: `profile_id=eq.${user.id}` },
          { table: "orders", filter: `buyer_profile_id=eq.${user.id}` },
          { table: "orders", filter: `seller_profile_id=eq.${user.id}` },
          { table: "watchlist_entries", filter: `profile_id=eq.${user.id}` },
          { table: "listings", filter: `seller_profile_id=eq.${user.id}` },
          { table: "bids", filter: `bidder_id=eq.${user.id}` },
        ]}
      />

      <div className="rounded-[2rem] bg-white p-8 shadow-[0_24px_60px_rgba(17,17,17,0.06)] md:p-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#3d7a44]">
              Account
            </p>
            <h1 className="mt-3 text-4xl font-light tracking-tight text-gray-900">
              {profile?.full_name || email}
            </h1>
            <p className="mt-2 text-base text-gray-500">{email}</p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-600">
              <span className="rounded-full bg-[#f4f7f4] px-3 py-1 text-[#3d7a44]">
                {profile?.role || "buyer"}
              </span>
              <span className="rounded-full bg-[#fafafa] px-3 py-1">
                {formatBidderStatus(profile?.bidder_status || "pending")}
              </span>
              <span className="rounded-full bg-[#fafafa] px-3 py-1">
                {profile?.phone || "No phone on file"}
              </span>
              <span className="rounded-full bg-[#fafafa] px-3 py-1">
                {unreadNotifications} unread updates
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/marketplace"
              className="rounded-full border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
            >
              View marketplace
            </Link>
            {profile?.role === "admin" ? (
              <Link
                href="/admin"
                className="rounded-full bg-[#3d7a44] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#2f6135]"
              >
                Open admin
              </Link>
            ) : null}
            <SignOutButton />
          </div>
        </div>
      </div>

      {passwordUpdated ? (
        <p className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Password updated successfully.
        </p>
      ) : null}

      {paymentState === "success" ? (
        <p className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Payment confirmed. Order status will update as soon as Stripe confirms the
          checkout.
        </p>
      ) : null}

      {paymentState === "cancel" ? (
        <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Checkout was cancelled. The order is still waiting for payment.
        </p>
      ) : null}

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-[2rem] bg-white p-6 shadow-[0_20px_40px_rgba(17,17,17,0.05)]">
          <p className="text-sm text-gray-500">Bidder approval</p>
          <p className="mt-3 text-2xl font-medium text-gray-900">
            {formatBidderStatus(profile?.bidder_status || "pending")}
          </p>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            {profile?.bidder_status === "approved"
              ? "You can join live auctions and start buy-now checkout."
              : profile?.bidder_status === "rejected"
                ? "An admin needs to review your account before bidding is re-enabled."
                : "An admin needs to approve the profile before bidding goes live."}
          </p>
        </div>
        <div className="rounded-[2rem] bg-white p-6 shadow-[0_20px_40px_rgba(17,17,17,0.05)]">
          <p className="text-sm text-gray-500">Watchlist</p>
          <p className="mt-3 text-2xl font-medium text-gray-900">
            {dashboard.watchlist.length}
          </p>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Save listings and track price movement from one account page.
          </p>
        </div>
        <div className="rounded-[2rem] bg-white p-6 shadow-[0_20px_40px_rgba(17,17,17,0.05)]">
          <p className="text-sm text-gray-500">Orders</p>
          <p className="mt-3 text-2xl font-medium text-gray-900">
            {dashboard.buyerOrders.length + dashboard.sellerOrders.length}
          </p>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Auction wins and buy-now reservations stay visible until they are
            fulfilled.
          </p>
        </div>
      </section>

      <section className="mt-10 rounded-[2rem] bg-white p-8 shadow-[0_20px_40px_rgba(17,17,17,0.05)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-medium text-gray-900">Notifications</h2>
            <p className="mt-2 text-sm text-gray-500">
              Outbid alerts, approval changes, and settlement updates land here.
            </p>
          </div>
          {unreadNotifications > 0 ? (
            <form action={markAllNotificationsReadAction}>
              <button
                type="submit"
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
              >
                Mark all read
              </button>
            </form>
          ) : null}
        </div>

        <div className="mt-6 space-y-3">
          {dashboard.notifications.length === 0 ? (
            <p className="text-sm text-gray-500">No notifications yet.</p>
          ) : (
            dashboard.notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-2xl border px-4 py-4 ${
                  notification.readAt
                    ? "border-gray-200 bg-[#fafafa]"
                    : "border-green-200 bg-green-50/60"
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{notification.title}</p>
                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      {notification.body}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-gray-400">
                      {formatDateTime(notification.createdAt)}
                    </p>
                  </div>
                  {!notification.readAt ? (
                    <form action={markNotificationReadAction}>
                      <input
                        type="hidden"
                        name="notificationId"
                        value={notification.id}
                      />
                      <button
                        type="submit"
                        className="rounded-full bg-[#1a1a1a] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2b2b2b]"
                      >
                        Mark read
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] bg-white p-8 shadow-[0_20px_40px_rgba(17,17,17,0.05)]">
          <h2 className="text-2xl font-medium text-gray-900">Orders</h2>
          <div className="mt-6 space-y-4">
            {dashboard.buyerOrders.length === 0 ? (
              <p className="text-sm text-gray-500">No buyer orders yet.</p>
            ) : (
              dashboard.buyerOrders.map((order) => (
                <div key={order.id} className="rounded-2xl bg-[#fafafa] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">
                        {order.listingTitle || "Untitled listing"}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {order.kind === "auction_win" ? "Auction win" : "Buy now"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {formatMoney(order.amountPence)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatOrderStatus(order.status)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-gray-600">
                    Payment due {formatDateTime(order.dueAt)}
                  </p>
                  {order.paymentReference ? (
                    <p className="mt-1 text-xs text-gray-500">
                      Reference {order.paymentReference}
                    </p>
                  ) : null}
                  {order.status === "awaiting_payment" ? (
                    <OrderCheckoutButton orderId={order.id} />
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-8 shadow-[0_20px_40px_rgba(17,17,17,0.05)]">
          <h2 className="text-2xl font-medium text-gray-900">My bids</h2>
          <div className="mt-6 space-y-4">
            {dashboard.bids.length === 0 ? (
              <p className="text-sm text-gray-500">No bids yet.</p>
            ) : (
              dashboard.bids.map((bid) => (
                <div key={bid.id} className="rounded-2xl bg-[#fafafa] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      {bid.listingSlug ? (
                        <Link
                          href={`/marketplace/${bid.listingSlug}`}
                          className="font-medium text-gray-900 hover:text-[#3d7a44]"
                        >
                          {bid.listingTitle || "Untitled listing"}
                        </Link>
                      ) : (
                        <p className="font-medium text-gray-900">
                          {bid.listingTitle || "Untitled listing"}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        {formatDateTime(bid.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {formatMoney(bid.amountPence)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {bid.isWinningBid ? "Current leader" : "Outbid"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-gray-600">
                    {bid.auctionStatus
                      ? `${bid.auctionStatus[0].toUpperCase()}${bid.auctionStatus.slice(1)}${bid.auctionEndsAt ? ` • ${formatTimeRemaining(bid.auctionEndsAt)}` : ""}`
                      : "No auction status"}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-[2rem] bg-white p-8 shadow-[0_20px_40px_rgba(17,17,17,0.05)]">
        <h2 className="text-2xl font-medium text-gray-900">Watchlist</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dashboard.watchlist.length === 0 ? (
            <p className="text-sm text-gray-500">No saved listings yet.</p>
          ) : (
            dashboard.watchlist.map((listing) => (
              <article key={listing.id} className="rounded-2xl bg-[#fafafa] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/marketplace/${listing.slug}`}
                      className="font-medium text-gray-900 hover:text-[#3d7a44]"
                    >
                      {listing.title}
                    </Link>
                    <p className="mt-1 text-sm text-gray-500">
                      {listing.summary || listing.brand || "Curated kitchen"}
                    </p>
                  </div>
                  <p className="font-medium text-gray-900">
                    {formatMoney(listing.currentPricePence)}
                  </p>
                </div>
                {listing.auction ? (
                  <p className="mt-3 text-sm text-gray-600">
                    {listing.auction.status[0].toUpperCase() +
                      listing.auction.status.slice(1)}{" "}
                    • {formatTimeRemaining(listing.auction.endAt)}
                  </p>
                ) : null}
                <form action={toggleWatchlistAction} className="mt-4">
                  <input type="hidden" name="listingId" value={listing.id} />
                  <input type="hidden" name="listingSlug" value={listing.slug} />
                  <input type="hidden" name="redirectPath" value="/account" />
                  <button
                    type="submit"
                    className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
                  >
                    Remove from watchlist
                  </button>
                </form>
              </article>
            ))
          )}
        </div>
      </section>

      {profile?.role === "seller" || profile?.role === "admin" ? (
        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] bg-white p-8 shadow-[0_20px_40px_rgba(17,17,17,0.05)]">
            <h2 className="text-2xl font-medium text-gray-900">Seller listings</h2>
            <div className="mt-6 space-y-4">
              {dashboard.sellerListings.length === 0 ? (
                <p className="text-sm text-gray-500">No seller listings yet.</p>
              ) : (
                dashboard.sellerListings.map((listing) => (
                  <div key={listing.id} className="rounded-2xl bg-[#fafafa] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <Link
                        href={`/marketplace/${listing.slug}`}
                        className="font-medium text-gray-900 hover:text-[#3d7a44]"
                      >
                        {listing.title}
                      </Link>
                      <p className="font-medium text-gray-900">
                        {formatMoney(listing.currentPricePence)}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-gray-600 capitalize">
                      {listing.status}
                      {listing.auction ? ` • ${listing.auction.status}` : ""}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-8 shadow-[0_20px_40px_rgba(17,17,17,0.05)]">
            <h2 className="text-2xl font-medium text-gray-900">Seller orders</h2>
            <div className="mt-6 space-y-4">
              {dashboard.sellerOrders.length === 0 ? (
                <p className="text-sm text-gray-500">No seller orders yet.</p>
              ) : (
                dashboard.sellerOrders.map((order) => (
                  <div key={order.id} className="rounded-2xl bg-[#fafafa] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-gray-900">
                        {order.listingTitle || "Untitled listing"}
                      </p>
                      <p className="font-medium text-gray-900">
                        {formatMoney(order.amountPence)}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      {formatOrderStatus(order.status)} • Due {formatDateTime(order.dueAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
