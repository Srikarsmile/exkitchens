import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron";
import { isSupabaseAdminConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function handleSupabaseHealthCheck(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        service: "supabase",
        error: "Supabase admin access is not configured.",
      },
      { status: 503 },
    );
  }

  const startedAt = Date.now();
  const checkedAt = new Date().toISOString();
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .limit(1);
  const latencyMs = Date.now() - startedAt;

  if (error) {
    console.error("Supabase health check failed", error);

    return NextResponse.json(
      {
        ok: false,
        service: "supabase",
        checkedAt,
        latencyMs,
        error: error.message,
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    service: "supabase",
    checkedAt,
    latencyMs,
    listingRows: count ?? null,
  });
}

export async function GET(request: Request) {
  return handleSupabaseHealthCheck(request);
}

export async function POST(request: Request) {
  return handleSupabaseHealthCheck(request);
}
