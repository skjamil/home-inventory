# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Model usage policy

Default to the most cost-efficient model capable of the task — do not reach for an expensive model first "to be safe." This applies to **every** task in this repo, not just large ones.

- Start with the cheapest model that could plausibly handle the task (mechanical/boilerplate work: CRUD routes, form fields, simple component wiring, doc updates, straightforward bug fixes, formatting). Escalate only when the cheaper one demonstrably can't do the job — it fails, produces wrong output, or the task genuinely requires deeper judgment (ambiguous architecture/design tradeoffs, security-sensitive logic, multi-file refactors with non-obvious ripple effects).
- When delegating to a subagent, pass an explicit cost-efficient `model` override unless the subagent's own work is itself the kind of complex reasoning that justifies a more expensive model.
- If unsure which tier a task needs, try the cheaper model first and escalate on failure rather than defaulting up front to the expensive one.
- **Opus and Fable require a stop-and-ask gate.** If a task seems to genuinely need Opus or Fable specifically (not just Sonnet), do not switch to it or delegate to it unilaterally — **stop execution first**, explain in one or two sentences why the cheaper tiers aren't enough for this specific task, and ask the user for permission. Only continue with Opus/Fable once they've granted it; if they decline, keep working the task with the cheaper tier as far as it can go.

## Project state

The Next.js app is scaffolded and builds cleanly (`npm run build` passes end-to-end: every page and API route compiles and type-checks). It has not been run against a real database yet — `.env.local` holds placeholder values so the dev server can start; a real `DATABASE_URL` (Neon/Vercel Postgres free tier) is needed before register/login/items actually work. `docs/` (the spec) and `design/` (the mockup canvas) predate the code and remain the source of truth for anything not yet built.

**Commands**: `npm install`, `npm run dev` (dev server), `npm run build` (production build + typecheck + lint), `npm run lint`, `npx prisma generate` (regenerate the client after a schema change), `npx prisma migrate dev` (needs a real `DATABASE_URL`), `npx prisma studio`.

**Known follow-ups from the initial build** (not yet done):
- No real database has been connected/migrated — do that before testing any flow end-to-end.
- Session strategy is JWT, not the database sessions originally planned — Auth.js's Credentials provider only supports JWT (see the Auth row below). One consequence: a password reset can't force-revoke an existing session; a token-versioning scheme would restore that, not built yet.
- Route protection is layered (Edge middleware fast-path + real checks in `(protected)/layout.tsx` and every API route) rather than a single middleware check, because Prisma isn't Edge-compatible — see "Route protection" in `docs/ARCHITECTURE.md`.
- A few UI/UX gaps flagged during a docs-vs-mockups review are still open (not blocking): warranty dates aren't visually highlighted when due soon; replacing an existing receipt/warranty file uses a native `confirm()`/`prompt()` dialog rather than an in-page control.

## `docs/` is the source of truth — read before writing any app code

- `PROJECT_VISION.md` — problem statement, goals/non-goals, target user (self-service, multi-user, each account's inventory private).
- `ARCHITECTURE.md` — tech stack with rationale, system diagram, project folder structure, key data flows (file upload, auth, warranty notification), the Tailwind/mobile-first responsive strategy, required env vars.
- `MODULES.md` — six feature modules (Auth, Categories, Items, Attachments/Upload, Dashboard, Settings) and the **canonical Prisma schema** at the bottom.
- `API.md` — every route: method, auth requirement, request/response shape, error cases.
- `DESIGN.md` — screen inventory, user flows, and the visual style tokens (colors, type, spacing, icons) referenced from `design/`.

**Standing rule**: whenever a design or requirements decision changes during a session, update the corresponding `docs/*.md` file(s) in the same pass — don't let the docs drift from what was actually decided.

### Architecture points that span multiple files

- **Full-stack Next.js (App Router) on Vercel**, one app for both UI and API routes. Postgres (Prisma) for records, **Vercel Blob for all binaries** (photos, receipts, warranty docs) — never store files in Postgres.
- **Uploads bypass the Next.js server for the actual file bytes.** The browser requests a signed token from `POST /api/upload`, then PUTs the file straight to Blob; only the resulting `blobUrl` round-trips through the API to get linked to an `Attachment` row. See "File upload" in `ARCHITECTURE.md`.
- **Auth is self-service and multi-user**: Auth.js credentials provider + JWT sessions (Credentials only supports JWT, not database sessions — a hard library constraint, confirmed at runtime), required email verification before first login, email-based password reset, rate limiting (Upstash) on `register`/`login`/`forgot-password`/`resend-verification`. Route protection is layered — a lightweight Edge middleware fast-path, plus the real enforcement in `(protected)/layout.tsx` and every protected API route (Prisma isn't Edge-compatible, so middleware alone can't do it). Resend sends **only** verification/reset emails (Mailtrap via `nodemailer` stands in for Resend in local dev — see `ARCHITECTURE.md`) — it is never used for the warranty notification, which is strictly in-app (a dashboard banner + a Settings toggle). Don't conflate the two email-adjacent concerns.
- **Data model**: `User` / `Category` / `Item` / `Attachment`. `Category` is a user-editable table, **auto-seeded per user at registration** (not a global one-time seed, not a hardcoded enum) — five defaults (Electronics, Furniture, Tools, Kitchen, Storage) created in the same transaction as the user. `Attachment` is one polymorphic table (`type`: `PHOTO` / `RECEIPT` / `WARRANTY`) rather than three separate tables.
- **Mobile-first, one capture component**: a single `<input type="file" capture="environment">` (`FileCaptureInput`) serves both camera capture and gallery/file-picker — no separate code paths for mobile vs. desktop. Tailwind usage is mobile-first (unprefixed classes = the phone layout; `sm:` and up add overrides), and 640px (Tailwind's default `sm`) is the one real layout breakpoint — content stays in a centered 640px column even on wide screens; only the grids inside it gain columns.

## `design/` — visual workflow canvas

`.dc.html` files here are **Design Components** source, authored/edited through the `/design` skill (Claude Design's canvas editor). Each `.dc.html` is one artboard; `canvas.json` positions them on the canvas and holds the explanatory sticky-note annotations. `Main.dc.html` is the required entry artboard and contains the Dashboard screen.

- 11 phone-width (390×760) mockups covering the full flow: Register → Verify Email → Login (with a Forgot/Reset Password branch) → Dashboard → Item List → Item Detail → Item Create/Edit → Categories → Settings.
- 3 desktop-width (960×760) companions (`DashboardDesktop`, `ItemListDesktop`, `ItemDetailDesktop`) demonstrating the responsive breakpoint described in `DESIGN.md`.
- `home-inventory-workflow.html` is the **seeded, published output** (an Artifact) — generated from the files above via the `/design` skill's `seed-canvas.mjs` helper. **Never hand-edit this file.** To change the design, edit the source `.dc.html`/`canvas.json` files and re-run the seed step, then republish.
