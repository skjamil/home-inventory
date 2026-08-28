# UI/UX Design — Home Inventory Manager

This document covers screens, user flows, and layout. Data model lives in `MODULES.md`; API contracts live in `API.md`.

## Design principles

- **Mobile-first**: camera capture is the primary way receipts/warranty docs get added, so forms and the upload control must work comfortably on a phone screen first, and scale up for desktop.
- **Low friction**: adding an item should be fast — only `name` and `category` are required; every other field (price, warranty date, serial number, location, attachments) is optional and can be filled in later.
- **Glanceable dashboard**: the user should be able to open the app and immediately see category counts and whether anything needs attention (warranty banner), without navigating further.

## Screen inventory

| Screen | Route | Purpose |
|---|---|---|
| Register | `/register` | Self-service account creation. |
| Verify Email | `/verify-email` | Landing page for the emailed verification link. |
| Login | `/login` | Email/password login. |
| Forgot Password | `/forgot-password` | Request a password-reset email. |
| Reset Password | `/reset-password` | Set a new password from an emailed link. |
| Dashboard | `/dashboard` | Category counts + warranty-expiration banner; entry point after login. |
| Item List | `/items` | Browse/filter/search all items. |
| Item Detail | `/items/[id]` | View one item's full details and attachments. |
| Item Create | `/items/new` | Add a new item. |
| Item Edit | `/items/[id]/edit` | Edit an existing item. |
| Categories | `/categories` | Add/rename/delete categories. |
| Settings | `/settings` | Notification toggle, password change. |

## Screen details

### Register
- Centered card: email field, password field, confirm-password field, submit button.
- On success, does **not** log the user in — shows a "Check your email to verify your account" confirmation state instead, with a link back to `/login`.
- Inline validation errors: invalid email format, password too weak, passwords don't match, email already registered.
- Link to `/login` for existing users ("Already have an account? Log in").

