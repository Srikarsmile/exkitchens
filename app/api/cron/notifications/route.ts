import { NextResponse } from "next/server";
import { deliverPendingNotificationEmails } from "@/lib/email";
import { getMarketplaceCronSecret } from "@/lib/env";

function isAuthorized(request: Request) {
  const secret = getMarketplaceCronSecret();

  if (!secret) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await deliverPendingNotificationEmails();

  return NextResponse.json(result);
}
