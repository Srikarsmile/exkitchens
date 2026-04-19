import { Text } from "@react-email/components";
import AccountEmailLayout from "@/emails/AccountEmailLayout";

interface AccountVerificationEmailProps {
  recipientName?: string | null;
  verificationUrl: string;
}

export default function AccountVerificationEmail({
  recipientName,
  verificationUrl,
}: AccountVerificationEmailProps) {
  return (
    <AccountEmailLayout
      preview="Confirm your Ex Kitchens account"
      heading="Confirm your email address"
      recipientName={recipientName}
      actionLabel="Verify email"
      actionUrl={verificationUrl}
    >
      <Text
        style={{
          color: "#4b5563",
          fontSize: "15px",
          lineHeight: "1.7",
          margin: 0,
        }}
      >
        Finish your Ex Kitchens account setup so you can watch listings, join
        approval review, and bid when your profile is cleared.
      </Text>
      <Text
        style={{
          color: "#4b5563",
          fontSize: "15px",
          lineHeight: "1.7",
          margin: "14px 0 0",
        }}
      >
        This link is for your account only. If you did not create an account,
        you can ignore this email.
      </Text>
    </AccountEmailLayout>
  );
}
