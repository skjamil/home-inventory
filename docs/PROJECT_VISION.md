# Project Vision — Home Inventory Manager

## Problem statement

Most households have no reliable record of what they own, what it cost, or when its warranty runs out. When an appliance breaks, a receipt is needed for an insurance claim, or a warranty could still cover a repair, that information is usually scattered across paper receipts, email inboxes, and memory — if it exists at all. Home Inventory Manager gives anyone a lightweight, camera-first way to catalog possessions and get a timely nudge before warranty coverage lapses.

## Target user

Any individual user who creates their own account and wants to:
- Keep a running record of what they own, organized by category, kept completely private to them.
- Attach photos, receipts, and warranty documents to each item at the moment of purchase (or whenever they get around to it), using their phone camera.
- Get a simple heads-up when warranties are about to expire, especially on higher-value items like electronics and appliances.

The app is open to anyone to sign up (self-service registration), but each account's inventory is private and isolated — there is no sharing of items or categories between accounts (see non-goals).

## Goals for v1

"Done" for v1 means a user can, from their phone or a browser:
1. Register their own account with email and password, verify their email, and log in to their own private inventory.
2. Reset their password via email if they forget it.
3. Create, view, edit, and delete items, each with: name, category, purchase date, price, warranty expiration, serial number, location, photos, a receipt, and a warranty document.
4. Capture receipt/warranty photos directly from the camera, or pick existing files from their gallery/filesystem — same control, either source.
5. See a dashboard with counts per category (e.g. Electronics 12, Furniture 8, Tools 17, Kitchen 34, Storage 9) and a banner such as "3 warranties expire this month" when applicable.
6. Turn the warranty-expiration banner on or off in Settings.
7. Add, rename, or remove their own categories rather than being limited to a fixed list.

## Core feature list

- **Authentication**: self-service registration (email + password), required email verification before first login, email-based password reset, and rate limiting on these public endpoints to deter abuse.
- **Item management**: full CRUD with the complete field set above.
- **Category management**: user-editable categories, seeded with Electronics, Furniture, Tools, Kitchen, and Storage as starting examples.
- **Capture & attachments**: camera capture or gallery/file picker for photos, receipt, and warranty document, stored per item.
- **Dashboard**: category counts at a glance, plus an in-app warranty-expiration banner.
- **Notification preference**: enable/disable the warranty-expiration banner from Settings.
- **Receipt scan auto-fill**: capturing a receipt photo runs free, client-side OCR (Tesseract.js) to best-effort pre-fill Name, Price, and Purchase date on the Item Create/Edit form — never overwrites a field the user already typed, and always surfaces a "please review" notice since the extraction is heuristic, not authoritative.

## Illustrative scenarios (from the original request)

- Category breakdown shown on the dashboard:
  | Category | Count |
  |---|---|
  | Electronics | 12 |
  | Furniture | 8 |
  | Tools | 17 |
  | Kitchen | 34 |
  | Storage | 9 |
- Per-item record: Purchase date, Price, Warranty expiration, Receipt, Serial number, Location, Photos.
- Dashboard notification: "3 warranties expire this month" — most valuable for tracking coverage on expensive electronics and appliances before it lapses unnoticed.

## Non-goals for v1

To keep scope bounded, the following are explicitly **out of scope** for v1:
- Multi-user accounts or household sharing/permissions.
- Email or push notifications (v1 is in-app only).
- A native mobile app (a mobile browser is sufficient; camera capture works via the web).
- Barcode scanning.
- Public self-service signup (the single account is seeded, not registered).
- Data export/import, reporting, or insurance-integration features.

These may be reconsidered in a future version, but are intentionally deferred so v1 stays focused and shippable.
