import { Resend } from "resend";
import AccountVerificationEmail from "@/emails/AccountVerificationEmail";
import MarketplaceNotificationEmail from "@/emails/MarketplaceNotificationEmail";
import PasswordResetEmail from "@/emails/PasswordResetEmail";
import WelcomeEmail from "@/emails/WelcomeEmail";
import {
  getMarketplaceEmailFrom,
  getResendEnv,
  getSiteUrl,
  isResendConfigured,
  isSupabaseAdminConfigured,
} from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

interface PendingNotificationEmailRow {
  id: string;
  profile_id: string;
  recipient_email: string | null;
  recipient_name: string | null;
  kind: string;
  title: string;
  body: string;
  entity_type: string | null;
  entity_id: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
  email_attempts: number;
}

let resendClient: Resend | null = null;

function getResendClient() {
  if (!resendClient) {
    resendClient = new Resend(getResendEnv().apiKey);
  }

  return resendClient;
}

function getNotificationActionUrl(
  notification: Pick<PendingNotificationEmailRow, "entity_type" | "data">,
) {
  const listingSlug =
    notification.data && typeof notification.data.listing_slug === "string"
      ? notification.data.listing_slug
      : null;

  if (listingSlug) {
    return `${getSiteUrl()}/marketplace/${listingSlug}`;
  }

  if (notification.entity_type === "listing") {
    return `${getSiteUrl()}/marketplace`;
  }

  return `${getSiteUrl()}/account`;
}

interface AccountVerificationEmailInput {
  recipientEmail: string;
  recipientName?: string | null;
  verificationUrl: string;
}

interface WelcomeEmailInput {
  recipientEmail: string;
  recipientName?: string | null;
}

interface PasswordResetEmailInput {
  recipientEmail: string;
  recipientName?: string | null;
  resetUrl: string;
}

export async function sendAccountVerificationEmail({
  recipientEmail,
  recipientName,
  verificationUrl,
}: AccountVerificationEmailInput) {
  if (!isResendConfigured()) {
    return { error: null };
  }

  const resend = getResendClient();

  return resend.emails.send({
    from: getMarketplaceEmailFrom(),
    to: recipientEmail,
    subject: "Confirm your Ex Kitchens account",
    react: AccountVerificationEmail({
      recipientName,
      verificationUrl,
    }),
  });
}

export async function sendWelcomeEmail({
  recipientEmail,
  recipientName,
}: WelcomeEmailInput) {
  if (!isResendConfigured()) {
    return { error: null };
  }

  const resend = getResendClient();

  return resend.emails.send({
    from: getMarketplaceEmailFrom(),
    to: recipientEmail,
    subject: "Welcome to Ex Kitchens",
    react: WelcomeEmail({
      recipientName,
      accountUrl: `${getSiteUrl()}/account`,
    }),
  });
}

export async function sendPasswordResetEmail({
  recipientEmail,
  recipientName,
  resetUrl,
}: PasswordResetEmailInput) {
  if (!isResendConfigured()) {
    return { error: null };
  }

  const resend = getResendClient();

  return resend.emails.send({
    from: getMarketplaceEmailFrom(),
    to: recipientEmail,
    subject: "Reset your Ex Kitchens password",
    react: PasswordResetEmail({
      recipientName,
      resetUrl,
    }),
  });
}

export async function deliverPendingNotificationEmails(limit = 20) {
  if (!isResendConfigured() || !isSupabaseAdminConfigured()) {
    return { claimed: 0, sent: 0, failed: 0, skipped: 0 };
  }

  const supabase = createAdminClient();
  const resend = getResendClient();
  const { data, error } = await supabase.rpc("claim_pending_notification_emails", {
    p_limit: limit,
  });

  if (error) {
    console.error("Failed to claim notification emails", error);
    return { claimed: 0, sent: 0, failed: 0, skipped: 0 };
  }

  const rows = (data as PendingNotificationEmailRow[] | null) ?? [];
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.recipient_email) {
      skipped += 1;

      await supabase
        .from("notifications")
        .update({
          email_state: "skipped",
          email_last_error: "Recipient email is missing.",
          email_claimed_at: null,
        })
        .eq("id", row.id);

      continue;
    }

    const actionUrl = getNotificationActionUrl(row);
    const result = await resend.emails.send({
      from: getMarketplaceEmailFrom(),
      to: row.recipient_email,
      subject: row.title,
      react: MarketplaceNotificationEmail({
        preview: row.title,
        heading: row.title,
        body: row.body,
        recipientName: row.recipient_name,
        actionLabel: "Open marketplace",
        actionUrl,
      }),
    });

    if (result.error) {
      failed += 1;

      await supabase
        .from("notifications")
        .update({
          email_state: "failed",
          email_last_error: result.error.message,
          email_claimed_at: null,
        })
        .eq("id", row.id);

      continue;
    }

    sent += 1;

    await supabase
      .from("notifications")
      .update({
        email_state: "sent",
        emailed_at: new Date().toISOString(),
        email_last_error: null,
        email_claimed_at: null,
      })
      .eq("id", row.id);
  }

  return {
    claimed: rows.length,
    sent,
    failed,
    skipped,
  };
}
