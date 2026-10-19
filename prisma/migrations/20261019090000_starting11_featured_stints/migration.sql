-- Preserve the builder's reputation decision on historical Stint rows so the API
-- does not depend on whether the corresponding Player row was imported.
ALTER TABLE "Stint"
ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Stint_clubId_isFeatured_fromYear_toYear_idx"
ON "Stint"("clubId", "isFeatured", "fromYear", "toYear");

-- Keep currently classifiable candidates available until the CSV-backed
-- builder performs a complete refresh after this migration is deployed.
UPDATE "Stint" AS stint
SET "isFeatured" = true
WHERE stint."transfermarktId" IN (28003, 8198, 342229, 68290, 27992, 225083, 148455, 88755, 25557, 38253, 418560, 132098, 39381, 200512, 59016, 122153, 3455, 29241, 60889)
   OR EXISTS (
     SELECT 1
     FROM "Player" AS player
     WHERE player."transfermarktId" = stint."transfermarktId"
       AND (
         player."internationalCaps" >= 10
         OR player."highestMarketValue" >= 10000000
       )
   );
