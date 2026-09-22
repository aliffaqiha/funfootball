import 'dotenv/config'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'csv-parse/sync'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const CONNECTION_STRING = process.env.DATABASE_URL

if (!CONNECTION_STRING) {
  console.error('DATABASE_URL tidak ditemukan. Salin .env.example menjadi .env lalu isi koneksi PostgreSQL.')
  process.exit(1)
}

const PLAYERS_CSV = join(process.cwd(), 'data', 'players.csv')
const TRANSFERS_CSV = join(process.cwd(), 'data', 'transfers.csv')

const BATCH = 500

type Row = Record<string, string | undefined>

// Hubungan nama klub di players.csv -> key klub Starting 11 di pool
const ROSTER_ALIAS: Record<string, string[]> = {
  aja: ['Ajax Amsterdam'],
  ben: ['SL Benfica'],
  fcp: ['FC Porto'],
  fen: ['Fenerbahce'],
  fla: ['Clube de Regatas do Flamengo'],
  gal: ['Galatasaray'],
  rsb: ['Fußballclub Red Bull Salzburg'],
  riv: ['Club Atlético River Plate'],
}

// Row dataset lama (top-5) yang pemainnya harus dipindah ke klub pool
const RE_LINK: Record<string, string> = {
  rom: 'roma',
  asm: 'monaco',
  b04: 'leverkusen',
  new: 'newcastle',
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

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: CONNECTION_STRING }) })
  const playerRows = readCsv(PLAYERS_CSV)
  const transferRows = readCsv(TRANSFERS_CSV)

  const pool = JSON.parse(
    readFileSync(join(process.cwd(), 'src', 'data', 'starting11-pool.json'), 'utf8'),
  ) as {
    clubs: { id: string; name: string; country: string }[]
  }

  try {
    const clubs = await prisma.club.findMany({ select: { id: true, key: true } })
    const byKey = new Map(clubs.map((c) => [c.key, c.id]))

    // ---- Fase A: pindahkan pemain dari row dataset lama ke klub pool ----
    for (const [poolKey, dsKey] of Object.entries(RE_LINK)) {
      const poolId = byKey.get(poolKey)
      const dsId = byKey.get(dsKey)
      if (!poolId || !dsId) {
        console.log(`[merge] ${poolKey} / ${dsKey} tidak ditemukan, dilewati.`)
        continue
      }
      const res = await prisma.player.updateMany({ where: { clubId: dsId }, data: { clubId: poolId } })
      const dupe = await prisma.club.deleteMany({ where: { key: dsKey } })
      console.log(`[merge] ${poolKey} <- ${dsKey}: ${res.count} pemain dipindah, ${dupe.count} row dataset dihapus.`)
    }

    // ---- Fase B: impor roster untuk klub yang belum punya pemain ----
    const aliasNameToKey = new Map<string, string[]>()
    for (const [key, names] of Object.entries(ROSTER_ALIAS)) {
      for (const n of names) {
        const bucket = aliasNameToKey.get(n.toLowerCase()) ?? []
        bucket.push(key)
        aliasNameToKey.set(n.toLowerCase(), bucket)
      }
    }

    const rowsByKey = new Map<string, Row[]>()
    for (const r of playerRows) {
      const name = (r.current_club_name ?? '').toLowerCase()
      const keys = aliasNameToKey.get(name)
      if (keys) {
        for (const k of keys) {
          const list = rowsByKey.get(k) ?? []
          list.push(r)
          rowsByKey.set(k, list)
        }
      }
    }

    // pastikan country rows tersedia untuk semua nationality yang muncul
    const countryIdByName = new Map<string, string>()
    async function ensureCountry(name: string | undefined): Promise<string | null> {
      if (!name) return null
      const existing = countryIdByName.get(name)
      if (existing) return existing
      const row = await prisma.country.upsert({
        where: { name },
        update: {},
        create: { name },
      })
      countryIdByName.set(name, row.id)
      return row.id
    }

    const importedIds: number[] = []
    for (const key of Object.keys(ROSTER_ALIAS)) {
      const poolId = byKey.get(key)
      if (!poolId) continue
      const rows = rowsByKey.get(key) ?? []
      if (rows.length === 0) {
        console.log(`[roster] ${key}: tidak ada baris di players.csv.`)
        continue
      }

      const countryIdByNat = new Map<string, string | null>()
      for (const r of rows) {
        const nat = r.country_of_citizenship
        if (nat && !countryIdByNat.has(nat)) {
          countryIdByNat.set(nat, await ensureCountry(nat))
        }
      }

      let done = 0
      for (let i = 0; i < rows.length; i += BATCH) {
        const chunk = rows.slice(i, i + BATCH)
        await prisma.$transaction(
          chunk.map((r) => {
            const tmId = toNumber(r.player_id) as number
            importedIds.push(tmId)
            return prisma.player.upsert({
              where: { transfermarktId: tmId },
              update: {
                name: r.name ?? 'Unknown Player',
                position: r.position || null,
                nationality: r.country_of_citizenship || null,
                currentClub: r.current_club_name || null,
                domesticCompetitionId: r['current_club_domestic_competition_id'] || null,
                clubId: poolId,
                countryId: countryIdByNat.get(r.country_of_citizenship ?? '') ?? null,
              },
              create: {
                transfermarktId: tmId,
                name: r.name ?? 'Unknown Player',
                position: r.position || null,
                nationality: r.country_of_citizenship || null,
                currentClub: r.current_club_name || null,
                domesticCompetitionId: r['current_club_domestic_competition_id'] || null,
                clubId: poolId,
                countryId: countryIdByNat.get(r.country_of_citizenship ?? '') ?? null,
              },
            })
          }),
        )
        done += chunk.length
      }
      console.log(`[roster] ${key}: ${done} pemain diimpor.`)
    }

    // ---- Fase C: transfer untuk pemain roster baru (tanpa hapus data lama) ----
    if (importedIds.length > 0) {
      const wanted = new Set(importedIds)
      const filtered = transferRows.filter((t) => wanted.has(toNumber(t.player_id) ?? -1))
      const dbPlayers = await prisma.player.findMany({
        where: { transfermarktId: { in: importedIds } },
        select: { id: true, transfermarktId: true },
      })
      const idByTm = new Map(dbPlayers.map((p) => [p.transfermarktId, p.id]))
      let made = 0
      for (let i = 0; i < filtered.length; i += BATCH) {
        const chunk = filtered.slice(i, i + BATCH)
        const res = await prisma.transfer.createMany({
          data: chunk.map((t) => ({
            playerId: idByTm.get(toNumber(t.player_id) ?? -1) as string,
            transferKey: [t.player_id, t.transfer_date ?? '', t.from_club_name ?? '', t.to_club_name ?? '', t.transfer_fee ?? ''].join('|'),
            fromClub: t.from_club_name ?? 'Unknown',
            toClub: t.to_club_name ?? 'Unknown',
            season: t.transfer_season || (t.transfer_date ? String(t.transfer_date).slice(0, 4) : null),
            fee: toNumber(t.transfer_fee),
          })),
          skipDuplicates: true,
        })
        made += res.count
      }
      console.log(`[transfers] ${made}/${filtered.length} transfer roster elite dibuat (incremental).`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})