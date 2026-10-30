import { getDb } from "@/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

interface TransferRow {
  club: string;
  year: number;
}

interface QuizPlayer {
  id: string;
  firstName: string;
  lastName: string;
  nationality: string | null;
  position: string | null;
  weight: number;
  transfers: TransferRow[];
  totalClubs: number;
}

interface PlayerTransfer {
  season: string | null;
  fromClub: string;
  toClub: string;
  createdAt: Date;
}

const YOUTHISH = /(youth|yth|academy|acad|jgd|junior|reserve|res|amateur|amateur|u\d{1,2}|iii?|B|II)\b\.?/i;
const VOIDISH = /^(no club|without club|retired|unknown|-|\s*)$/i;

function seniorClub(name: string | null): string | null {
  if (!name) return null;
  const n = name.trim();
  if (!n) return null;
  if (VOIDISH.test(n)) return null;
  if (YOUTHISH.test(n)) return null;
  return n;
}

function seasonYear(season: string | null): number | null {
  if (!season) return null;
  const normalized = season.trim();
  const fullYear = /^(\d{4})(?:\/\d{2,4})?$/.exec(normalized);
  if (fullYear) return Number(fullYear[1]);
  const shortYear = /^(\d{2})\//.exec(normalized);
  if (!shortYear) return null;
  const year = Number(shortYear[1]);
  return year >= 70 ? 1900 + year : 2000 + year;
}

function cleanPath(transfers: PlayerTransfer[]): TransferRow[] {
  const rows = transfers
    .map((transfer, index) => ({
      year: seasonYear(transfer.season) ?? 0,
      from: seniorClub(transfer.fromClub),
      to: seniorClub(transfer.toClub),
      createdAt: transfer.createdAt.getTime(),
      index,
    }))
    .filter((r): r is { year: number; from: string; to: string; createdAt: number; index: number } => r.year > 0 && r.from !== null && r.to !== null)
    .sort((a, b) => a.year - b.year || a.createdAt - b.createdAt || a.index - b.index);

  const path: TransferRow[] = [];
  for (const r of rows) {
    const currentClub = path[path.length - 1]?.club.toLowerCase();
    if (currentClub !== r.from.toLowerCase()) path.push({ year: r.year, club: r.from });
    if (path[path.length - 1]?.club.toLowerCase() !== r.to.toLowerCase()) {
      path.push({ year: r.year, club: r.to });
    }
  }
  return path;
}

const POS_MAP: Record<string, string> = {
  Attack: "Forward",
  Midfield: "Midfielder",
  Defender: "Defender",
  Goalkeeper: "Goalkeeper",
};

const globalForPool = globalThis as unknown as { __transferQuizPool?: Promise<QuizPlayer[]> };

async function loadPool(): Promise<QuizPlayer[]> {
  const db = getDb();

  const players = await db.player.findMany({
    where: {
      name: { notIn: ["", "Unknown Player"] },
      transfers: { some: {} },
      OR: [{ highestMarketValue: { gte: 25_000_000 } }, { internationalCaps: { gte: 60 } }],
    },
    select: {
      id: true,
      name: true,
      nationality: true,
      position: true,
      highestMarketValue: true,
      transfers: {
        select: { season: true, fromClub: true, toClub: true, createdAt: true },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
    },
  });

  const pool: QuizPlayer[] = [];
  for (const p of players) {
    const path = cleanPath(p.transfers);
    if (path.length < 3) continue;
    const [firstName, ...rest] = p.name.split(" ");
    pool.push({
      id: p.id,
      firstName,
      lastName: rest.join(" "),
      nationality: p.nationality,
      position: p.position ? (POS_MAP[p.position] ?? p.position) : null,
      weight: Math.pow(p.highestMarketValue ?? 0, 0.3),
      transfers: path.slice(0, 9),
      totalClubs: path.length,
    });
  }

  return pool;
}

function buildPool(): Promise<QuizPlayer[]> {
  let poolPromise = globalForPool.__transferQuizPool;
  if (!poolPromise) {
    poolPromise = loadPool().catch((error) => {
      globalForPool.__transferQuizPool = undefined;
      throw error;
    });
    globalForPool.__transferQuizPool = poolPromise;
  }
  return poolPromise;
}

function pickWeighted(candidates: QuizPlayer[]): QuizPlayer | null {
  if (candidates.length === 0) return null;
  const weightedCandidates = candidates.filter((candidate) => candidate.weight > 0);
  if (weightedCandidates.length === 0) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
  const total = weightedCandidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  let r = Math.random() * total;
  for (const c of weightedCandidates) {
    r -= c.weight;
    if (r <= 0) return c;
  }
  return weightedCandidates[weightedCandidates.length - 1];
}

export async function GET(req: Request) {
  const rate = rateLimit(req, "transfer-quiz", 30, 60_000);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfter);
  const url = new URL(req.url);
  const exclude = new Set(url.searchParams.get("exclude")?.split(",").filter(Boolean).slice(0, 100) ?? []);

  const pool = await buildPool();
  let candidates = exclude.size > 0 ? pool.filter((p) => !exclude.has(p.id)) : pool;
  if (candidates.length === 0) candidates = pool;

  const pick = pickWeighted(candidates);
  if (!pick) {
    return Response.json({ error: "Belum ada pemain yang memenuhi kriteria Transfer Quiz." }, { status: 503 });
  }
  return Response.json({
    id: pick.id,
    firstName: pick.firstName,
    lastName: pick.lastName,
    nationality: pick.nationality,
    position: pick.position,
    transfers: pick.transfers,
    totalClubs: pick.totalClubs,
  });
}
