import { Resend } from "resend";
import {
  getMarketplaceContactEmail,
  getMarketplaceEmailFrom,
  getMarketplaceSupportPhone,
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderEmail({
  preview,
  heading,
  recipientName,
  body,
  secondaryBody,
  actionLabel,
  actionUrl,
}: {
  preview: string;
  heading: string;
  recipientName?: string | null;
  body: string;
  secondaryBody?: string;
  actionLabel?: string;
  actionUrl?: string;
}) {
  const greeting = recipientName ? `Hi ${escapeHtml(recipientName)},` : "Hi,";
  const button =
    actionLabel && actionUrl
      ? `
        <div style="margin:32px 0 28px;">
          <a href="${escapeHtml(actionUrl)}" style="display:inline-block;border-radius:999px;background:#111111;color:#ffffff;font-size:15px;font-weight:600;line-height:1;text-decoration:none;padding:16px 24px;">
            ${escapeHtml(actionLabel)}
          </a>
        </div>
      `
      : "";
  const secondary = secondaryBody
    ? `<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:14px 0 0;">${escapeHtml(secondaryBody)}</p>`
    : "";

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(preview)}</title>
      </head>
      <body style="margin:0;background:#f3f5f3;font-family:Inter,Arial,sans-serif;color:#111111;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview)}</div>
        <div style="margin:0 auto;padding:32px 16px;max-width:640px;">
          <div style="overflow:hidden;border-radius:24px;background:#ffffff;border:1px solid #dfe5df;">
            <div style="padding:28px 32px 20px;border-bottom:1px solid #eef2ef;">
              <div style="color:#3d7a44;font-size:13px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;">Ex Kitchens</div>
              <h1 style="margin:18px 0 0;color:#111111;font-size:36px;font-weight:400;line-height:1.1;">${escapeHtml(heading)}</h1>
            </div>
            <div style="padding:28px 32px 32px;">
              <p style="color:#111111;font-size:15px;line-height:1.7;margin:0 0 12px;">${greeting}</p>
              <p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0;">${escapeHtml(body)}</p>
              ${secondary}
              ${button}
              <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:32px 0 0;">
                This message was sent by the Ex Kitchens marketplace.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
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

interface OrderConfirmationEmailInput {
  recipientEmail: string;
  recipientName?: string | null;
  listingTitle: string;
  amountPence: number;
  orderId: string;
}

interface ListingInterestEmailInput {
  enquiryId?: string | null;
  listingTitle: string;
  listingSlug: string;
  fullName: string;
  email: string;
  phone: string;
  note?: string | null;
  requestServices: boolean;
}

interface ListingInterestAcknowledgementEmailInput {
  enquiryId?: string | null;
  recipientEmail: string;
  recipientName?: string | null;
  listingTitle: string;
  listingSlug: string;
  requestServices: boolean;
}

function formatEmailMoney(pence: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(pence / 100);
}

function renderListingInterestEmail({
  enquiryId,
  listingTitle,
  listingSlug,
  fullName,
  email,
  phone,
  note,
  requestServices,
}: ListingInterestEmailInput) {
  const siteUrl = getSiteUrl();
  const fields = [
    [
      "Enquiry reference",
      enquiryId ? enquiryId.slice(0, 8).toUpperCase() : "Pending",
    ],
    ["Kitchen", listingTitle],
    ["Listing URL", `${siteUrl}/marketplace/${listingSlug}`],
    ["Name", fullName],
    ["Email", email],
    ["Phone", phone],
    [
      "Needs dismantling / delivery / installation quote",
      requestServices ? "Yes" : "No",
    ],
    ["Message", note?.trim() || "No additional notes supplied."],
  ] as const;

  const rows = fields
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #eef2ef;color:#6b7280;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #eef2ef;color:#111111;font-size:14px;line-height:1.6;">${escapeHtml(value)}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>New Ex Kitchens enquiry</title>
      </head>
      <body style="margin:0;background:#f3f5f3;font-family:Inter,Arial,sans-serif;color:#111111;">
        <div style="margin:0 auto;padding:32px 16px;max-width:680px;">
          <div style="overflow:hidden;border-radius:24px;background:#ffffff;border:1px solid #dfe5df;">
            <div style="padding:28px 32px 20px;border-bottom:1px solid #eef2ef;">
              <div style="color:#3d7a44;font-size:13px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;">Ex Kitchens</div>
              <h1 style="margin:18px 0 0;color:#111111;font-size:32px;font-weight:400;line-height:1.15;">New buyer enquiry</h1>
              <p style="margin:12px 0 0;color:#4b5563;font-size:15px;line-height:1.7;">
                A buyer has requested contact about <strong style="color:#111111;">${escapeHtml(listingTitle)}</strong>.
              </p>
            </div>
            <div style="padding:24px 32px 32px;">
              <table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #eef2ef;border-radius:18px;overflow:hidden;">
                ${rows}
              </table>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
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
    html: renderEmail({
      preview: "Confirm your Ex Kitchens account",
      heading: "Confirm your email address",
      recipientName,
      body: "Finish your Ex Kitchens account setup so you can watch listings and keep order updates in one place.",
      secondaryBody:
        "This link is for your account only. If you did not create an account, you can ignore this email.",
      actionLabel: "Verify email",
      actionUrl: verificationUrl,
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
    html: renderEmail({
      preview: "Welcome to Ex Kitchens",
      heading: "Your Ex Kitchens account is ready",
      recipientName,
      body: "Welcome in. Your email has been confirmed and your marketplace account is active.",
      secondaryBody:
        "Add any missing contact details, keep an eye on your watchlist, and reserve buy-now kitchens from the marketplace.",
      actionLabel: "Open your account",
      actionUrl: `${getSiteUrl()}/account`,
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
    html: renderEmail({
      preview: "Reset your Ex Kitchens password",
      heading: "Reset your password",
      recipientName,
      body: "We received a request to reset the password for your Ex Kitchens account.",
      secondaryBody:
        "If this was you, use the button below to choose a new password. If not, you can ignore this email and your account will stay unchanged.",
      actionLabel: "Reset password",
      actionUrl: resetUrl,
    }),
  });
}

export async function sendOrderConfirmationEmail({
  recipientEmail,
  recipientName,
  listingTitle,
  amountPence,
  orderId,
}: OrderConfirmationEmailInput) {
  if (!isResendConfigured()) {
    return { error: null };
  }

  const resend = getResendClient();
  const accountUrl = `${getSiteUrl()}/account`;

  return resend.emails.send({
    from: getMarketplaceEmailFrom(),
    to: recipientEmail,
    subject: "Your Ex Kitchens payment is confirmed",
    html: renderEmail({
      preview: "Your Ex Kitchens payment is confirmed",
      heading: "Payment received",
      recipientName,
      body: `We’ve received your payment of ${formatEmailMoney(amountPence)} for ${listingTitle}.`,
      secondaryBody: `Order reference: ${orderId.slice(0, 8).toUpperCase()}. We’ll contact you next with collection and handover details.`,
      actionLabel: "View your order",
      actionUrl: accountUrl,
    }),
  });
}

export async function sendListingInterestEmail(
  input: ListingInterestEmailInput,
) {
  if (!isResendConfigured()) {
    return { error: null };
  }

  const resend = getResendClient();

  return resend.emails.send({
    from: getMarketplaceEmailFrom(),
    to: getMarketplaceContactEmail(),
    subject: `New buyer enquiry: ${input.listingTitle}`,
    html: renderListingInterestEmail(input),
  });
}

export async function sendListingInterestAcknowledgementEmail({
  enquiryId,
  recipientEmail,
  recipientName,
  listingTitle,
  listingSlug,
  requestServices,
}: ListingInterestAcknowledgementEmailInput) {
  if (!isResendConfigured()) {
    return { error: null };
  }

  const resend = getResendClient();
  const listingUrl = `${getSiteUrl()}/marketplace/${listingSlug}`;
  const reference = enquiryId ? enquiryId.slice(0, 8).toUpperCase() : "Pending";

  return resend.emails.send({
    from: getMarketplaceEmailFrom(),
    to: recipientEmail,
    subject: `We received your enquiry about ${listingTitle}`,
    html: renderEmail({
      preview: `We received your enquiry about ${listingTitle}`,
      heading: "Enquiry received",
      recipientName,
      body: `Thanks for your interest in ${listingTitle}. No payment has been taken. The Ex Kitchens team will review availability and contact you directly.`,
      secondaryBody: `${requestServices ? "We noted that you would like a quote for dismantling, delivery, or installation as well. " : ""}Reference ${reference}. If you need anything sooner, call ${getMarketplaceSupportPhone()} or reply to this email.`,
      actionLabel: "View kitchen",
      actionUrl: listingUrl,
    }),
  });
}

export async function deliverPendingNotificationEmails(limit = 20) {
  if (!isResendConfigured() || !isSupabaseAdminConfigured()) {
    return { claimed: 0, sent: 0, failed: 0, skipped: 0 };
  }

  const supabase = createAdminClient();
  const resend = getResendClient();
  const { data, error } = await supabase.rpc(
    "claim_pending_notification_emails",
    {
      p_limit: limit,
    },
  );

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
      html: renderEmail({
        preview: row.title,
        heading: row.title,
        recipientName: row.recipient_name,
        body: row.body,
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
