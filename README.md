# Ex Kitchens

Ex Kitchens is a Next.js 16 marketplace for premium ex-display and pre-loved kitchens. It includes:

- public listing discovery and featured inventory
- account signup, email verification, password reset, and bidder approval
- live auctions with bid placement and settlement creation
- buy-now checkout with Stripe hosted checkout
- admin listing intake, approvals, order management, and notification delivery

## Stack

- Next.js 16 App Router
- React 19
- Supabase Auth, Postgres, Realtime, and Storage
- Stripe Checkout + webhooks
- Resend for branded account and notification emails

## Environment

Copy `.env.example` to `.env.local` and fill in the values.

Required for auth and public marketplace use:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Required for admin operations, storage uploads, webhook handling, and notification delivery:

- `SUPABASE_SERVICE_ROLE_KEY`

Required for buy-now checkout and payment confirmation:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Required for branded auth emails and notification delivery:

- `RESEND_API_KEY`
- `MARKETPLACE_EMAIL_FROM`

Optional operational secret:
- `NEXT_PUBLIC_MARKETPLACE_SUPPORT_PHONE` (optional, defaults to `07913546586`)

- `MARKETPLACE_CRON_SECRET`

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
```

## Database

Apply the SQL files in `supabase/migrations/`. The marketplace logic depends on those migrations for:

- auction state transitions and settlement creation
- buy-now reservation start and cancellation
- notifications and email claim/delivery
- row-level security for public, buyer, seller, and admin access

## Operational Notes

- Stripe must point its webhook to `/api/stripe/webhook`.
- Hosted listing image URLs are intentionally restricted to Ex Kitchens or the configured Supabase storage host. Use the upload flow for everything else.
- Auction date/time inputs are captured in the admin user’s local timezone and stored in UTC.
- Buy-now cancellation is intentionally authenticated and no longer happens from a public GET route.
