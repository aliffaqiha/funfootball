import { getDb } from "@/lib/db";
import type { GachaPool } from "@/lib/types";

const ROLES = ["Goalkeeper", "Defender", "Midfield", "Attack"];
const FIRST_YEAR = 2012;

export async function GET() {
  const db = getDb();
  const clubs = await db.club.findMany({
    where: { isStarting11: true },
    orderBy: [{ country: { fifaRank: "asc" } }, { name: "asc" }],
    select: { id: true, name: true, color: true, flag: true, country: { select: { iso3: true } } },
  });

  const stints = await db.stint.findMany({
    where: {
      clubId: { in: clubs.map((c) => c.id) },
      fromYear: { lte: new Date().getFullYear() },
      toYear: { gte: FIRST_YEAR },
    },
    select: { clubId: true, position: true, fromYear: true, toYear: true },
  });

  const byClub = new Map<string, Map<string, typeof stints>>();
  for (const s of stints) {
    const positions = byClub.get(s.clubId) ?? new Map<string, typeof stints>();
    const list = positions.get(s.position) ?? [];
    list.push(s);
    positions.set(s.position, list);
    byClub.set(s.clubId, positions);
  }

  const yearsByClub: Record<string, number[]> = {};
  const yearSet = new Set<number>();
  const lastYear = new Date().getFullYear();
  for (const club of clubs) {
    const positions = byClub.get(club.id) ?? new Map();
    const years: number[] = [];
    for (let y = FIRST_YEAR; y <= lastYear; y++) {
      const ok = ROLES.every((pos) =>
        (positions.get(pos) ?? []).some((s) => s.fromYear <= y && s.toYear >= y)
      );
      if (ok) {
        years.push(y);
        yearSet.add(y);
      }
    }
    yearsByClub[club.id] = years;
  }

  const pool: GachaPool = {
    years: [...yearSet].sort((a, b) => a - b),
    yearsByClub,
    clubs: clubs.map((c) => ({
      id: c.id,
      name: c.name,
      country: c.country?.iso3 ?? "",
      color: c.color,
      flag: c.flag ?? "",
    })),
  };

  return Response.json(pool);
}
