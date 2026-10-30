import { getDb } from "@/lib/db";
import type { GachaPool } from "@/lib/types";
import staticPool from "@/data/starting11-pool.json";

const ROLES = ["Goalkeeper", "Defender", "Midfield", "Attack"];
const YEARS = staticPool.years;
const FIRST_YEAR = Math.min(...YEARS);
const LAST_YEAR = Math.max(...YEARS);

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
      isFeatured: true,
      fromYear: { lte: LAST_YEAR },
      toYear: { gte: FIRST_YEAR },
    },
    select: { clubId: true, position: true, fromYear: true, toYear: true },
  });

  const byClub = new Map<string, Map<string, typeof stints>>();
  for (const s of stints) {
    if (!s.position) continue;
    const positions = byClub.get(s.clubId) ?? new Map<string, typeof stints>();
    const list = positions.get(s.position) ?? [];
    list.push(s);
    positions.set(s.position, list);
    byClub.set(s.clubId, positions);
  }

  const yearsByClub: Record<string, number[]> = {};
  const yearSet = new Set<number>();
  for (const club of clubs) {
    const positions = byClub.get(club.id) ?? new Map<string, typeof stints>();
    const years: number[] = [];
    for (const y of YEARS) {
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

  return Response.json(pool, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
