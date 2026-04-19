"use client";

import { useActionState } from "react";
import { createListingAction, type AdminActionState } from "@/app/actions/admin";
import SubmitButton from "@/app/components/forms/SubmitButton";
import type { SellerOption } from "@/lib/marketplace-shared";

const initialState: AdminActionState = {};

interface AdminCreateListingFormProps {
  sellerOptions: SellerOption[];
}

export default function AdminCreateListingForm({
  sellerOptions,
}: AdminCreateListingFormProps) {
  const [state, action] = useActionState(createListingAction, initialState);

  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Title
        </label>
        <input
          name="title"
          required
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
          placeholder="Bulthaup B3 in matte oak"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Slug
        </label>
        <input
          name="slug"
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
          placeholder="leave blank to auto-generate"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Brand
        </label>
        <input
          name="brand"
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
          placeholder="Bulthaup"
        />
      </div>

      <div className="md:col-span-2">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Summary
        </label>
        <textarea
          name="summary"
          required
          rows={3}
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
          placeholder="One-paragraph listing teaser for cards and search results."
        />
      </div>

      <div className="md:col-span-2">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          name="description"
          rows={5}
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
          placeholder="Materials, appliances, condition, what's included."
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Location
        </label>
        <input
          name="location"
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
          placeholder="London"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Hero image URL
        </label>
        <input
          name="heroImageUrl"
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
          placeholder="https://..."
        />
      </div>

      <div className="md:col-span-2">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Gallery image URLs
        </label>
        <textarea
          name="galleryUrls"
          rows={3}
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
          placeholder="One URL per line for the gallery."
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Tags
        </label>
        <input
          name="tags"
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
          placeholder="Miele, quartz, island"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Seller
        </label>
        <select
          name="sellerProfileId"
          defaultValue=""
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
        >
          <option value="">Use my admin profile</option>
          {sellerOptions.map((seller) => (
            <option key={seller.id} value={seller.id}>
              {seller.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Sale type
        </label>
        <select
          name="saleType"
          defaultValue="auction"
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
        >
          <option value="auction">Auction</option>
          <option value="buy_now">Buy now</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Original price (GBP)
        </label>
        <input
          name="originalPrice"
          type="number"
          min="0"
          step="1"
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
          placeholder="45000"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Buy now price (GBP)
        </label>
        <input
          name="buyNowPrice"
          type="number"
          min="0"
          step="1"
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
          placeholder="18900"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Starting bid (GBP)
        </label>
        <input
          name="startingBid"
          type="number"
          min="0"
          step="1"
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
          placeholder="9500"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Bid increment (GBP)
        </label>
        <input
          name="bidIncrement"
          type="number"
          min="1"
          step="1"
          defaultValue="50"
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Reserve price (GBP)
        </label>
        <input
          name="reservePrice"
          type="number"
          min="1"
          step="1"
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
          placeholder="12000"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Auction starts at (ISO UTC)
        </label>
        <input
          name="auctionStartsAt"
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
          placeholder="2026-05-01T18:00:00Z"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Auction ends at (ISO UTC)
        </label>
        <input
          name="auctionEndsAt"
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
          placeholder="2026-05-05T18:00:00Z"
        />
      </div>

      <label className="md:col-span-2 flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
        <input type="checkbox" name="featured" className="h-4 w-4 accent-[#3d7a44]" />
        Feature this listing on the homepage
      </label>

      {state.message ? (
        <p
          className={`md:col-span-2 rounded-2xl px-4 py-3 text-sm ${
            state.success
              ? "border border-green-200 bg-green-50 text-green-700"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <div className="md:col-span-2">
        <SubmitButton
          idleLabel="Create Listing"
          pendingLabel="Creating Listing..."
          className="rounded-full bg-[#1a1a1a] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#2b2b2b] disabled:cursor-not-allowed disabled:opacity-70"
        />
      </div>
    </form>
  );
}
