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

async function handleNotificationDrain(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await deliverPendingNotificationEmails();

  return NextResponse.json(result);
}

export async function GET(request: Request) {
  return handleNotificationDrain(request);
}

export async function POST(request: Request) {
  return handleNotificationDrain(request);
}
