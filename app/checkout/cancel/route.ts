import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const listingSlug = url.searchParams.get("listing");

  const redirectTarget = new URL(
    listingSlug ? `/marketplace/${listingSlug}` : "/marketplace",
    url.origin,
  );
  redirectTarget.searchParams.set("payment", "cancel");

  return NextResponse.redirect(redirectTarget);
}
