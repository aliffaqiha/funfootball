import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import 'dotenv/config'
import { parse } from 'csv-parse/sync'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './src/generated/prisma/client'

const TOP_5_LEAGUE_IDS = new Set(['GB1', 'ES1', 'IT1', 'L1', 'FR1'])
const BATCH_SIZE = 500

const PLAYERS_CSV = path.join(__dirname, 'data', 'players.csv')
const TRANSFERS_CSV = path.join(__dirname, 'data', 'transfers.csv')

const CONNECTION_STRING = process.env.DATABASE_URL

if (!CONNECTION_STRING) {
  console.error('DATABASE_URL tidak ditemukan. Salin .env.example menjadi .env lalu isi koneksi PostgreSQL.')
  process.exit(1)
}

type Row = Record<string, string | undefined>

function toNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  const n = Number(String(value).replace(/[^0-9.eE+-]+/g, ''))
  return Number.isFinite(n) ? n : null
}

function readCsv(file: string): Row[] {
  if (!existsSync(file)) {
    console.warn(`[import] File ${path.basename(file)} tidak ditemukan, dilewati.`)
    return []
  }
  return parse(readFileSync(file), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
  }) as Row[]
}

async function upsertTopFivePlayers(prisma: PrismaClient, playerRows: Row[]) {
  const rows = playerRows.filter((p) => TOP_5_LEAGUE_IDS.has(p['current_club_domestic_competition_id'] ?? ''))
  console.log(`[players] ${rows.length} pemain liga 5 besar akan di-upsert.`)
  let done = 0
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE)
    await prisma.$transaction(
      chunk.map((p) =>
        prisma.player.upsert({
          where: { transfermarktId: toNumber(p.player_id) as number },
          update: {
            name: p.name ?? 'Unknown Player',
            position: p.position || null,
            currentClub: p.current_club_name || null,
            nationality: p.country_of_citizenship || null,
            domesticCompetitionId: p['current_club_domestic_competition_id'] || null,
            marketValue: toNumber(p.market_value_in_eur),
            highestMarketValue: toNumber(p.highest_market_value_in_eur),
            internationalCaps: toNumber(p.international_caps),
            lastSeason: toNumber(p.last_season),
          },
          create: {
            transfermarktId: toNumber(p.player_id) as number,
            name: p.name ?? 'Unknown Player',
            position: p.position || null,
            currentClub: p.current_club_name || null,
            nationality: p.country_of_citizenship || null,
            domesticCompetitionId: p['current_club_domestic_competition_id'] || null,
            marketValue: toNumber(p.market_value_in_eur),
            highestMarketValue: toNumber(p.highest_market_value_in_eur),
            internationalCaps: toNumber(p.international_caps),
            lastSeason: toNumber(p.last_season),
          },
        }),
      ),
    )
    done += chunk.length
    console.log(`[players] ${done}/${rows.length}`)
  }
  return rows
}

async function importTransfers(prisma: PrismaClient, transferRows: Row[]) {
  const dbPlayers = await prisma.player.findMany({ select: { id: true, transfermarktId: true } })
  const playerIdByTmId = new Map(dbPlayers.map((p) => [p.transfermarktId, p.id]))
  const rows = transferRows.filter((t) => playerIdByTmId.has(toNumber(t.player_id) ?? -1))
  console.log(`[transfers] ${rows.length} transfer (ke pemain 5 besar) akan dibuat.`)
  await prisma.transfer.deleteMany({})
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE)
    await prisma.transfer.createMany({
      data: chunk.map((t) => ({
        playerId: playerIdByTmId.get(toNumber(t.player_id) ?? -1) as string,
        transferKey: [t.player_id, t.transfer_date ?? '', t.from_club_name ?? '', t.to_club_name ?? '', t.transfer_fee ?? ''].join('|'),
        fromClub: t.from_club_name ?? 'Unknown',
        toClub: t.to_club_name ?? 'Unknown',
        season: t.transfer_season || (t.transfer_date ? String(t.transfer_date).slice(0, 4) : null),
        fee: toNumber(t.transfer_fee),
      })),
      skipDuplicates: true,
    })
    console.log(`[transfers] ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`)
  }
}

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: CONNECTION_STRING }) })
  try {
    const playerRows = readCsv(PLAYERS_CSV)
    const transferRows = readCsv(TRANSFERS_CSV)
    if (playerRows.length === 0 && transferRows.length === 0) {
      console.log('Tidak ada data untuk diimpor. Letakkan players.csv dan transfers.csv di folder ./data')
      return
    }
    await upsertTopFivePlayers(prisma, playerRows)
    await importTransfers(prisma, transferRows)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})