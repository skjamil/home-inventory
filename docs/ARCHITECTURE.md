# Architecture — Home Inventory Manager

## Tech stack

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | Single app serves both UI and API routes — no separate backend to host, deploy, or keep in sync. |
| Hosting | Vercel | First-class Next.js support; pairs directly with Vercel Postgres/Neon and Vercel Blob. |
| Database | Postgres (Neon or Vercel Postgres) | Relational data (items, categories, attachments) with real relationships and query needs (e.g. "warranties expiring this month") — a proper relational DB is a natural fit. |
| ORM | Prisma | Schema-first migrations and a strongly-typed client suit this small, well-defined schema (User, Category, Item, Attachment); simpler day-to-day ergonomics than Drizzle for this scope. |
| File storage | Vercel Blob | Binary files (photos, receipts, warranty PDFs) do not belong in Postgres rows; Blob gives direct client-to-storage uploads with signed tokens, avoiding server payload limits. |
| Auth | Auth.js (NextAuth v5), Credentials provider, JWT sessions | Self-service, multi-user login: email+password registration, required email verification, and password reset. Sessions are JWTs, not database-backed — Auth.js's Credentials provider only supports JWT sessions (a hard library constraint, confirmed via a runtime `UnsupportedStrategy` error during implementation; database sessions require the OAuth-style account-linking flow that Credentials bypasses). One consequence: password reset can't force-revoke an existing session — a JWT stays valid until it expires. A token-versioning scheme would restore that property; not built yet. Credentials (not magic links) keeps day-to-day login free of email round-trips — email is only needed for the verification/reset side flows. |
| Transactional email | Resend (production), Mailtrap via `nodemailer` (local dev) | Verification and password-reset emails require sending mail, a capability the app didn't previously need. Resend has a simple API and integrates cleanly with Vercel/Next.js; scoped strictly to these two auth flows — it is **not** used for warranty notifications, which stay in-app only. Mailtrap's sandbox inbox stands in during local development so testing never risks a real delivery or requires a live Resend account — see "Local development — email testing" below. |
| Rate limiting | Upstash Redis + `@upstash/ratelimit` | The app is now publicly reachable with self-service registration, so `register`, `login`, and `forgot-password` need abuse protection. Vercel's serverless functions are stateless, so an in-memory counter wouldn't work across requests/instances — Upstash's Redis-backed limiter does. |
| Styling | Tailwind CSS, mobile-first utility usage | Fast to build a form-heavy CRUD UI consistently; utility classes are unprefixed for the mobile layout by default, with `sm:`/`md:` overrides layered on for wider viewports — matching the app's mobile-first, camera-first design (see "Styling & responsive strategy" below). |
| Validation | zod | Shared request/response validation between client forms and API routes. |
| Date handling | date-fns | Computing "expiring this month" windows. |

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
        settings/route.ts
      (protected)/                            # route group, guarded by middleware
        dashboard/page.tsx
        categories/page.tsx
        items/page.tsx, items/new/page.tsx, items/[id]/page.tsx, items/[id]/edit/page.tsx
        settings/page.tsx
    components/
      upload/FileCaptureInput.tsx, AttachmentUploader.tsx, AttachmentGallery.tsx
      dashboard/CategoryCountCard.tsx, WarrantyBanner.tsx
      items/ItemForm.tsx, ItemCard.tsx, ItemFilterBar.tsx
      layout/NavBar.tsx
    lib/
      db.ts            # Prisma client singleton
      auth.ts           # NextAuth v5 config
      email.ts           # sends verification/reset emails via Resend (prod) or Mailtrap/nodemailer (dev)
      rate-limit.ts       # Upstash Redis rate limiter helper
      blob.ts           # Blob upload helper
      warranty.ts        # "expiring this month" query
      validations/item.ts, category.ts, auth.ts
    middleware.ts        # protects (protected)/* and item/category/settings API routes
  .env.example
```

## Key data flows

### File upload (camera or gallery)
1. User selects/captures a file via `FileCaptureInput` (a single `<input type="file" capture="environment">` — camera on mobile, file picker on desktop).
2. Client requests a signed upload token from `POST /api/upload`.
3. Client uploads the file directly to Vercel Blob using that token.
4. Client posts the resulting `blobUrl` + metadata to `POST /api/items/[id]/attachments` (or holds it in local form state until item creation, for new items) to create an `Attachment` row linked to the item.

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

### Warranty notification
1. `lib/warranty.ts` queries items where `warrantyExpiration` falls between the start and end of the current calendar month.
2. The dashboard server component runs this query only if the user's `warrantyNotificationsEnabled` preference is true, and renders the count/banner accordingly.

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

## Local development — email testing

`lib/email.ts` supports two swappable transports rather than always hitting Resend:

- **Production** (default): Resend's HTTP API, as described above.
- **Local development**: SMTP via `nodemailer`, pointed at a [Mailtrap](https://mailtrap.io) Email Testing sandbox inbox. Mailtrap never actually delivers mail — it captures every message in a web UI (rendered HTML, headers, spam score) so verification/reset emails can be inspected and clicked through without a real inbox and without any risk of emailing a real address while iterating.

The transport is selected by an `EMAIL_PROVIDER` env var (`resend` | `mailtrap`), defaulting to `mailtrap` when `NODE_ENV !== 'production'`. Both transports go through the same `sendVerificationEmail()` / `sendPasswordResetEmail()` functions, so the rest of the app never needs to know which one is active.

**Local-only env vars** (set in `.env.local`, not needed in production): `EMAIL_PROVIDER=mailtrap`, `MAILTRAP_HOST`, `MAILTRAP_PORT`, `MAILTRAP_USER`, `MAILTRAP_PASS` (from the sandbox inbox's SMTP credentials in the Mailtrap dashboard). If `MAILTRAP_USER`/`MAILTRAP_PASS` are left blank, `lib/email.ts` doesn't attempt to send at all — it logs the verification/reset link to the server console instead, so registration and password reset work end-to-end before Mailtrap is even set up.

## Deployment assumptions

- **Host**: Vercel.
- **Database**: Neon or Vercel Postgres (serverless-friendly connection pooling).
- **File storage**: Vercel Blob store, provisioned per-project.
- **Environment variables**: `DATABASE_URL`, `DIRECT_URL`, `BLOB_READ_WRITE_TOKEN`, `AUTH_SECRET`, `AUTH_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. (Mailtrap's SMTP vars are local-development-only — see "Local development — email testing" above — and aren't part of the production deployment.)
