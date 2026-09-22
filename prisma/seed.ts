import path from 'node:path'
import { readFileSync } from 'node:fs'
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const CONNECTION_STRING = process.env.DATABASE_URL

if (!CONNECTION_STRING) {
  console.error('DATABASE_URL tidak ditemukan. Salin .env.example menjadi .env lalu isi koneksi PostgreSQL.')
  process.exit(1)
}

const FLAG_TO_COUNTRY: Record<string, string> = {
  '🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}': 'England',
  '🇪🇸': 'Spain',
  '🇩🇪': 'Germany',
  '🇮🇹': 'Italy',
  '🇫🇷': 'France',
  '🇦🇹': 'Austria',
  '🇹🇷': 'Turkey',
}

function loadJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8'))
}

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: CONNECTION_STRING }) })

  try {
    const clubs = loadJson(path.join(__dirname, '..', 'src', 'data', 'clubs-nations.json')) as Array<{
      id: string
      name: string
      flag: string
      color: string
    }>
    const trivia = loadJson(path.join(__dirname, '..', 'src', 'data', 'trivia.json')) as Array<{
      category: string
      question: string
      options: string[]
      answer: string
    }>

    const countryNames = [...new Set(clubs.map((c) => FLAG_TO_COUNTRY[c.flag]).filter(Boolean))] as string[]
    const countryIdByName = new Map<string, string>()
    for (const name of countryNames) {
      const country = await prisma.country.upsert({
        where: { name },
        update: {},
        create: { name },
      })
      countryIdByName.set(name, country.id)
    }
    console.log(`[seed] ${countryNames.length} negara`)

    for (const club of clubs) {
      const countryName = FLAG_TO_COUNTRY[club.flag]
      await prisma.club.upsert({
        where: { key: club.id },
        update: {
          name: club.name,
          color: club.color,
          countryId: countryName ? countryIdByName.get(countryName) : null,
        },
        create: {
          key: club.id,
          name: club.name,
          color: club.color,
          countryId: countryName ? countryIdByName.get(countryName) : null,
        },
      })
    }
    console.log(`[seed] ${clubs.length} klub`)

    await prisma.triviaQuestion.deleteMany()
    await prisma.triviaQuestion.createMany({
      data: trivia.map((q) => ({
        category: q.category as 'General' | 'Medium' | 'Hard',
        question: q.question,
        options: q.options,
        answer: q.answer,
      })),
    })
    console.log(`[seed] ${trivia.length} pertanyaan trivia`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})