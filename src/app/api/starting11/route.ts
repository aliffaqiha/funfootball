import { db } from "@/lib/db";
import type { GachaPool } from "@/lib/types";

const ROLES = ["Goalkeeper", "Defender", "Midfield", "Attack"];

export async function GET() {
  const clubs = await db.club.findMany({
    where: { isStarting11: true },
    orderBy: [{ country: { fifaRank: "asc" } }, { name: "asc" }],
    select: { id: true, name: true, color: true, flag: true, country: { select: { iso3: true } } },
  });

  const stints = await db.stint.findMany({
    where: { clubId: { in: clubs.map((c) => c.id) } },
    select: { clubId: true, position: true, fromYear: true, toYear: true },
  });

  const byClub = new Map<string, typeof stints>();
  for (const s of stints) {
    const list = byClub.get(s.clubId) ?? [];
    list.push(s);
    byClub.set(s.clubId, list);
  }

  const yearsByClub: Record<string, number[]> = {};
  const yearSet = new Set<number>();
  for (const club of clubs) {
    const list = byClub.get(club.id) ?? [];
    const years: number[] = [];
    for (let y = 2012; y <= 2025; y++) {
      const ok = ROLES.every((pos) =>
        list.some((s) => s.position === pos && s.fromYear <= y && s.toYear >= y)
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