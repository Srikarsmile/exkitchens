import Link from "next/link";
import {
  cancelAuctionAction,
  closeAuctionAction,
  updateListingStatusAction,
  updateOrderStatusAction,
  updateUserAccessAction,
} from "@/app/actions/admin";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/actions/marketplace";
import { requireAdmin } from "@/lib/auth";
import {
  getAdminCounts,
  getAdminListings,
  getAdminNotifications,
  getAdminOrders,
  getAdminUsers,
} from "@/lib/admin";
import {
  formatBidderStatus,
  formatDateTime,
  formatMoney,
  formatOrderStatus,
  formatTimeRemaining,
} from "@/lib/marketplace-shared";

export default async function AdminPage() {
  const viewer = await requireAdmin("/admin");
  const [counts, listings, users, orders, notifications] = await Promise.all([
    getAdminCounts(),
    getAdminListings(),
    getAdminUsers(),
    getAdminOrders(),
    getAdminNotifications(viewer.user.id),
  ]);
  const unreadAdminNotifications = notifications.filter((item) => !item.readAt).length;

  return (
    <main id="main-content" className="mx-auto w-full max-w-7xl px-6 py-12">
      <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#3d7a44]">
            Admin
          </p>
          <h1 className="mt-3 text-4xl font-light tracking-tight text-gray-900">
            Marketplace control room
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-500">
            Keep the workflow simple: add stock, approve buyers, track payments,
            and intervene on auctions from one page.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/listings/new"
            className="rounded-full bg-[#3d7a44] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#2f6135]"
          >
            Add new listing
          </Link>
          <Link
            href="/account"
            className="rounded-full border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
          >
            Account
          </Link>
          <Link
            href="/marketplace"
            className="rounded-full bg-[#1a1a1a] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#2b2b2b]"
          >
            View marketplace
          </Link>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-5">
        {[
          { label: "Listings", value: counts.totalListings },
          { label: "Live auctions", value: counts.liveAuctions },
          { label: "Registered users", value: counts.registeredUsers },
          { label: "Pending approvals", value: counts.pendingApprovals },
          { label: "Open orders", value: counts.openOrders },
        ].map((metric) => (
          <div
            key={metric.label}
            className="rounded-[2rem] bg-white p-6 shadow-[0_20px_40px_rgba(17,17,17,0.05)]"
          >
            <p className="text-sm text-gray-500">{metric.label}</p>
            <p className="mt-3 text-4xl font-light text-gray-900">{metric.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-4">
        {[
          {
            title: "Add stock",
            body: "Open the dedicated listing form, paste media URLs, set prices, and publish.",
            href: "/admin/listings/new",
            label: "New listing",
          },
          {
            title: "Approve bidders",
            body: "Review buyer accounts, phone verification, and bidder status in one table.",
            href: "#approvals",
            label: "Open approvals",
          },
          {
            title: "Track payments",
            body: "Move orders from awaiting payment through paid, fulfilled, cancelled, or refunded.",
            href: "#orders",
            label: "Open orders",
          },
          {
            title: "Manage live stock",
            body: "Pause listings, close auctions early, or archive listings that should leave the marketplace.",
            href: "#listings",
            label: "Open listings",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-[2rem] bg-white p-6 shadow-[0_20px_40px_rgba(17,17,17,0.05)]"
          >
            <h2 className="text-lg font-medium text-gray-900">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-500">{item.body}</p>
            <Link
              href={item.href}
              className="mt-6 inline-flex rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
            >
              {item.label}
            </Link>
          </div>
        ))}
      </section>

      <section className="mt-10 rounded-[2rem] bg-white p-8 shadow-[0_20px_40px_rgba(17,17,17,0.05)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-medium text-gray-900">Admin activity</h2>
            <p className="mt-2 text-sm text-gray-500">
              Internal marketplace events such as new order creation land here, not
              in the buyer account feed.
            </p>
          </div>
          {unreadAdminNotifications > 0 ? (
            <form action={markAllNotificationsReadAction}>
              <input type="hidden" name="redirectPath" value="/admin" />
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
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-500">No admin activity yet.</p>
          ) : (
            notifications.map((notification) => (
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
                      <input type="hidden" name="redirectPath" value="/admin" />
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

      <section className="mt-10 rounded-[2rem] bg-white p-8 shadow-[0_20px_40px_rgba(17,17,17,0.05)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-medium text-gray-900">Listing intake</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
              New listings now have their own page so the dashboard stays easier to
              scan. Use the listing form when you want to publish a new kitchen,
              then come back here to manage status and auctions.
            </p>
          </div>
          <Link
            href="/admin/listings/new"
            className="inline-flex rounded-full bg-[#1a1a1a] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#2b2b2b]"
          >
            Open listing form
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            "Create the title, summary, description, and seller assignment.",
            "Paste the hero image URL and gallery image URLs in one place.",
            "Set auction timing with normal date and time inputs instead of raw ISO strings.",
          ].map((point) => (
            <div
              key={point}
              className="rounded-2xl border border-gray-200 px-5 py-4 text-sm leading-6 text-gray-600"
            >
              {point}
            </div>
          ))}
        </div>
      </section>

      <section
        id="approvals"
        className="mt-10 rounded-[2rem] bg-white p-8 shadow-[0_20px_40px_rgba(17,17,17,0.05)]"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-medium text-gray-900">Bidder approvals</h2>
            <p className="mt-2 text-sm text-gray-500">
              Review roles, bidder access, and phone verification from one table.
              Change access here when a buyer is ready to bid.
            </p>
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.2em] text-gray-400">
                <th className="pb-2">User</th>
                <th className="pb-2">Phone</th>
                <th className="pb-2">Current</th>
                <th className="pb-2">Controls</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="bg-[#fafafa] text-sm text-gray-700">
                  <td className="rounded-l-2xl px-4 py-4 align-top">
                    <p className="font-medium text-gray-900">
                      {user.fullName || "Unnamed account"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{user.email || user.id}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      Created {formatDateTime(user.createdAt)}
                    </p>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <p>{user.phone || "No phone"}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {user.phoneVerifiedAt
                        ? `Verified ${formatDateTime(user.phoneVerifiedAt)}`
                        : "Not verified"}
                    </p>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <p className="font-medium text-gray-900">
                      {user.role[0].toUpperCase() + user.role.slice(1)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatBidderStatus(user.bidderStatus)}
                      {user.bidderApprovedAt
                        ? ` since ${formatDateTime(user.bidderApprovedAt)}`
                        : ""}
                    </p>
                    {user.bidderStatusReason ? (
                      <p className="mt-2 text-xs text-gray-400">{user.bidderStatusReason}</p>
                    ) : null}
                  </td>
                  <td className="rounded-r-2xl px-4 py-4 align-top">
                    <form action={updateUserAccessAction} className="space-y-3">
                      <input type="hidden" name="profileId" value={user.id} />
                      <div className="flex flex-wrap gap-3">
                        <select
                          name="role"
                          defaultValue={user.role}
                          className="w-40 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                        >
                          <option value="buyer">Buyer</option>
                          <option value="seller">Seller</option>
                          <option value="admin">Admin</option>
                        </select>
                        <select
                          name="bidderStatus"
                          defaultValue={user.bidderStatus}
                          className="w-44 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                      <input
                        name="bidderStatusReason"
                        defaultValue={user.bidderStatusReason || ""}
                        placeholder="Internal note"
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                      />
                      <label className="flex items-center gap-2 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          name="phoneVerified"
                          defaultChecked={Boolean(user.phoneVerifiedAt)}
                          className="h-4 w-4 accent-[#3d7a44]"
                        />
                        Phone verified
                      </label>
                      <button
                        type="submit"
                        className="rounded-full bg-[#1a1a1a] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2b2b2b]"
                      >
                        Save access
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-sm text-gray-500">
              No user profiles yet.
            </p>
          ) : null}
        </div>
      </section>

      <section
        id="orders"
        className="mt-10 rounded-[2rem] bg-white p-8 shadow-[0_20px_40px_rgba(17,17,17,0.05)]"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-medium text-gray-900">Orders</h2>
            <p className="mt-2 text-sm text-gray-500">
              Track auction wins and buy-now reservations until payment and
              fulfilment are complete. This is the section to update after bank
              transfer, collection, delivery, or refund.
            </p>
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.2em] text-gray-400">
                <th className="pb-2">Listing</th>
                <th className="pb-2">Buyer</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Due</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="bg-[#fafafa] text-sm text-gray-700">
                  <td className="rounded-l-2xl px-4 py-4 align-top">
                    {order.listingSlug ? (
                      <Link
                        href={`/marketplace/${order.listingSlug}`}
                        className="font-medium text-gray-900 hover:text-[#3d7a44]"
                      >
                        {order.listingTitle || "Untitled listing"}
                      </Link>
                    ) : (
                      <p className="font-medium text-gray-900">
                        {order.listingTitle || "Untitled listing"}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      {order.kind === "auction_win" ? "Auction win" : "Buy now"}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Seller {order.sellerName || order.sellerEmail || "Unassigned"}
                    </p>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <p>{order.buyerName || order.buyerEmail || "Unknown buyer"}</p>
                    {order.buyerEmail ? (
                      <p className="mt-1 text-xs text-gray-500">{order.buyerEmail}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <p className="font-medium text-gray-900">
                      {formatMoney(order.amountPence)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Created {formatDateTime(order.createdAt)}
                    </p>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <form action={updateOrderStatusAction} className="space-y-3">
                      <input type="hidden" name="orderId" value={order.id} />
                      <input type="hidden" name="listingId" value={order.listingId} />
                      <input
                        type="hidden"
                        name="listingSlug"
                        value={order.listingSlug || ""}
                      />
                      <select
                        name="status"
                        defaultValue={order.status}
                        className="w-48 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                      >
                        <option value="awaiting_payment">Awaiting payment</option>
                        <option value="paid">Paid</option>
                        <option value="fulfilled">Fulfilled</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="refunded">Refunded</option>
                      </select>
                      <input
                        name="paymentReference"
                        defaultValue={order.paymentReference || ""}
                        placeholder="Payment reference"
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                      />
                      <input
                        name="paymentNotes"
                        defaultValue={order.paymentNotes || ""}
                        placeholder="Internal notes"
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                      />
                      <button
                        type="submit"
                        className="rounded-full bg-[#1a1a1a] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2b2b2b]"
                      >
                        Save order
                      </button>
                      <p className="text-xs text-gray-500">
                        {formatOrderStatus(order.status)}
                      </p>
                    </form>
                  </td>
                  <td className="rounded-r-2xl px-4 py-4 align-top">
                    <p>{formatDateTime(order.dueAt)}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {orders.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-sm text-gray-500">
              No orders yet.
            </p>
          ) : null}
        </div>
      </section>

      <section
        id="listings"
        className="mt-10 rounded-[2rem] bg-white p-8 shadow-[0_20px_40px_rgba(17,17,17,0.05)]"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-medium text-gray-900">Listings</h2>
            <p className="mt-2 text-sm text-gray-500">
              Control publication state and intervene on auctions when needed.
              Published means visible on the marketplace, archived removes it, and
              sold keeps the record closed.
            </p>
          </div>
          <Link
            href="/admin/listings/new"
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
          >
            Add listing
          </Link>
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.2em] text-gray-400">
                <th className="pb-2">Listing</th>
                <th className="pb-2">Seller</th>
                <th className="pb-2">Type</th>
                <th className="pb-2">Price</th>
                <th className="pb-2">Auction</th>
                <th className="pb-2">Controls</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing) => (
                <tr key={listing.id} className="bg-[#fafafa] text-sm text-gray-700">
                  <td className="rounded-l-2xl px-4 py-4 align-top">
                    <Link
                      href={`/marketplace/${listing.slug}`}
                      className="font-medium text-gray-900 hover:text-[#3d7a44]"
                    >
                      {listing.title}
                    </Link>
                    <p className="mt-1 text-xs text-gray-500">{listing.brand || "Curated"}</p>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <p>{listing.sellerName || listing.sellerEmail || "Admin owned"}</p>
                  </td>
                  <td className="px-4 py-4 align-top capitalize">
                    {listing.saleType.replace("_", " ")}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <p className="font-medium text-gray-900">
                      {formatMoney(listing.currentPricePence)}
                    </p>
                    {listing.reservePricePence ? (
                      <p className="mt-1 text-xs text-gray-500">
                        Reserve {formatMoney(listing.reservePricePence)}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 align-top">
                    {listing.auction ? (
                      <>
                        <p className="capitalize text-gray-900">{listing.auction.status}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          Ends {formatTimeRemaining(listing.auction.endAt)}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {listing.auction.bidCount} bids
                        </p>
                      </>
                    ) : (
                      <p className="text-gray-500">No auction record</p>
                    )}
                  </td>
                  <td className="rounded-r-2xl px-4 py-4 align-top">
                    <form action={updateListingStatusAction} className="space-y-3">
                      <input type="hidden" name="listingId" value={listing.id} />
                      <input type="hidden" name="slug" value={listing.slug} />
                      <select
                        name="status"
                        defaultValue={listing.status}
                        className="w-40 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                        <option value="sold">Sold</option>
                      </select>
                      <button
                        type="submit"
                        className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
                      >
                        Save listing
                      </button>
                    </form>

                    {listing.auction ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <form action={closeAuctionAction}>
                          <input type="hidden" name="auctionId" value={listing.auction.id} />
                          <input type="hidden" name="listingId" value={listing.id} />
                          <input type="hidden" name="slug" value={listing.slug} />
                          <button
                            type="submit"
                            className="rounded-full bg-[#3d7a44] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2f6135]"
                          >
                            Close now
                          </button>
                        </form>
                        <form action={cancelAuctionAction}>
                          <input type="hidden" name="auctionId" value={listing.auction.id} />
                          <input type="hidden" name="listingId" value={listing.id} />
                          <input type="hidden" name="slug" value={listing.slug} />
                          <button
                            type="submit"
                            className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                          >
                            Cancel auction
                          </button>
                        </form>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {listings.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-sm text-gray-500">
              No listings yet. Use the form above to create the first one.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
