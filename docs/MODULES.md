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
- **Key components**: `ItemForm` (shared create/edit), `ItemCard`, `ItemFilterBar`.
- **Data**: `Item` (name, category, purchase date, price, warranty expiration, serial number, location, notes).

## Attachments/Upload module

**Responsibility**: camera+gallery capture, uploading to Blob storage, and linking photos/receipt/warranty document to an item.

- **Routes/pages**: `/api/upload` (signed Blob token), `/api/items/[id]/attachments`, `/api/items/[id]/attachments/[attId]`.
- **Key components**: `FileCaptureInput` (camera/gallery input), `AttachmentUploader` (Blob upload orchestration), `AttachmentGallery` (thumbnail display).
- **Data**: `Attachment` (type: `PHOTO` | `RECEIPT` | `WARRANTY`, blob URL, file metadata), belongs to one `Item`.

## Dashboard module

**Responsibility**: at-a-glance category counts and the warranty-expiration banner.

- **Routes/pages**: `(protected)/dashboard`.
- **Key components**: `CategoryCountCard`, `WarrantyBanner`.
- **Data**: reads aggregated counts from `Item`/`Category`, and expiring items from `Item.warrantyExpiration`; reads `UserPreferences.warrantyNotificationsEnabled` to decide whether to show the banner.

## Settings module

**Responsibility**: toggle warranty notifications on/off; account/password management.

- **Routes/pages**: `(protected)/settings`, `/api/settings`.
- **Key components**: notification toggle switch, password-change form.
- **Data**: `UserPreferences` (warrantyNotificationsEnabled).

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
```

Auth.js's required `Account`, `Session`, and `VerificationToken` models (from `@auth/prisma-adapter`) are appended to this schema as-is when the project is scaffolded.

### Notes on the model
- `Attachment` is a single polymorphic table for all three attachment kinds (item photos, the receipt, the warranty document) — an item can have many, distinguished by `type`. This avoids three near-duplicate tables.
- `Item.warrantyExpiration` is indexed together with `userId` specifically to make the dashboard's "expiring this month" query efficient.
- Deleting an `Item` cascades to delete its `Attachment` rows (the corresponding Blob objects are deleted alongside, via application logic in the Attachments module).
- `User.emailVerified` is `null` until the user clicks their verification link; the Credentials login flow rejects sign-in while it's `null`.
- `EmailVerificationToken` and `PasswordResetToken` rows are single-use and time-limited (`expiresAt`); a token is deleted or marked consumed (`usedAt`) once used, and a stale/expired token is simply rejected rather than reused.
