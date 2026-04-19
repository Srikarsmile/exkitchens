import { Text } from "@react-email/components";
import AccountEmailLayout from "@/emails/AccountEmailLayout";

interface WelcomeEmailProps {
  recipientName?: string | null;
  accountUrl: string;
}

export default function WelcomeEmail({
  recipientName,
  accountUrl,
}: WelcomeEmailProps) {
  return (
    <AccountEmailLayout
      preview="Welcome to Ex Kitchens"
      heading="Your Ex Kitchens account is ready"
      recipientName={recipientName}
      actionLabel="Open your account"
      actionUrl={accountUrl}
    >
      <Text
        style={{
          color: "#4b5563",
          fontSize: "15px",
          lineHeight: "1.7",
          margin: 0,
        }}
      >
        Welcome in. Your email has been confirmed and your marketplace account is
        active.
      </Text>
      <Text
        style={{
          color: "#4b5563",
          fontSize: "15px",
          lineHeight: "1.7",
          margin: "14px 0 0",
        }}
      >
        Add any missing contact details, keep an eye on your watchlist, and wait
        for bidder approval before placing live bids.
      </Text>
    </AccountEmailLayout>
  );
}
