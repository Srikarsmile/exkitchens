"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { bidAmountToPence } from "@/lib/marketplace-shared";
import { requireUser } from "@/lib/auth";
import { deliverPendingNotificationEmails } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { runMarketplaceMaintenance } from "@/lib/marketplace";

export interface BidActionState {
  message?: string;
  success?: boolean;
}

const placeBidSchema = z.object({
  auctionId: z.string().uuid("Invalid auction ID."),
  slug: z.string().min(1),
  amount: z.coerce.number().positive("Bid must be greater than zero."),
});

export async function placeBidAction(
  _prevState: BidActionState,
  formData: FormData,
): Promise<BidActionState> {
  if (!isSupabaseConfigured()) {
    return {
      message:
        "Supabase is not configured yet. Add the environment variables before placing bids.",
    };
  }

  const parsed = placeBidSchema.safeParse({
    auctionId: formData.get("auctionId"),
    slug: formData.get("slug"),
    amount: formData.get("amount"),
  });

  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message || "Invalid bid." };
  }

  const amountPence = bidAmountToPence(parsed.data.amount);

  if (!amountPence) {
    return { message: "Enter a valid bid amount." };
  }

  await requireUser(`/marketplace/${parsed.data.slug}`);
  const supabase = await createClient();
  await runMarketplaceMaintenance(supabase);
  const { error } = await supabase.rpc("place_bid", {
    p_auction_id: parsed.data.auctionId,
    p_amount_pence: amountPence,
  });

  if (error) {
    return { message: error.message };
  }

  await deliverPendingNotificationEmails();
  revalidatePath("/");
  revalidatePath("/marketplace");
  revalidatePath(`/marketplace/${parsed.data.slug}`);
  revalidatePath("/account");

  return {
    success: true,
    message: "Bid placed successfully.",
  };
}
