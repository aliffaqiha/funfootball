-- AlterTable
ALTER TABLE "Country" ADD COLUMN "iso3" TEXT,
ADD COLUMN "fifaRank" INTEGER,
ADD COLUMN "flag" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Country_iso3_key" ON "Country"("iso3");

-- AlterTable
ALTER TABLE "Club" ADD COLUMN "isStarting11" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "flag" TEXT;