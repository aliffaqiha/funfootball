import { getDb } from "@/lib/db";
import staticPool from "@/data/starting11-pool.json";
import { starting11FeaturedPlayerFilter } from "@/lib/starting11-featured";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const ROLES = [
  { role: "GK", pos: "Goalkeeper", label: "Kiper" },
  { role: "DEF", pos: "Defender", label: "Bek" },
  { role: "MID", pos: "Midfield", label: "Gelandang" },
  { role: "FWD", pos: "Attack", label: "Penyerang" },
] as const;

export interface PickNominee {
  role: "GK" | "DEF" | "MID" | "FWD";
  label: string;
  name: string;
  from: "exact" | "club";
}

async function pickOne(
  db: ReturnType<typeof getDb>,
  pos: string,
  clubId: string,
  year: number | null
): Promise<{ name: string; from: PickNominee["from"] } | null> {
  if (year) {
    const rows = await db.stint.groupBy({
      by: ["name"],
      where: {
        clubId,
        isFeatured: true,
        position: pos,
        fromYear: { lte: year },
        toYear: { gte: year },
        name: { notIn: ["", "Unknown Player"] },
      },
    });
    if (rows.length > 0) {
      return { name: rows[Math.floor(Math.random() * rows.length)].name, from: "exact" };
    }
    return null;
  }

  const where = {
    clubId,
    position: pos,
    name: { notIn: ["", "Unknown Player"] },
    AND: [starting11FeaturedPlayerFilter()],
  };
  const rows = await db.player.findMany({
    where,
    distinct: ["name"],
    select: { name: true },
  });
  const row = rows[Math.floor(Math.random() * rows.length)];
  return row ? { name: row.name, from: "club" } : null;
}

export async function GET(request: Request) {
  const rate = rateLimit(request, "starting11-pick", 30, 60_000);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfter);
  const db = getDb();
  const url = new URL(request.url);
  const clubParam = url.searchParams.get("club");
  const yearParam = url.searchParams.get("year");
  const year = yearParam ? Number(yearParam) : null;
  const supportedYears: number[] = staticPool.years;
  const yearValid = year !== null && Number.isInteger(year) && supportedYears.includes(year);

  if (!clubParam) {
    return Response.json({ error: "Parameter club wajib diisi" }, { status: 400 });
  }
  if (yearParam !== null && !yearValid) {
    return Response.json({ error: "Tahun tidak tersedia" }, { status: 400 });
  }

  const club = await db.club.findFirst({
    where: { isStarting11: true, OR: [{ id: clubParam }, { key: clubParam }] },
    select: {
      id: true,
      name: true,
      flag: true,
      key: true,
    },
  });

  if (!club) {
    return Response.json({ error: "Klub tidak ditemukan" }, { status: 404 });
  }

  const nominees = await Promise.all(ROLES.map(async (r): Promise<PickNominee> => {
    const picked = await pickOne(db, r.pos, club.id, yearValid ? year : null);
    return {
      role: r.role,
      label: r.label,
      name: picked?.name ?? "",
      from: picked?.from ?? (yearValid ? "exact" : "club"),
    };
  }));

  return Response.json({
    club: {
      id: club.id,
      name: club.name,
      flag: club.flag,
      key: club.key,
    },
    year: yearValid ? year : null,
    nominees,
  });
}
