import { Text } from "@react-email/components";
import AccountEmailLayout from "@/emails/AccountEmailLayout";

interface PasswordResetEmailProps {
  recipientName?: string | null;
  resetUrl: string;
}

export default function PasswordResetEmail({
  recipientName,
  resetUrl,
}: PasswordResetEmailProps) {
  return (
    <AccountEmailLayout
      preview="Reset your Ex Kitchens password"
      heading="Reset your password"
      recipientName={recipientName}
      actionLabel="Reset password"
      actionUrl={resetUrl}
    >
      <Text
        style={{
          color: "#4b5563",
          fontSize: "15px",
          lineHeight: "1.7",
          margin: 0,
        }}
      >
        We received a request to reset the password for your Ex Kitchens
        account.
      </Text>
      <Text
        style={{
          color: "#4b5563",
          fontSize: "15px",
          lineHeight: "1.7",
          margin: "14px 0 0",
        }}
      >
        If this was you, use the button below to choose a new password. If not,
        you can ignore this email and your account will stay unchanged.
      </Text>
    </AccountEmailLayout>
  );
}
