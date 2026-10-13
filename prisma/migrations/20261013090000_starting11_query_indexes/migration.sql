-- Indexes used by Starting 11 pool and nominee queries.
CREATE INDEX "Club_countryId_idx" ON "Club"("countryId");
CREATE INDEX "Club_isStarting11_idx" ON "Club"("isStarting11");
CREATE INDEX "Player_clubId_idx" ON "Player"("clubId");
CREATE INDEX "Player_countryId_idx" ON "Player"("countryId");
