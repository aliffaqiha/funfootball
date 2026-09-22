-- AlterTable
ALTER TABLE "Transfer" ADD COLUMN "transferKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_playerId_transferKey_key" ON "Transfer"("playerId", "transferKey");