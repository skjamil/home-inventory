# Modules — Home Inventory Manager

Each module below owns a slice of the app: its pages/routes, its components, and its portion of the data model. The full Prisma schema is defined once at the end of this document as the canonical data model referenced by every module.

## Auth module

**Responsibility**: self-service registration, required email verification, login (blocked until verified), password reset, session handling, rate limiting on public auth endpoints.

- **Routes/pages**: `/register`, `/login`, `/verify-email`, `/forgot-password`, `/reset-password`, `/api/auth/[...nextauth]`, `/api/auth/register`, `/api/auth/verify-email`, `/api/auth/forgot-password`, `/api/auth/reset-password`.
- **Key components**: registration form, login form, forgot-password form, reset-password form.
- **Data**: `User` (email, passwordHash, `emailVerified`), `EmailVerificationToken`, `PasswordResetToken`, plus Auth.js-managed `Account`/`Session`/`VerificationToken` tables (via `@auth/prisma-adapter` — note Auth.js's own `VerificationToken` table backs its built-in email-provider flows, which this app doesn't use; our custom verification/reset tokens are separate models to avoid conflating the two).
- Registration also creates the user's five default `Category` rows in the same transaction (see Categories module below).

## Categories module

**Responsibility**: list, add, rename, and delete categories, so the user isn't limited to a fixed set.

- **Routes/pages**: `(protected)/categories`, `/api/categories`, `/api/categories/[id]`.
- **Key components**: category list/management UI.
- **Data**: `Category` (name, optional icon), unique per user. The five example categories (Electronics, Furniture, Tools, Kitchen, Storage) are created automatically for each user at registration time (in the same transaction as user creation), not via a one-time global seed script — every new account starts with the same defaults, and can rename/add/remove from there.

## Items module

**Responsibility**: item CRUD, filtering/browsing by category, item detail view.

- **Routes/pages**: `(protected)/items`, `.../items/new`, `.../items/[id]`, `.../items/[id]/edit`, `/api/items`, `/api/items/[id]`.
- **Key components**: `ItemForm` (shared create/edit), `ItemCard`, `ItemFilterBar`, `AmcContractsField` (repeatable AMC contract list, embedded in `ItemForm`).
- **Data**: `Item` (name, category, purchase date, price, warranty expiration, serial number, location, notes), plus its `AmcContract` history (see the AMC Contracts module below).

## AMC Contracts module

**Responsibility**: track a history of Annual Maintenance Contracts per item — a paid, renewable service contract with a vendor, distinct from the manufacturer's warranty (`Item.warrantyExpiration`). An item can have multiple contracts over time (renewals); each is added/edited/deleted independently from the Item Create/Edit form and shown on Item Detail.

- **Routes/pages**: no dedicated screens — managed inline from `(protected)/items/new`, `.../items/[id]`, `.../items/[id]/edit` via `/api/items/[id]/amc` and `/api/items/[id]/amc/[amcId]`.
- **Key components**: `AmcContractsField` (add/edit/delete-in-place list, the first repeatable child-record UI in the app).
- **Data**: `AmcContract` (provider, cost, start date, end date, one contract document), belongs to one `Item`. Deleting an `Item` cascades to delete its `AmcContract` rows (the corresponding Blob document is deleted alongside, via application logic — same pattern as `Attachment`).

## Attachments/Upload module

**Responsibility**: camera+gallery capture, uploading to Blob storage, and linking photos/receipt/warranty document to an item.

