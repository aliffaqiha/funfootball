import { db } from "@/lib/db";
import type { GachaPool } from "@/lib/types";

export async function GET() {
  const countries = await db.country.findMany({
    where: { fifaRank: { not: null } },
    orderBy: { fifaRank: "asc" },
    select: { fifaRank: true, iso3: true, name: true, flag: true },
  });
  const clubs = await db.club.findMany({
    where: { isStarting11: true },
    orderBy: [{ country: { fifaRank: "asc" } }, { name: "asc" }],
    select: { id: true, name: true, color: true, flag: true, country: { select: { iso3: true } } },
  });

  const pool: GachaPool = {
    countries: countries.map((c) => ({
      rank: c.fifaRank as number,
      code: c.iso3 ?? "",
      name: c.name,
      flag: c.flag ?? "",
    })),
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