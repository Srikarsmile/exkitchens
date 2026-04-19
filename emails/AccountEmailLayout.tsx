import type { ReactNode } from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface AccountEmailLayoutProps {
  preview: string;
  heading: string;
  recipientName?: string | null;
  body?: ReactNode;
  children?: ReactNode;
  actionLabel?: string;
  actionUrl?: string;
  footer?: ReactNode;
}

export default function AccountEmailLayout({
  preview,
  heading,
  recipientName,
  body,
  children,
  actionLabel,
  actionUrl,
  footer,
}: AccountEmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: "#f5f5f0",
          color: "#111111",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          margin: 0,
          padding: "32px 0",
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            margin: "0 auto",
            maxWidth: "560px",
            padding: "32px",
          }}
        >
          <Text
            style={{
              color: "#3d7a44",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.18em",
              margin: 0,
              textTransform: "uppercase",
            }}
          >
            Ex Kitchens
          </Text>

          <Heading
            style={{
              fontSize: "28px",
              fontWeight: 500,
              lineHeight: "1.25",
              margin: "18px 0 16px",
            }}
          >
            {heading}
          </Heading>

          <Text
            style={{
              color: "#4b5563",
              fontSize: "15px",
              lineHeight: "1.7",
              margin: 0,
            }}
          >
            {recipientName ? `Hello ${recipientName},` : "Hello,"}
          </Text>

          <Section style={{ marginTop: "14px" }}>
            {children ?? body}
          </Section>

          {actionLabel && actionUrl ? (
            <Section style={{ marginTop: "24px" }}>
              <Button
                href={actionUrl}
                style={{
                  backgroundColor: "#1a1a1a",
                  borderRadius: "8px",
                  color: "#ffffff",
                  display: "inline-block",
                  fontSize: "14px",
                  fontWeight: 600,
                  padding: "12px 20px",
                  textDecoration: "none",
                }}
              >
                {actionLabel}
              </Button>
            </Section>
          ) : null}

          <Hr
            style={{
              borderColor: "#e5e7eb",
              margin: "28px 0 18px",
            }}
          />

          {footer ?? (
            <Text
              style={{
                color: "#6b7280",
                fontSize: "12px",
                lineHeight: "1.6",
                margin: 0,
              }}
            >
              This message was sent by the Ex Kitchens marketplace.
            </Text>
          )}
        </Container>
      </Body>
    </Html>
  );
}
