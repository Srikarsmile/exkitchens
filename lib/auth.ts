import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, BidderStatus } from "@/lib/marketplace-shared";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: AppRole;
  bidder_status: BidderStatus;
  bidder_status_reason: string | null;
  bidder_approved_at: string | null;
  phone_verified_at: string | null;
}

export interface Viewer {
  user: User | null;
  profile: Profile | null;
}

export interface AuthenticatedViewer {
  user: User;
  profile: Profile | null;
}

export async function getViewer(): Promise<Viewer> {
  if (!isSupabaseConfigured()) {
    return { user: null, profile: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, phone, role, bidder_status, bidder_status_reason, bidder_approved_at, phone_verified_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  return {
    user,
    profile: (profile as Profile | null) ?? null,
  };
}

export async function requireUser(nextPath = "/account"): Promise<AuthenticatedViewer> {
  const viewer = await getViewer();

  if (!viewer.user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return viewer as AuthenticatedViewer;
}

export async function requireAdmin(nextPath = "/admin"): Promise<AuthenticatedViewer> {
  const viewer = await requireUser(nextPath);

  if (viewer.profile?.role !== "admin") {
    redirect("/account");
  }

  return viewer;
}

export async function requireSellerOrAdmin(
  nextPath = "/account",
): Promise<AuthenticatedViewer> {
  const viewer = await requireUser(nextPath);

  if (!viewer.profile || !["seller", "admin"].includes(viewer.profile.role)) {
    redirect("/account");
  }

  return viewer;
}
