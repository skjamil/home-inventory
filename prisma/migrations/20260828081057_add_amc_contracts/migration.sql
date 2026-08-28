-- AlterTable
ALTER TABLE "UserPreferences" ADD COLUMN     "amcNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "AmcContract" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "cost" DECIMAL(10,2),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "documentBlobUrl" TEXT,
    "documentFileName" TEXT,
    "documentMimeType" TEXT,
    "documentSizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmcContract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AmcContract_itemId_idx" ON "AmcContract"("itemId");

-- CreateIndex
CREATE INDEX "AmcContract_userId_endDate_idx" ON "AmcContract"("userId", "endDate");

-- AddForeignKey
ALTER TABLE "AmcContract" ADD CONSTRAINT "AmcContract_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmcContract" ADD CONSTRAINT "AmcContract_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
