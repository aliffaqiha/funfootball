-- CreateTable
CREATE TABLE "Stint" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "transfermarktId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT,
    "fromYear" INTEGER NOT NULL,
    "toYear" INTEGER NOT NULL,

    CONSTRAINT "Stint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Stint_clubId_fromYear_toYear_idx" ON "Stint"("clubId", "fromYear", "toYear");

-- CreateIndex
CREATE INDEX "Stint_clubId_position_fromYear_idx" ON "Stint"("clubId", "position", "fromYear");

-- AddForeignKey
ALTER TABLE "Stint" ADD CONSTRAINT "Stint_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
