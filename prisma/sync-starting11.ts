import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const CONNECTION_STRING = process.env.DATABASE_URL

if (!CONNECTION_STRING) {
  console.error('DATABASE_URL tidak ditemukan. Salin .env.example menjadi .env lalu isi koneksi PostgreSQL.')
  process.exit(1)
}

interface PoolCountry {
  rank: number
  code: string
  name: string
  flag: string
}

interface PoolClub {
  id: string
  name: string
  country: string
  color: string
  flag: string
}

interface Pool {
  countries: PoolCountry[]
  clubs: PoolClub[]
}

const NAME_ALIAS: Record<string, string> = {
  'Türkiye': 'Turkey',
  'South Korea': 'South Korea',
  'Ivory Coast': 'Ivory Coast',
}

function canonicalCountryName(name: string): string {
  return NAME_ALIAS[name] ?? name
}

async function main() {
  const poolPath = join(process.cwd(), 'src', 'data', 'starting11-pool.json')
  const pool = JSON.parse(readFileSync(poolPath, 'utf8')) as Pool

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: CONNECTION_STRING }),
  })

  try {
    await prisma.club.updateMany({ where: { isStarting11: true }, data: { isStarting11: false } })
    await prisma.country.updateMany({ where: { fifaRank: { not: null } }, data: { fifaRank: null } })

    const countryIdByIso = new Map<string, string>()
    for (const c of pool.countries) {
      const name = canonicalCountryName(c.name)
      const row = await prisma.country.upsert({
        where: { name },
        update: { iso3: c.code, fifaRank: c.rank, flag: c.flag },
        create: { name, iso3: c.code, fifaRank: c.rank, flag: c.flag },
      })
      countryIdByIso.set(c.code, row.id)
    }
    console.log(`[sync11] ${pool.countries.length} negara top-32 FIFA disinkronkan`)

    for (const club of pool.clubs) {
      const countryId = countryIdByIso.get(club.country) ?? null
      const byName = await prisma.club.findUnique({ where: { name: club.name } })
      const byKey = byName ? null : await prisma.club.findUnique({ where: { key: club.id } })
      const existing = byName ?? byKey
      if (existing) {
        await prisma.club.update({
          where: { id: existing.id },
          data: {
            key: club.id,
            color: club.color,
            flag: club.flag,
            countryId,
            isStarting11: true,
          },
        })
      } else {
        await prisma.club.create({
          data: {
            key: club.id,
            name: club.name,
            color: club.color,
            flag: club.flag,
            countryId,
            isStarting11: true,
          },
        })
      }
    }
    console.log(`[sync11] ${pool.clubs.length} elite club ditandai isStarting11`)

    const named = await prisma.club.count({ where: { isStarting11: true } })
    const ranked = await prisma.country.count({ where: { fifaRank: { not: null } } })
    console.log(`[sync11] klub=starting11:${named} negara=berRanking:${ranked}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})