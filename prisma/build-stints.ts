import 'dotenv/config'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'csv-parse/sync'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import pool from '../src/data/starting11-pool.json'
import { isStarting11FeaturedPlayer } from '../src/lib/starting11-featured'

const CONNECTION_STRING = process.env.DATABASE_URL
if (!CONNECTION_STRING) {
  console.error('DATABASE_URL tidak ditemukan.')
  process.exit(1)
}

const PLAYERS_CSV = join(process.cwd(), 'data', 'players.csv')
const TRANSFERS_CSV = join(process.cwd(), 'data', 'transfers.csv')
const BATCH = 500
const MIN_YEAR = Math.min(...pool.years)
const MAX_YEAR = Math.max(...pool.years)
type Row = Record<string, string | undefined>

// TM club id -> pool club key (verified vs players.current_club_id / transfers club ids)
const TM_ID_TO_KEY: Record<number, string> = {
  11: 'ars', 405: 'avl', 13: 'atm', 131: 'bar', 27: 'bay', 16: 'bvb',
  631: 'che', 506: 'juv', 31: 'liv', 281: 'mci', 985: 'mun', 46: 'int',
  5: 'mil', 583: 'psg', 418: 'rma', 368: 'sev', 148: 'tot', 6195: 'nap',
  409: 'rsb', 141: 'gal', 610: 'aja', 294: 'ben', 720: 'fcp', 12: 'rom',
  244: 'om', 162: 'asm', 15: 'b04', 23826: 'rbl', 762: 'new', 36: 'fen',
  614: 'fla', 209: 'riv',
}

function readCsv(file: string): Row[] {
  if (!existsSync(file)) return []
  return parse(readFileSync(file), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
  }) as Row[]
}

function toNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  const n = Number(String(value).replace(/[^0-9.eE+-]+/g, ''))
  return Number.isFinite(n) ? n : null
}

function seasonStart(season: string | undefined): number | null {
  if (!season) return null
  const m = /^(\d{2})\/(\d{2})$/.exec(season.trim())
  if (!m) return null
  const yy = Number(m[1])
  return yy >= 90 ? 1900 + yy : 2000 + yy
}

function dateYear(d: string | undefined): number | null {
  if (!d) return null
  const y = Number(String(d).slice(0, 4))
  return Number.isFinite(y) && y > 1900 && y < 2100 ? y : null
}

interface Interval { from: number; to: number }

