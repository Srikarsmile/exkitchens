import { NextResponse } from "next/server";
import { deliverPendingNotificationEmails } from "@/lib/email";
import { isAuthorizedCronRequest } from "@/lib/cron";

async function handleNotificationDrain(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
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
