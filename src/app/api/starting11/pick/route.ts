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
  from: "exact" | "club" | "country" | "any";
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
  countryId: string | null
): Promise<{ name: string; from: PickNominee["from"] } | null> {
  const baseWhere = { position: pos, name: { not: "Unknown Player" } };

  const pools: Array<{ where: Record<string, unknown>; from: PickNominee["from"] }> = [
    ...(countryId ? [{ where: { ...baseWhere, clubId, countryId }, from: "exact" as const }] : []),
    { where: { ...baseWhere, clubId }, from: "club" },
    ...(countryId
      ? [{ where: { ...baseWhere, countryId, club: { isStarting11: true } }, from: "country" as const }]
      : []),
    { where: { ...baseWhere }, from: "any" },
  ];

  for (const p of pools) {
    const rows = await db.player.findMany({
      where: p.where,
      select: { name: true },
      take: 60,
    });
    if (rows.length > 0) {
      const chosen = shuffle(rows)[0];
      return { name: chosen.name, from: p.from };
    }
  }
  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clubParam = url.searchParams.get("club");
  const countryParam = url.searchParams.get("country");

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
      countryId: true,
      country: { select: { iso3: true, name: true, flag: true } },
    },
  });

  if (!club) {
    return Response.json({ error: "Klub tidak ditemukan" }, { status: 404 });
  }

  const country = countryParam
    ? await db.country.findFirst({ where: { iso3: countryParam } })
    : null;
  const countryId = country?.id ?? club.countryId;

  const nominees: PickNominee[] = [];
  for (const r of ROLES) {
    const picked = await pickOne(r.role, r.pos, club.id, countryId);
    nominees.push({
      role: r.role,
      label: r.label,
      name: picked?.name ?? "",
      from: picked?.from ?? "any",
    });
  }

  return Response.json({
    club: {
      id: club.id,
      name: club.name,
      flag: club.flag,
      key: club.key,
    },
    country: country
      ? { code: country.iso3, name: country.name, flag: country.flag }
      : club.country
      ? { code: club.country.iso3, name: club.country.name, flag: club.country.flag }
      : null,
    nominees,
  });
}