function merge(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return []
  const sorted = [...intervals].sort((a, b) => a.from - b.from)
  const out: Interval[] = [sorted[0]]
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1]
    if (sorted[i].from <= last.to + 1) {
      last.to = Math.max(last.to, sorted[i].to)
    } else {
      out.push(sorted[i])
    }
  }
  return out
}

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: CONNECTION_STRING }) })
  const playerRows = readCsv(PLAYERS_CSV)
  const transferRows = readCsv(TRANSFERS_CSV)
  if (playerRows.length === 0) {
    console.error('players.csv kosong')
    process.exit(1)
  }

  try {
    const clubs = await prisma.club.findMany({ where: { isStarting11: true }, select: { id: true, key: true } })
    const clubIdByKey = new Map(clubs.map((c) => [c.key, c.id]))

    const poolByTmId = new Map<number, { key: string; name: string; position: string | null; lastSeason: number | null; currentClubId: number | null }>()
    let excludedPlayers = 0
    for (const r of playerRows) {
      const tmId = toNumber(r.player_id)
      if (tmId === null) continue
      if (!isStarting11FeaturedPlayer({
        transfermarktId: tmId,
        internationalCaps: toNumber(r.international_caps),
        highestMarketValue: toNumber(r.highest_market_value_in_eur),
      })) {
        excludedPlayers++
        continue
      }
      poolByTmId.set(tmId, {
        key: TM_ID_TO_KEY[tmId] ?? '',
        name: r.name ?? 'Unknown Player',
        position: r.position || null,
        lastSeason: toNumber(r.last_season),
        currentClubId: toNumber(r.current_club_id),
      })
    }

    const transfersByPlayer = new Map<number, Array<{ seasonStart: number | null; dateYear: number | null; fromId: number | null; toId: number | null }>>()
    for (const t of transferRows) {
      const pid = toNumber(t.player_id)
      if (pid === null) continue
      const list = transfersByPlayer.get(pid) ?? []
      const parsedSeason = seasonStart(t.transfer_season)
      const parsedDateYear = dateYear(t.transfer_date)
      // Ignore future/malformed feed rows outside the static game timeline.
      if (parsedSeason !== null && parsedSeason > MAX_YEAR) continue
      if (parsedDateYear !== null && parsedDateYear > MAX_YEAR + 1) continue
      list.push({
        seasonStart: parsedSeason,
        dateYear: parsedDateYear,
        fromId: toNumber(t.from_club_id),
        toId: toNumber(t.to_club_id),
      })
      transfersByPlayer.set(pid, list)
    }

    const stints: Array<{ clubId: string; transfermarktId: number; name: string; position: string | null; isFeatured: boolean; fromYear: number; toYear: number }> = []

    for (const [tmId, player] of poolByTmId) {
      const playerTransfers = transfersByPlayer.get(tmId) ?? []
      playerTransfers.sort((a, b) => {
        const sa = a.seasonStart ?? a.dateYear ?? 0
        const sb = b.seasonStart ?? b.dateYear ?? 0
        if (sa !== sb) return sa - sb
        return (a.dateYear ?? 0) - (b.dateYear ?? 0)
      })

      const intervals: Array<{ clubTmId: number | null; from: number; to: number }> = []
      if (playerTransfers.length === 0) {
        if (player.currentClubId !== null && player.lastSeason !== null) {
          const key = TM_ID_TO_KEY[player.currentClubId]
          if (key) {
            intervals.push({ clubTmId: player.currentClubId, from: player.lastSeason, to: player.lastSeason })
          }
        }
      } else {
        const first = playerTransfers[0]
        if (first.fromId !== null) {
          const joinYear = first.seasonStart ?? first.dateYear
          if (joinYear !== null) {
            intervals.push({ clubTmId: first.fromId, from: joinYear - 1, to: joinYear - 1 })
          }
        }
        for (let i = 0; i < playerTransfers.length; i++) {
          const t = playerTransfers[i]
          const next = playerTransfers[i + 1]
          const startSeason = t.seasonStart
          const startYear = startSeason ?? t.dateYear
          if (startYear === null || t.toId === null) continue

          let endYear: number
          if (next) {
            const nextSeason = next.seasonStart ?? next.dateYear
            // The next club owns its transfer season; the old club ends before it.
            endYear = nextSeason !== null ? nextSeason - 1 : startYear
          } else {
            if (t.toId === player.currentClubId && player.lastSeason !== null) {
              endYear = player.lastSeason
            } else {
              endYear = startYear
            }
          }
          if (endYear < startYear) continue
          intervals.push({ clubTmId: t.toId, from: startYear, to: endYear })
        }
      }

      const byClub = new Map<number, Interval[]>()
      for (const iv of intervals) {
        if (iv.clubTmId === null) continue
        const list = byClub.get(iv.clubTmId) ?? []
        list.push({ from: iv.from, to: iv.to })
        byClub.set(iv.clubTmId, list)
      }

      for (const [clubTmId, list] of byClub) {
        const key = TM_ID_TO_KEY[clubTmId]
        if (!key) continue
        const clubId = clubIdByKey.get(key)
        if (!clubId) continue
        for (const iv of merge(list)) {
          const fromYear = Math.max(iv.from, MIN_YEAR)
          const toYear = Math.min(iv.to, MAX_YEAR)
          if (toYear < fromYear) continue
          stints.push({
            clubId,
            transfermarktId: tmId,
            name: player.name,
            position: player.position,
            isFeatured: true,
            fromYear,
            toYear,
          })
        }
      }
    }

    if (stints.length === 0) {
      throw new Error('Tidak ada stint featured yang terbentuk; data lama dipertahankan.')
    }

    let written = 0
    await prisma.$transaction(async (tx) => {
      await tx.stint.deleteMany({})
      for (let i = 0; i < stints.length; i += BATCH) {
        const chunk = stints.slice(i, i + BATCH)
        await tx.stint.createMany({ data: chunk })
        written += chunk.length
        if (written % 10000 < BATCH) console.log(`[stints] ${written}/${stints.length}`)
      }
    }, { maxWait: 10_000, timeout: 300_000 })
    console.log(`[stints] selesai: ${written} baris.`)
    console.log(`[stints] pemain featured: ${poolByTmId.size}; dikecualikan dari kandidat: ${excludedPlayers}`)

    // coverage report
    const years = pool.years
    const positions = ['Goalkeeper', 'Defender', 'Midfield', 'Attack']
    const allStints = await prisma.stint.findMany({
      where: { clubId: { in: clubs.map((c) => c.id) }, isFeatured: true },
      select: { clubId: true, position: true, fromYear: true, toYear: true },
    })
    const byClub = new Map(clubs.map((c) => [c.id, { key: c.key, stints: [] as typeof allStints }]))
    for (const s of allStints) {
      const bucket = byClub.get(s.clubId)
      if (bucket) bucket.stints.push(s)
    }
    for (const y of years) {
      let full = 0
      for (const c of clubs) {
        const bucket = byClub.get(c.id)
        if (!bucket) continue
        const ok = positions.every((pos) =>
          bucket.stints.some((s) => s.position === pos && s.fromYear <= y && s.toYear >= y)
        )
        if (ok) full++
      }
      console.log(`tahun ${y}: klub dgn 4 posisi stint penuh = ${full}/32`)
    }

    const bar = byClub.get(clubIdByKey.get('bar') ?? '')
    if (bar) {
      for (const pos of positions) {
        const n = bar.stints.filter((s) => s.position === pos && s.fromYear <= 2015 && s.toYear >= 2015).length
        console.log(`bar 2015 ${pos}: ${n} pemain stint`)
      }
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
