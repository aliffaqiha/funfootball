-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "countryId" TEXT,
ADD COLUMN     "domesticCompetitionId" TEXT;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;
