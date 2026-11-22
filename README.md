# OUTBIDLY

A Next.js/Supabase foundation for an international business discovery and paid-ranking platform. **Not production-ready and not live. Payment processing is deliberately disabled.** No provider calls, checkout, webhook, exchange rate integration, refunds, or financial reconciliation are implemented. Do not accept payments or insert ledger entries until those systems have been built, independently reviewed and tested.

## Local setup

1. Create a **new, dedicated** Supabase project; do not reuse another application's database. Install the Supabase CLI and apply `supabase/migrations` with `supabase db push` after linking the new project. Configure email confirmation and the callback URL in Supabase Auth.
2. Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_APP_URL` to the actual app origin, and the Supabase URL and anon/publishable key. Public variables are safe for browser use. All other listed keys are server-only; never commit them.
3. `npm install` then `npm run dev`. Open the local preview. Authentication, registration, moderation, profiles and data-backed searches require the dedicated Supabase project and migration.
4. Create an account and confirm its email. Assign an administrator via the trusted Supabase SQL editor, using the actual auth user UUID: `insert into public.user_roles(user_id,role) values ('<user-uuid>','admin');`. Never expose this operation to public users.

## Status and launch blockers

The schema provides basic RLS, unique business-category relationships, owner registration, an audited admin review action and a read-only leaderboard query. It is a starting point, not the complete requested system. In particular: country/city/currency datasets and validation, secure image content scanning, business edit/review workflows, analytics, notification UI/email, administration beyond reviews, pagination, historical snapshots, full SEO, rate limiting, accessibility review and comprehensive tests remain to be built. The ranking query is provisional: tie handling and reversal semantics, normalized location/currency, archives, performance and consistency require proper design and tests before any financial use.

For payments, implement a provider adapter with country/currency configuration and transaction-specific Flutterwave Standard checkouts; use the **current official Flutterwave documentation** to implement and test webhook authenticity and direct server-side verification. Enforce ownership, approval, category and per-country first/top-up minimums on the server. Persist idempotent verification events and immutable contribution/reversal records in an atomic transaction, snapshot real exchange rates and hold payments without reliable rates. Add reconciliation, fraud and refund handling, audit logs, operational alerts, and sandbox end-to-end tests before considering live mode. Never rely on redirects for payment success. No exchange rates or payment success are fabricated here.

Legal pages are drafts, not legal advice. Review with counsel. Before deploying to Vercel, configure the dedicated project and secrets, enable secure Auth redirect URLs, test RLS and all critical flows, and conduct security and financial review. The application has not been deployed or tested with live services.

## Connected OUTBIDLY project

The dedicated project `qshlnvccuwavuodcikah` has the three migrations in `supabase/migrations` applied. The 44 initial categories are present; no example businesses or payments were created. Local migration filenames match the remote migration versions. Administrators can create, edit, deactivate, and reactivate categories with an audit reason, and recipients can mark their in-app notifications as read. There is no default administrator: promote an existing confirmed user using the trusted setup step above.

For local development, `.env.local` can contain the project URL and its **publishable/anon** key; it is ignored by Git. Set `NEXT_PUBLIC_APP_URL` to the exact accessible application origin and configure the matching Supabase Auth site URL and redirect allowlist before testing email signup or recovery. Do not use localhost for an externally hosted deployment. The current Supabase Auth settings still need an appropriate deployed origin and production email configuration.

The Arena sandbox cannot reach this project's Supabase endpoint directly, so end-to-end sign-in, email verification, business submission and image upload have not been verified from the preview. Database metadata and functions were inspected through the Supabase connector. A successful database migration does not mean the app is deployed or production-ready; payment and launch blockers above remain.

Account settings now allow a signed-in user to update their name and international-format phone number, or change their password after confirming the current password. Email changes are not implemented. These flows still require end-to-end testing against the configured authentication service.