### Verify Email
- No form — the page reads the token from the URL on load and calls the verification endpoint.
- Success state: confirmation message + button to `/login`.
- Failure state (invalid/expired/already-used token): explanation + a way to request a new verification email (re-triggers registration's email step for that address).

### Login
- Centered card: email field, password field, submit button, error message area.
- Error states: invalid credentials; "please verify your email" (with a "resend verification email" action); rate-limit lockout ("too many attempts, try again in a few minutes").
- Links: "Don't have an account? Sign up" → `/register`; "Forgot password?" → `/forgot-password`.

### Forgot Password
- Centered card: email field, submit button.
- On submit, always shows the same generic confirmation message ("If an account exists for this email, a reset link has been sent") regardless of whether the email is registered — avoids leaking account existence.
- Link back to `/login`.

### Reset Password
- Reads the reset token from the URL on load.
- Centered card: new-password field, confirm-password field, submit button.
- Invalid/expired token: explanation + link to `/forgot-password` to request a new one.
- On success: redirect to `/login` with a confirmation message.

### Dashboard
- Header with app name and avatar; navigation to Items / Categories / Settings is a **persistent bottom tab bar** (Home / Items / Categories / Settings) shown on all four root screens. Item Detail and Item Create/Edit are pushed screens instead — a back-arrow header, no tab bar — since they're reached by drilling into a root screen, not tab destinations themselves.
- **Expiration banner** (top, only rendered if at least one half is enabled and the combined count > 0): a combined "N warranties + M AMCs expire this month" banner (either clause omitted if its count is 0) with an expandable, date-sorted list of the affected items — each row tagged "Warranty" or "AMC" and linking to `/items/[id]`. Warranty and AMC halves are gated independently by their own Settings toggle (`warrantyNotificationsEnabled`, `amcNotificationsEnabled`).
- **Category count cards**: a grid of cards, one per category, showing category name and item count (mirrors the example: Electronics 12, Furniture 8, Tools 17, Kitchen 34, Storage 9). Tapping a card navigates to `/items?categoryId=...`.
- Empty state (no items yet): a prompt to add the first item.

### Item List
- Filter bar: category **chips** (All, one per category, plus an "Expiring" chip) rather than a dropdown — a single tap beats a two-step dropdown on mobile — plus text search (matches name/serial number). Chips wrap onto additional lines rather than scrolling horizontally, so every category stays visible without a swipe. The "Expiring" chip is pre-selected when arriving from the dashboard banner.
- List/grid of `ItemCard`s: item name, category badge, thumbnail (first photo if present), warranty expiration (highlighted if within 30 days), price.
- "Add item" button (floating action button on mobile, standard button on desktop) linking to `/items/new`.

### Item Detail
- Item name and category at top, with Edit and Delete actions.
- Field list: purchase date, price, warranty expiration, serial number, location, notes. Warranty expiration uses the same "highlighted if within 30 days" rule as the Item List (also covers an already-passed date) — a date further out renders as plain text, not a false alarm.
- Photo gallery (thumbnail grid, tap to view full-size).
- Receipt and Warranty document shown as labeled attachment cards (thumbnail if image, file icon + filename if PDF), tap to open/download.
- **AMC Contracts** section (full-width, below the photo/fields layout): a card per contract — provider, cost, start–end date range (same "highlighted if within 30 days" rule, applied to `endDate`), and a document link card if one is attached. Empty state: "No AMC contracts on file."
- Delete requires a confirmation step (irreversible — removes attachments and AMC contracts too).

### Item Create / Edit (`ItemForm`)
- Single-column form (mobile-first): Name*, Category* (dropdown, with an inline "add new category" option), Purchase date (date picker), Price (numeric input), Warranty expiration (date picker), Serial number, Location, Notes.
- Attachment sections: Photos (multi-capture, shows thumbnails of already-added photos with a remove option), Receipt (single-capture, replaceable), Warranty document (single-capture, replaceable) — each using the shared camera/gallery control described below.
- **AMC Contracts section** (`AmcContractsField`): a repeatable list of contract cards, the first add/edit/delete-in-place list in the app (distinct from the attach/detach-only Photo/Receipt/Warranty sections above). "+ Add contract" opens an inline form (Provider*, Cost, Start date, End date, a document field reusing the shared camera/gallery control) with explicit Save/Cancel — not save-on-blur, since it's multi-field. In edit mode, each Save/Delete hits the AMC API immediately; in create mode, contracts are held locally and submitted together with the new item.
- Save / Cancel actions; Save is disabled until required fields (Name, Category) are filled.

### Categories
- Simple list of existing categories with item counts, each with rename (inline edit) and delete (blocked with a message if items still reference it, prompting reassignment first) actions.
- "Add category" input at the top.

### Settings
- Two toggle switches: "Warranty expiration banner" (bound to `warrantyNotificationsEnabled`) and "AMC expiration banner" (bound to `amcNotificationsEnabled`), independently controlling each half of the Dashboard's combined expiration banner.
- Change password form (current password, new password, confirm).
- Log out action, below the account form — the only sign-out entry point in the app.

## Camera / gallery capture UX

- One shared control (`FileCaptureInput`) used for Photos, Receipt, and Warranty document sections.
- On mobile browsers, tapping the control opens the device's native choice sheet (camera or existing photos/files), driven by `<input type="file" capture="environment">` — no custom camera UI needs to be built.
- On desktop browsers, the same control simply opens the normal OS file picker (the `capture` attribute is a no-op there), so no separate "desktop mode" is needed.
- Accepted types: images (`image/*`) and PDFs (`application/pdf`) for Receipt/Warranty; images only for Photos.
- While uploading, show a small inline progress indicator on the thumbnail/placeholder; on failure, show a retry affordance without losing the rest of the form's data.
- Multiple photos can be added one at a time or via a multi-select gallery picker; Receipt and Warranty each hold a single file (adding a new one replaces the old, with a confirmation if replacing an existing file).

## Visual style notes

**Direction**: "quiet utility" — Linear/Notion/Things-3-like. Neutral backgrounds, generous whitespace, one confident accent color, subtle borders/shadows instead of heavy chrome, so the focus stays on the user's data (their stuff) rather than the interface. This is a personal utility app, not a marketing site.

### Color palette

| Token | Light | Dark |
|---|---|---|
| Background | `#FAFAF9` | `#111113` |
| Surface (cards) | `#FFFFFF` | `#1B1B1F` |
| Border | `#E5E5E3` | `#2A2A2E` |
| Text primary | `#1A1A19` | `#F2F2F0` |
| Text secondary | `#6B6B68` | `#9A9A97` |
| Accent (primary actions, links) | `#0F766E` (teal) | `#2DD4BF` (lighter, keeps contrast on dark) |
| Warranty banner | `#D97706` on `#FEF3C7` | `#FBBF24` on `#3F2E0A` |

Both light and dark mode are supported via CSS variables from the start (cheap to add this way, expensive to retrofit). Warm amber is used specifically for the warranty banner so it draws the eye without reading as a hard error — nothing is broken, it's just a heads-up.

### Typography

- Inter or Manrope (system-font fallback `-apple-system`/`Segoe UI` is an acceptable zero-cost substitute).
- Tabular figures for numbers (prices, counts, dates) so category-count cards and price fields align cleanly in a grid.

### Layout & spacing

- 8px base spacing unit — all padding/margins as multiples of 8 (8/16/24/32px).
- Card radius: 12px — soft enough to feel approachable, not so round it feels toy-like.
- Max content width ~640px on desktop, centered — the app is phone-first; a narrow column keeps forms and lists readable even on a large monitor.
- Cards, not tables: category counts and item lists use rounded cards with soft shadows rather than dense tables — friendlier on mobile and gives thumbnails somewhere to live.
- Responsive breakpoints: single-column/stacked layout below ~640px (primary target, since capture happens on phones), expanding to multi-column grids (category cards, item list) on larger screens. 640px is deliberately Tailwind's default `sm` breakpoint (see `docs/ARCHITECTURE.md`'s "Styling & responsive strategy") — components are written mobile-first (unprefixed classes = the phone layout) with `sm:` overrides adding columns, not restructuring the page.

### Icons

- Outline style, 1.5px stroke (Lucide or Heroicons) — one consistent icon set across category badges, nav, and empty states. Category count cards use a per-category icon (optional `icon` field on `Category`) to make the dashboard scannable at a glance.

### Components

- **Buttons**: solid accent-fill for primary actions (Save, Add item, Register, Reset password), outline/ghost style for secondary (Cancel). One size scale.
- **Empty states**: every list (items, categories, a category with zero items) gets an icon + one line of text + the relevant "Add" action — no illustrations needed.
- **Warranty banner**: persistent but non-blocking — a top-of-dashboard strip with a chevron to expand the item list, never a modal.
- **Photo thumbnails**: 1:1 square crop in lists for a consistent grid; full aspect ratio preserved in the detail-view lightbox.
- **Primary action placement**: floating "+ Add item" button on mobile (bottom-anchored, since that's the most frequent action), standard button placement on desktop.

### Motion

- Light touch only: 150ms ease-out on hover/press states, a subtle 200ms fade+slide when the warranty banner expands. Motion should never get in the way of quickly logging an item.
