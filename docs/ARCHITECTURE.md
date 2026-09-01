# Architecture — Home Inventory Manager

## Tech stack

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | Single app serves both UI and API routes — no separate backend to host, deploy, or keep in sync. |
| Hosting | Vercel | First-class Next.js support; pairs directly with Vercel Postgres/Neon and Vercel Blob. |
| Database | Postgres (Neon, provisioned via Vercel's Marketplace integration) | Relational data (items, categories, attachments) with real relationships and query needs (e.g. "warranties expiring this month") — a proper relational DB is a natural fit. Provisioning through Vercel's Neon integration (rather than a standalone Neon account) auto-manages most connection env vars and keeps billing/access under the same Vercel team. |
| ORM | Prisma | Schema-first migrations and a strongly-typed client suit this small, well-defined schema (User, Category, Item, Attachment); simpler day-to-day ergonomics than Drizzle for this scope. |
| File storage | Vercel Blob | Binary files (photos, receipts, warranty PDFs) do not belong in Postgres rows; Blob gives direct client-to-storage uploads with signed tokens, avoiding server payload limits. |
| Auth | Auth.js (NextAuth v5), Credentials provider, JWT sessions | Self-service, multi-user login: email+password registration, required email verification, and password reset. Sessions are JWTs, not database-backed — Auth.js's Credentials provider only supports JWT sessions (a hard library constraint, confirmed via a runtime `UnsupportedStrategy` error during implementation; database sessions require the OAuth-style account-linking flow that Credentials bypasses). One consequence: password reset can't force-revoke an existing session — a JWT stays valid until it expires. A token-versioning scheme would restore that property; not built yet. Credentials (not magic links) keeps day-to-day login free of email round-trips — email is only needed for the verification/reset side flows. |
| Transactional email | Resend (Production), Mailtrap via `nodemailer` (Preview, Development, and local dev) | Verification and password-reset emails require sending mail, a capability the app didn't previously need. Resend has a simple API and integrates cleanly with Vercel/Next.js. Reused for the expiration-notification digest (see "Expiration notification" below) via the same `sendMail()` core — Resend/Mailtrap is no longer scoped strictly to auth. Mailtrap's sandbox inbox stands in for every non-Production environment so testing never risks a real delivery or requires burning Resend's free-tier quota — see "Email delivery: environments" below. |
| Push notifications | `web-push` (Web Push API, VAPID) | Delivers expiration alerts even when the app/tab is closed — the only channel of the three (banner, email, push) that reaches the user proactively outside the browser. No existing push/PWA infrastructure before this; added as a small, dependency-light layer (one service worker, one npm package) rather than a full PWA. |
| Rate limiting | Upstash Redis + `@upstash/ratelimit` | The app is now publicly reachable with self-service registration, so `register`, `login`, and `forgot-password` need abuse protection. Vercel's serverless functions are stateless, so an in-memory counter wouldn't work across requests/instances — Upstash's Redis-backed limiter does. |
| Styling | Tailwind CSS, mobile-first utility usage | Fast to build a form-heavy CRUD UI consistently; utility classes are unprefixed for the mobile layout by default, with `sm:`/`md:` overrides layered on for wider viewports — matching the app's mobile-first, camera-first design (see "Styling & responsive strategy" below). |
| Validation | zod | Shared request/response validation between client forms and API routes. |
| Date handling | date-fns | Computing days-until-expiry (`src/lib/expiry.ts`) for the expiration notification system. |
| Scheduling | Vercel Cron | Triggers the daily expiration-notification check (`/api/cron/expiry-notifications`) — Hobby tier caps this at once/day, so the whole notification design is a daily batch, not instantaneous. |
| Receipt OCR | `tesseract.js`, client-side | Best-effort auto-fill of Name/Price/Purchase date from a captured receipt photo (`lib/receipt-scan.ts`). Chosen over a paid vision API (Claude/GPT-4o) or metered cloud OCR (AWS Textract, Google Document AI) to keep the feature at zero marginal cost — the tradeoff is lower accuracy and no true structured extraction, so results are regex/heuristic-parsed and always presented as a "please review" pre-fill, never trusted outright. Runs entirely in the browser (WASM in a Web Worker); no new API route, env var, or server compute. |

## System overview

```
                     ┌───────────────────────────┐
                     │        Browser client       │
                     │  (mobile camera / desktop)  │
                     └──────────────┬──────────────┘
                                    │ HTTPS
                                    ▼
                     ┌───────────────────────────┐
                     │        Next.js app          │
                     │  ┌───────────┐ ┌──────────┐ │
                     │  │  Pages /   │ │   API     │ │
                     │  │  UI (App   │ │  routes   │ │
                     │  │  Router)   │ │           │ │
                     │  └───────────┘ └────┬─────┘ │
                     │        Auth.js (session)     │
                     └──────────────┬───────┬──────┘
                                    │       │
                     ┌──────────────▼──┐ ┌──▼───────────────┐ ┌──▼─────────────┐
                     │ Postgres (Prisma)│ │ Vercel Blob store │ │ Resend (email)   │
                     │ users, categories,│ │ photos, receipts, │ │ verification &   │
                     │ items, attachments│ │ warranty docs      │ │ reset emails only │
                     └───────────────────┘ └───────────────────┘ └───────────────────┘
                                    │
                     ┌──────────────▼──────────────┐
                     │  Upstash Redis (rate limits)  │
                     │  register / login / forgot-pw │
                     └───────────────────────────────┘
```

Uploads go **directly** from the browser to Vercel Blob using a short-lived signed token issued by an API route — binary payloads never pass through the Next.js server itself, only the resulting Blob URL does. Resend and Upstash Redis are only ever called from server-side API routes (registration, login, password reset) — never from the browser.

## Project folder structure

```
home-inventory/
  prisma/
    schema.prisma
    seed.ts                     # seeds default categories + the single user account
  src/
    app/
      login/page.tsx
      register/page.tsx
      verify-email/page.tsx                   # landing page for the emailed verification link
      forgot-password/page.tsx
      reset-password/page.tsx                 # reads reset token from the URL
      api/
        auth/[...nextauth]/route.ts
        auth/register/route.ts
        auth/verify-email/route.ts
        auth/forgot-password/route.ts
        auth/reset-password/route.ts
        upload/route.ts                       # signed Vercel Blob upload token
        categories/route.ts, categories/[id]/route.ts
        items/route.ts, items/[id]/route.ts
        items/[id]/attachments/route.ts, items/[id]/attachments/[attId]/route.ts
        items/[id]/amc/route.ts, items/[id]/amc/[amcId]/route.ts
        settings/route.ts
        notifications/expiring/route.ts        # polled by ExpirationBanner for live updates
        push/subscribe/route.ts                # POST/DELETE a browser's push subscription
        cron/expiry-notifications/route.ts     # daily digest — see vercel.json's crons config
      (protected)/                            # route group, guarded by middleware
        dashboard/page.tsx
        categories/page.tsx
        items/page.tsx, items/new/page.tsx, items/[id]/page.tsx, items/[id]/edit/page.tsx
        settings/page.tsx
    components/
      upload/FileCaptureInput.tsx, AttachmentUploader.tsx, AttachmentGallery.tsx
      dashboard/CategoryCountCard.tsx, ExpirationBanner.tsx
      items/ItemForm.tsx, ItemCard.tsx, ItemFilterBar.tsx, AmcContractsField.tsx
      settings/PushNotificationToggle.tsx
      layout/NavBar.tsx
    lib/
      db.ts            # Prisma client singleton
      auth.ts           # NextAuth v5 config
      email.ts           # sends verification/reset/expiration-digest emails via Resend (prod) or Mailtrap/nodemailer (dev)
      push.ts            # sends Web Push notifications via web-push, prunes stale subscriptions
      rate-limit.ts       # Upstash Redis rate limiter helper
      blob.ts           # Blob upload helper
      expiry.ts          # canonical days-until-expiry helper (thresholds, expired/expiring-soon)
      expiring-entries.ts # shared dashboard/polling query — merges warranty + AMC results
      warranty.ts        # items expiring within the configured thresholds
      amc.ts             # AMC contracts expiring within the configured thresholds
      validations/item.ts, category.ts, auth.ts, amc.ts
    middleware.ts        # protects (protected)/* and item/category/settings API routes
  public/
    sw.js               # service worker — Web Push only, no offline caching
  .env.example
  vercel.json             # Vercel Cron config for the expiry-notification job
```

## Key data flows

### File upload (camera or gallery)
1. User selects/captures a file via `FileCaptureInput` (a single `<input type="file" capture="environment">` — camera on mobile, file picker on desktop).
2. Client requests a signed upload token from `POST /api/upload`.
3. Client uploads the file directly to Vercel Blob using that token.
4. Client posts the resulting `blobUrl` + metadata to `POST /api/items/[id]/attachments` (or holds it in local form state until item creation, for new items) to create an `Attachment` row linked to the item. The Profile avatar follows the same steps 1-3 but a different step 4: `PATCH /api/account/profile` sets `blobUrl` directly on `User.image` (no `Attachment` row, since it's a user-level image rather than an item-level one), deleting the previous avatar Blob if one existed.

### Auth

**Registration → verification:**
1. User submits email/password on `/register`. `POST /api/auth/register` checks the rate limiter, creates a `User` row (unverified) with a bcrypt-hashed password, creates the five default `Category` rows for that user in the same transaction, generates an `EmailVerificationToken`, and sends a verification email via Resend.
2. User clicks the emailed link → `/verify-email?token=...` → the page calls `GET /api/auth/verify-email` which validates the token, sets `User.emailVerified`, and invalidates the token.
3. The user is not logged in automatically — they proceed to `/login`.

**Login:**
1. User submits email/password on `/login`. `POST` goes through the rate limiter, then Auth.js's `CredentialsProvider` validates the bcrypt-hashed password.
2. The provider additionally checks `User.emailVerified` is set — if not, login is rejected with a "please verify your email" error instead of succeeding.
3. On success, a signed JWT session cookie is set. Enforcement is layered, not purely middleware-based (see "Route protection" below).

**Password reset:**
1. User submits their email on `/forgot-password`. `POST /api/auth/forgot-password` (rate limited) generates a `PasswordResetToken` and emails a reset link if the account exists — the response is identical either way, so the endpoint never reveals whether an email is registered.
2. User clicks the link → `/reset-password?token=...` → submits a new password → `POST /api/auth/reset-password` validates the token, updates `passwordHash`, and marks the token used. A currently-logged-in session elsewhere is **not** force-revoked by this — see the Auth tech-stack row above.

### Route protection

Protecting `(protected)/*` pages and the items/categories/settings/account/upload API routes is layered, not a single Edge middleware check, because database queries (needed to validate anything beyond "is there a session cookie at all") aren't available in the Edge runtime that `middleware.ts` runs in:

1. **`middleware.ts`** (Edge, fast-path only): redirects to `/login` if the request has *no* session cookie at all. This is a UX shortcut, not the authoritative check.
2. **`(protected)/layout.tsx`** (Node runtime): calls `auth()` and redirects to `/login` if there's no valid session — this is the real page-level enforcement.
3. **Every protected API route**: calls `auth()` itself and returns `401` if there's no valid session — this is the real route-level enforcement.

### Expiration notification (warranty + AMC)

Three delivery channels, one canonical set of thresholds: **30 / 7 / 1 days before** expiry (`EXPIRY_THRESHOLDS_DAYS` in `lib/expiry.ts`), never on/after the expiry date, never repeated.

- **`lib/expiry.ts`** is the single source of truth for expiry date-math: `getExpiryStatus(date)` returns `{ daysUntil, isExpired, isExpiringSoon }`, consumed by `lib/warranty.ts`/`lib/amc.ts` (the dashboard/polling query layer), the item detail page, and the cron job below. (Previously these had three independent, disagreeing implementations — a `startOfMonth`/`endOfMonth` window that silently dropped already-expired items once the month rolled over, and a separate rolling-30-day check on the item detail page.)
- **In-app live banner**: `lib/expiring-entries.ts`'s `getExpiringEntries(userId)` (items/AMCs expiring within 30 days or already expired, gated by `warrantyNotificationsEnabled`/`amcNotificationsEnabled`) backs both the dashboard's SSR initial paint and `GET /api/notifications/expiring`, which `ExpirationBanner` polls every 60s (paused while the tab is hidden, refetched immediately on refocus) so the banner updates without a manual reload.
- **Email**: `GET /api/cron/expiry-notifications` (Vercel Cron, daily at 13:00 UTC per `vercel.json` — Hobby tier caps cron at once/day) finds every warranty/AMC crossing a threshold today, batches them per user into one digest, and sends via `sendExpirationDigestEmail()` in `lib/email.ts` (same Resend/Mailtrap transport as verification/reset email), gated by `UserPreferences.emailNotificationsEnabled`.
- **Push**: the same cron run also sends one summarized push per user (if they have any `PushSubscription` rows) via `lib/push.ts`'s `sendPushToUser()` (the `web-push` package + VAPID keys). Subscribing happens client-side in Settings (`PushNotificationToggle`) via the service worker at `public/sw.js`; it's a per-device toggle, not account-wide — a user must enable it separately on each browser/device they want notified. Stale subscriptions (`410`/`404` from the push service) are pruned automatically.
- **Dedup**: `ExpiryNotificationLog` records `(userId, sourceType, sourceId, thresholdDays, channel)` the moment a send succeeds, so the same threshold/channel is never notified twice — the cron is safe to re-run or overlap.
- Auth for the cron route is `Authorization: Bearer $CRON_SECRET`, which Vercel sends automatically on cron-triggered requests; it's the one route in this app that isn't session-authenticated.

## Styling & responsive strategy

The app is mobile-first: it's built and tested for a phone viewport first (camera capture, the primary use case, only happens there), then progressively enhanced for wider screens — never the reverse. Tailwind's utility system matches this directly: **unprefixed utilities are the mobile/base styles**; `sm:`/`md:`/`lg:` prefixes layer on overrides for wider viewports. Every component is written mobile-first — base classes first, breakpoint-prefixed classes added only where a wider layout genuinely differs — never the other way around (no `lg:` base with mobile as the override).

Tailwind's default `sm` breakpoint (`640px`) is used as the app's one meaningful layout breakpoint, matching `docs/DESIGN.md`'s "single-column below ~640px, multi-column grids above" rule. Content stays in a centered `max-w-2xl` (640px) column even on large screens — see `docs/DESIGN.md`'s design principles — so wide viewports don't get a full-bleed dashboard, just more columns inside that same column (e.g. category cards go from a 2-column to a 3-column grid at `sm:`, item cards go from stacked to a 2-up grid). This is deliberate: forms and lists stay readable, and the layout logic that must be tested is "does this grid gain a column," not "does this whole page reflow into a different structure."

`tailwind.config.ts` extends the default theme with the token values from `docs/DESIGN.md`'s "Visual style notes" (colors as CSS variables so light/dark both resolve through the same Tailwind class names):

```ts
// tailwind.config.ts (excerpt)
export default {
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        border: 'var(--border)',
        text: 'var(--text)',
        'text-secondary': 'var(--text-secondary)',
        accent: 'var(--accent)',
        'warn-bg': 'var(--warn-bg)',
        'warn-text': 'var(--warn-text)',
      },
      borderRadius: { card: '12px' },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Manrope', 'Inter', 'sans-serif'],
      },
      spacing: { 18: '4.5rem' }, // fills the one gap in the default 8px-based scale this design needs
    },
  },
};
```

The CSS variables themselves are defined once in `globals.css` under `:root` (light) and `@media (prefers-color-scheme: dark)` (dark), exactly as specified in `docs/DESIGN.md` — Tailwind classes like `bg-surface` or `text-warn-text` then resolve to the right value in either theme without any `dark:` variant needed for color. `dark:` prefixes are reserved for the rare case where something other than a color token must change between themes.

## Email delivery: environments

`lib/email.ts` supports two swappable transports rather than always hitting Resend:

- **Resend**: HTTP API, real delivery to real inboxes.
- **Mailtrap**: SMTP via `nodemailer`, pointed at a [Mailtrap](https://mailtrap.io) Email Testing sandbox inbox. Mailtrap never actually delivers mail — it captures every message in a web UI (rendered HTML, headers, spam score) so verification/reset emails can be inspected and clicked through without a real inbox and without any risk of emailing a real address while iterating.

The transport is selected by an `EMAIL_PROVIDER` env var (`resend` | `mailtrap`), falling back to `mailtrap` when `NODE_ENV !== 'production'` if unset. In this project `EMAIL_PROVIDER` is set explicitly per Vercel environment rather than left to that fallback:

| Environment | `EMAIL_PROVIDER` | Sends to |
|---|---|---|
| Production (live site) | `resend` | Real inboxes, via a real `RESEND_API_KEY` |
| Preview (Vercel) | `mailtrap` | Mailtrap sandbox only |
| Development (Vercel) | `mailtrap` | Mailtrap sandbox only |
| Local dev (`.env.local`) | `resend` | Real inboxes — set to match Production so `npm run dev` can also be used to test real delivery; switch it back to `mailtrap` locally if you'd rather not spend real-send quota while iterating. |

Both transports go through the same `sendMail()` core (`sendVerificationEmail()` / `sendPasswordResetEmail()` / `sendExpirationDigestEmail()`), so the rest of the app never needs to know which one is active. `EMAIL_FROM` is `Home Inventory <noreply@liveosoft.com>` everywhere — liveosoft.com is verified as a sending domain in Resend (as of 2026-08-28), replacing the earlier shared `onboarding@resend.dev` sender. A verified domain both improves deliverability and lifts Resend's sandbox restriction that otherwise limits delivery to the account's own address — Production can now send to any recipient.

**Mailtrap env vars** (`MAILTRAP_HOST`, `MAILTRAP_PORT`, `MAILTRAP_USER`, `MAILTRAP_PASS`) are only read when `EMAIL_PROVIDER=mailtrap`. If they're left blank, `lib/email.ts` doesn't attempt to send at all — it logs the verification/reset link to the server console instead, so registration and password reset work end-to-end before Mailtrap is even set up.

**Known gap**: local dev's `EMAIL_PROVIDER=resend` means running `npm run dev` and registering sends a real email through the same Resend account/quota as Production — there's no environment-level separation between "testing locally" and "a real user registering." Acceptable for a single-developer hobby project at this stage; revisit if that stops being true.

## Deployment

The app is live: **https://home-inventory-ecru.vercel.app** (Vercel project `home-inventory`, team `jamils-projects-6bdde949`). Deploys are currently manual (`vercel deploy --prod`) — the GitHub repo (`skjamil/home-inventory`) is not yet connected for auto-deploy-on-push; that requires installing the Vercel GitHub App via the dashboard (Project → Settings → Git), a one-time browser/OAuth step nobody has completed yet.

- **Host**: Vercel.
- **Database**: Neon, provisioned via Vercel's Marketplace integration (see the Database row in the tech stack table above). The integration auto-manages `DATABASE_URL` (pooled) plus a batch of `PG*`/`POSTGRES_*`/`DATABASE_URL_UNPOOLED` vars across Production/Preview/Development — but **not** `DIRECT_URL`, which `schema.prisma`'s `directUrl` needs separately; it was added by hand, set to the same value as the integration's `DATABASE_URL_UNPOOLED`.
- **File storage**: Vercel Blob store, provisioned per-project (`BLOB_READ_WRITE_TOKEN`, already set across all three environments).
- **Build step — Prisma + Vercel's dependency cache**: Vercel caches `node_modules` between builds, which skips Prisma's normal generate-on-install step and leaves a stale/missing Prisma Client, failing the build with `PrismaClientInitializationError`. Fixed by a `"postinstall": "prisma generate"` script in `package.json` — required for any Prisma-using project deployed to Vercel, not optional.
- **Environment variables**: `DATABASE_URL`, `DIRECT_URL`, `BLOB_READ_WRITE_TOKEN`, `AUTH_SECRET`, `AUTH_URL`, `EMAIL_PROVIDER`, `EMAIL_FROM`, `RESEND_API_KEY` (Production only), Mailtrap's `MAILTRAP_HOST`/`MAILTRAP_PORT`/`MAILTRAP_USER`/`MAILTRAP_PASS` (Preview/Development only) — see "Email delivery: environments" above for exactly which environment gets which email vars. `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are not yet set anywhere (see "Known gaps" below). `CRON_SECRET` (verifies Vercel Cron's calls to `/api/cron/expiry-notifications`) and `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`/`NEXT_PUBLIC_VAPID_PUBLIC_KEY` (Web Push, generated once via `npx web-push generate-vapid-keys`) back the expiration notification system — see "Expiration notification" above.
- **`AUTH_URL`** is Production-only and must match whatever domain Vercel actually assigns the project (not necessarily `<project-name>.vercel.app` — a name collision can force a suffixed domain, as happened here: `home-inventory-ecru.vercel.app`). It's read directly by `lib/email.ts` to build links inside verification/reset emails, so a stale value silently breaks those emails without erroring. Vercel bakes env vars into a deployment at build time, so a value change only takes effect after the next deploy.

### Known gaps

- **Production, Preview, and Development currently share the same Neon database branch and the same `AUTH_SECRET` value.** Local development (`npm run dev`) and any future Preview deployment read and write the exact same data as the real production site — there is no isolation. The intended fix is a separate Neon branch (Neon's branching is built for exactly this, and stays within the free tier) scoped to Preview/Development, with its own `AUTH_SECRET`; discussed but deliberately deferred, not yet built.
- **Rate limiting is not configured in any environment** — `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are unset, so `register`/`login`/`forgot-password` are unthrottled everywhere, including Production (`lib/rate-limit.ts` no-ops without them by design, so this fails open rather than breaking the app).
- **Expiration notifications are a once-daily batch, not instantaneous** — Vercel Cron on the Hobby tier only supports once-a-day granularity, so "real-time" here means "checked once a day and delivered same-day," not push-the-moment-a-threshold-is-crossed. Upgrading to Pro would allow a finer schedule.
- **Push notification subscriptions are per-device**, not account-wide — enabling push on one browser doesn't show as "on" when the same user checks Settings on another device/browser. A cross-device "manage devices" view isn't built.
- **No custom app icon exists yet** — the service worker's `showNotification()` omits a custom icon (the browser's default is used) since `public/` has no icon assets; a proper icon can be added later without touching the notification mechanics.
