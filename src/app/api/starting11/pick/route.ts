import { db } from "@/lib/db";

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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function pickOne(
  role: "GK" | "DEF" | "MID" | "FWD",
  pos: string,
  clubId: string,
  year: number | null
): Promise<{ name: string; from: PickNominee["from"] } | null> {
  if (year) {
    const rows = await db.stint.findMany({
      where: {
        clubId,
        position: pos,
        fromYear: { lte: year },
        toYear: { gte: year },
        name: { notIn: ["", "Unknown Player"] },
      },
      select: { name: true },
      distinct: ["name"],
      take: 60,
    });
    if (rows.length > 0) {
      return { name: shuffle(rows)[0].name, from: "exact" };
    }
    return null;
  }

  const rows = await db.player.findMany({
    where: { clubId, position: pos, name: { not: "Unknown Player" } },
    select: { name: true },
    take: 60,
  });
  if (rows.length > 0) {
    return { name: shuffle(rows)[0].name, from: "club" };
  }
  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clubParam = url.searchParams.get("club");
  const yearParam = url.searchParams.get("year");
  const year = yearParam ? Number(yearParam) : null;
  const yearValid = year !== null && Number.isFinite(year);

  if (!clubParam) {
    return Response.json({ error: "Parameter club wajib diisi" }, { status: 400 });
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

  const nominees: PickNominee[] = [];
  for (const r of ROLES) {
    const picked = await pickOne(r.role, r.pos, club.id, yearValid ? year : null);
    nominees.push({
      role: r.role,
      label: r.label,
      name: picked?.name ?? "",
      from: picked?.from ?? (yearValid ? "exact" : "club"),
    });
  }

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