- **Routes/pages**: `/api/upload` (signed Blob token), `/api/items/[id]/attachments`, `/api/items/[id]/attachments/[attId]`.
- **Key components**: `FileCaptureInput` (camera/gallery input, shared with the AMC contract document field), `AttachmentUploader` (Blob upload orchestration), `AttachmentGallery` (thumbnail display).
- **Data**: `Attachment` (type: `PHOTO` | `RECEIPT` | `WARRANTY`, blob URL, file metadata), belongs to one `Item`. (An AMC contract's document is stored directly on `AmcContract`, not as an `Attachment` row — see the AMC Contracts module above.)

## Dashboard module

**Responsibility**: at-a-glance category counts and the combined warranty/AMC expiration banner.

- **Routes/pages**: `(protected)/dashboard`.
- **Key components**: `CategoryCountCard`, `ExpirationBanner` (shows both warranty and AMC contract expirations, e.g. "3 warranties + 2 AMCs expire this month").
- **Data**: reads aggregated counts from `Item`/`Category`; expiring warranties from `Item.warrantyExpiration` and expiring AMC contracts from `AmcContract.endDate`; reads `UserPreferences.warrantyNotificationsEnabled` and `UserPreferences.amcNotificationsEnabled` to decide whether each half of the banner shows.

## Settings module

**Responsibility**: toggle warranty and AMC expiration notifications on/off independently; account/password management; sign out (the only sign-out entry point in the app).

- **Routes/pages**: `(protected)/settings`, `/api/settings`.
- **Key components**: two notification toggle switches (warranty, AMC), password-change form, log out button (calls Auth.js's `signOut()`, see `docs/API.md`'s `/api/auth/[...nextauth]` entry).
- **Data**: `UserPreferences` (warrantyNotificationsEnabled, amcNotificationsEnabled).

## Data model (Prisma schema)

```prisma
model User {
  id                     String                  @id @default(cuid())
  email                  String                  @unique
  passwordHash           String
  name                   String?
  emailVerified          DateTime?
  createdAt              DateTime                @default(now())
  items                  Item[]
  categories             Category[]
  preferences            UserPreferences?
  sessions               Session[]
  accounts               Account[]
  emailVerificationTokens EmailVerificationToken[]
  passwordResetTokens    PasswordResetToken[]
  amcContracts           AmcContract[]
}

model EmailVerificationToken {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
}

model PasswordResetToken {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([userId])
}

model UserPreferences {
  id                            String  @id @default(cuid())
  userId                        String  @unique
  user                          User    @relation(fields: [userId], references: [id])
  warrantyNotificationsEnabled  Boolean @default(true)
  amcNotificationsEnabled       Boolean @default(true)
}

model Category {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  name      String
  icon      String?
  createdAt DateTime @default(now())
  items     Item[]

  @@unique([userId, name])
}

model Item {
  id                 String       @id @default(cuid())
  userId             String
  user               User         @relation(fields: [userId], references: [id])
  categoryId         String
  category           Category     @relation(fields: [categoryId], references: [id])
  name               String
  purchaseDate       DateTime?
  price              Decimal?     @db.Decimal(10, 2)
  warrantyExpiration DateTime?
  serialNumber       String?
  location           String?
  notes              String?
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt
  attachments        Attachment[]
  amcContracts       AmcContract[]

  @@index([userId, categoryId])
  @@index([userId, warrantyExpiration])
}

enum AttachmentType {
  PHOTO
  RECEIPT
  WARRANTY
}

model Attachment {
  id        String         @id @default(cuid())
  itemId    String
  item      Item           @relation(fields: [itemId], references: [id], onDelete: Cascade)
  type      AttachmentType
  blobUrl   String
  fileName  String
  mimeType  String
  sizeBytes Int
  createdAt DateTime       @default(now())

  @@index([itemId, type])
}

model AmcContract {
  id                String    @id @default(cuid())
  itemId            String
  item              Item      @relation(fields: [itemId], references: [id], onDelete: Cascade)
  userId            String
  user              User      @relation(fields: [userId], references: [id])
  provider          String
  cost              Decimal?  @db.Decimal(10, 2)
  startDate         DateTime?
  endDate           DateTime?
  documentBlobUrl   String?
  documentFileName  String?
  documentMimeType  String?
  documentSizeBytes Int?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([itemId])
  @@index([userId, endDate])
}
```

Auth.js's required `Account`, `Session`, and `VerificationToken` models (from `@auth/prisma-adapter`) are appended to this schema as-is when the project is scaffolded.

### Notes on the model
- `Attachment` is a single polymorphic table for all three attachment kinds (item photos, the receipt, the warranty document) — an item can have many, distinguished by `type`. This avoids three near-duplicate tables.
- `Item.warrantyExpiration` is indexed together with `userId` specifically to make the dashboard's "expiring this month" query efficient.
- Deleting an `Item` cascades to delete its `Attachment` rows (the corresponding Blob objects are deleted alongside, via application logic in the Attachments module).
- `AmcContract` holds its own document fields (`documentBlobUrl`/`documentFileName`/`documentMimeType`/`documentSizeBytes`) rather than reusing `Attachment`, since `Attachment` only has a foreign key to `Item` — one contract has exactly one document, so it doesn't need a separate child table. `userId` is denormalized onto `AmcContract` (set server-side from the parent item, never client-supplied) purely so the "AMC contracts expiring this month" dashboard query can use `@@index([userId, endDate])` directly, mirroring `Item`'s own `@@index([userId, warrantyExpiration])` — ownership checks still always join through `item: { userId }`, the same as `Attachment`, so the denormalized column is never the source of truth for authorization. Deleting an `Item` cascades to delete its `AmcContract` rows (its Blob document, if any, is deleted alongside via application logic, same as `Attachment`).
- `User.emailVerified` is `null` until the user clicks their verification link; the Credentials login flow rejects sign-in while it's `null`.
- `EmailVerificationToken` and `PasswordResetToken` rows are single-use and time-limited (`expiresAt`); a token is deleted or marked consumed (`usedAt`) once used, and a stale/expired token is simply rejected rather than reused.
