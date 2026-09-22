import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const CONNECTION_STRING = process.env.DATABASE_URL

if (!CONNECTION_STRING) {
  console.error('DATABASE_URL tidak ditemukan. Salin .env.example menjadi .env lalu isi koneksi PostgreSQL.')
  process.exit(1)
}

const LEAGUE_TO_COUNTRY: Record<string, string> = {
  GB1: 'England',
  ES1: 'Spain',
  IT1: 'Italy',
  L1: 'France',
  FR1: 'Germany',
}

const NATIONALITY_NORMALIZE: Record<string, string> = {
  'Türkiye': 'Turkey',
  'Korea, South': 'South Korea',
  'Korea, North': 'North Korea',
  'Neukaledonien': 'New Caledonia',
  'Bosnia-Herzegovina': 'Bosnia and Herzegovina',
  'Macao': 'Macau',
  'The Gambia': 'Gambia',
}

const CURATED_MATCH: Record<string, string> = {
  'Arsenal FC': 'Arsenal',
  'Aston Villa': 'Aston Villa',
  'Atlético de Madrid': 'Atletico Madrid',
  'FC Barcelona': 'Barcelona',
  'Bayern Munich': 'Bayern Munich',
  'Borussia Dortmund': 'Borussia Dortmund',
  'Chelsea FC': 'Chelsea',
  'Juventus FC': 'Juventus',
  'Liverpool FC': 'Liverpool',
  'Manchester City': 'Manchester City',
  'Manchester United': 'Manchester United',
  'Inter Milan': 'Inter Milan',
  'AC Milan': 'AC Milan',
  'Paris Saint-Germain': 'Paris Saint-Germain',
  'Real Madrid': 'Real Madrid',
  'Sevilla FC': 'Sevilla',
  'Tottenham Hotspur': 'Tottenham Hotspur',
  'SSC Napoli': 'Napoli',
}

const CLUB_DISPLAY: Record<string, string> = {
  'Genoa CFC': 'Genoa',
  'Atalanta BC': 'Atalanta',
  'Bologna Football Club 1909': 'Bologna',
  'Torino FC': 'Torino',
  'Parma Calcio 1913': 'Parma',
  'Udinese Calcio': 'Udinese',
  'Società Sportiva Lazio S.p.A.': 'Lazio',
  'US Sassuolo': 'Sassuolo',
  'Cagliari Calcio': 'Cagliari',
  'Associazione Sportiva Roma': 'Roma',
  'Getafe CF': 'Getafe',
  'Real Betis Balompié': 'Real Betis',
  'FC Metz': 'Metz',
  'FC Empoli': 'Empoli',
  'ACF Fiorentina': 'Fiorentina',
  'OGC Nice': 'Nice',
  'FC Lorient': 'Lorient',
  'UC Sampdoria': 'Sampdoria',
  'CA Osasuna': 'Osasuna',
  'FC Augsburg': 'Augsburg',
  'West Ham United': 'West Ham',
  'Olympique Marseille': 'Marseille',
  'RCD Espanyol Barcelona': 'Espanyol',
  'Rayo Vallecano': 'Rayo Vallecano',
  'Angers SCO': 'Angers',
  'Levante UD': 'Levante',
  'Celta de Vigo': 'Celta Vigo',
  'FC Toulouse': 'Toulouse',
  'Elche CF': 'Elche',
  'SV Werder Bremen': 'Werder Bremen',
  'Stade Rennais FC': 'Stade Rennais',
  'Burnley FC': 'Burnley',
  'AFC Bournemouth': 'Bournemouth',
  'Montpellier HSC': 'Montpellier',
  'RCD Mallorca': 'Mallorca',
  'VfB Stuttgart': 'Stuttgart',
  '1.FSV Mainz 05': 'Mainz 05',
  'TSG 1899 Hoffenheim': 'TSG Hoffenheim',
  'LOSC Lille': 'Lille',
  'RC Strasbourg Alsace': 'Strasbourg',
  'FC Nantes': 'Nantes',
  'Sunderland AFC': 'Sunderland',
  'Real Valladolid CF': 'Real Valladolid',
  'Deportivo Alavés': 'Alavés',
  'Villarreal CF': 'Villarreal',
  'Everton FC': 'Everton',
  'Bayer 04 Leverkusen': 'Leverkusen',
  'Brighton & Hove Albion': 'Brighton',
  'Stade Brestois 29': 'Brest',
  'US Lecce': 'Lecce',
  'Valencia CF': 'Valencia',
  'AS Saint-Étienne': 'Saint-Étienne',
  'SC Freiburg': 'Freiburg',
  'RC Lens': 'Lens',
  'Borussia Mönchengladbach': 'Borussia Mönchengladbach',
  'VfL Wolfsburg': 'Wolfsburg',
  'Southampton FC': 'Southampton',
  'Girona FC': 'Girona',
  '1.FC Köln': 'Köln',
  'Newcastle United': 'Newcastle',
  'Granada CF': 'Granada',
  'UD Las Palmas': 'Las Palmas',
  'Leicester City': 'Leicester',
  'AS Monaco': 'Monaco',
  'Frosinone Calcio': 'Frosinone',
  'West Bromwich Albion': 'West Brom',
  'Stade Reims': 'Reims',
  'Olympique Lyon': 'Lyon',
  'Wolverhampton Wanderers': 'Wolves',
  '1.FC Union Berlin': 'Union Berlin',
  'Hamburger SV': 'Hamburg',
  'AJ Auxerre': 'Auxerre',
  'Fulham FC': 'Fulham',
  'AC Ajaccio': 'Ajaccio',
  'ESTAC Troyes': 'Troyes',
  'Leeds United': 'Leeds',
  'Cádiz CF': 'Cádiz',
  'US Cremonese': 'Cremonese',
  'FC Girondins Bordeaux': 'Bordeaux',
  'Norwich City': 'Norwich',
  'SV Darmstadt 98': 'Darmstadt',
  'SC Bastia': 'Bastia',
  'Como 1907': 'Como',
  'SD Eibar': 'Eibar',
  'Watford FC': 'Watford',
  'CD Leganés': 'Leganés',
  'Brentford FC': 'Brentford',
  'Le Havre AC': 'Le Havre',
  'Hertha BSC': 'Hertha BSC',
  'Fortuna Düsseldorf': 'Fortuna Düsseldorf',
  'Delfino Pescara 1936': 'Pescara',
  'Hannover 96': 'Hannover 96',
  'Palermo FC': 'Palermo',
  'UD Almería': 'Almería',
  'US Salernitana 1919': 'Salernitana',
  'FC Crotone': 'Crotone',
  'Venezia FC': 'Venezia',
  'FC Schalke 04': 'Schalke 04',
  'AC Monza': 'Monza',
  '1. Fußballclub Heidenheim 1846': 'Heidenheim',
  'EA Guingamp': 'Guingamp',
  'Dijon FCO': 'Dijon',
  'Clermont Foot 63': 'Clermont',
  'Pisa Sporting Club': 'Pisa',
  'FC St. Pauli': 'St. Pauli',
  'SM Caen': 'Caen',
  'Benevento Calcio': 'Benevento',
  'VfL Bochum': 'Bochum',
  'Real Oviedo': 'Real Oviedo',
  'Catania FC': 'Catania',
  'Deportivo de La Coruña': 'Deportivo La Coruña',
  'Amiens SC': 'Amiens',
  'Queens Park Rangers': 'QPR',
  'Thonon Évian Grand Genève FC': 'Évian',
  '1.FC Nuremberg': 'Nürnberg',
  'Nîmes Olympique': 'Nîmes',
  'SpVgg Greuther Fürth': 'Greuther Fürth',
  'AS Nancy-Lorraine': 'Nancy',
  'SC Paderborn 07': 'Paderborn',
  'SD Huesca': 'Huesca',
  'Málaga CF': 'Málaga',
  'Spezia Calcio': 'Spezia',
  'US Livorno 1915': 'Livorno',
  'Ipswich Town': 'Ipswich',
  'Middlesbrough FC': 'Middlesbrough',
  'FC Sochaux-Montbéliard': 'Sochaux',
  'Huddersfield Town': 'Huddersfield',
  'GFC Ajaccio': 'Gazélec Ajaccio',
  'Brescia Calcio': 'Brescia',
  'FC Ingolstadt 04': 'Ingolstadt',
  'Arminia Bielefeld': 'Arminia Bielefeld',
  'Reading FC': 'Reading',
  'Cesena FC': 'Cesena',
  'Siena FC': 'Siena',
  'Córdoba CF': 'Córdoba',
  'Real Zaragoza': 'Real Zaragoza',
  'Wigan Athletic': 'Wigan',
  'AC Carpi': 'Carpi',
  'Valenciennes FC': 'Valenciennes',
}

const DEFAULT_CLUB_COLOR = '#64748B'

function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function modeOf(values: Array<string | null | undefined>): string | null {
  const counts = new Map<string, number>()
  for (const v of values) {
    if (!v) continue
    counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  let best: string | null = null
  let bestCount = 0
  for (const [k, n] of counts) {
    if (n > bestCount) {
      best = k
      bestCount = n
    }
  }
  return best
}

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: CONNECTION_STRING }) })

  try {
    const players = await prisma.player.findMany({
      select: { id: true, nationality: true, currentClub: true, domesticCompetitionId: true },
    })

    const countryNames = new Set<string>()
    for (const p of players) {
      if (!p.nationality) continue
      countryNames.add(NATIONALITY_NORMALIZE[p.nationality] ?? p.nationality)
    }
    for (const name of countryNames) {
      await prisma.country.upsert({ where: { name }, update: {}, create: { name } })
    }
    const countryRows = await prisma.country.findMany({ select: { id: true, name: true } })
    const countryIdByName = new Map(countryRows.map((c) => [c.name, c.id]))
    console.log(`[curate] ${countryRows.length} negara`)

    const curatedClubs = await prisma.club.findMany({ select: { id: true, name: true, key: true } })
    const curatedIdByName = new Map(curatedClubs.map((c) => [c.name, c.id]))
    const curatedIdByKey = new Map(curatedClubs.map((c) => [c.key, c.id]))

    const clubLeagueByNames = new Map<string, Array<string | null>>()
    for (const p of players) {
      if (!p.currentClub) continue
      const arr = clubLeagueByNames.get(p.currentClub) ?? []
      arr.push(p.domesticCompetitionId ?? null)
      clubLeagueByNames.set(p.currentClub, arr)
    }

    const clubIdByDatasetName = new Map<string, string>()
    for (const [datasetName, leagues] of clubLeagueByNames) {
      const curatedName = CURATED_MATCH[datasetName]
      if (curatedName && curatedIdByName.has(curatedName)) {
        clubIdByDatasetName.set(datasetName, curatedIdByName.get(curatedName) as string)
        continue
      }
      const displayName = CLUB_DISPLAY[datasetName] ?? datasetName
      const key = slug(displayName)
      const countryName = LEAGUE_TO_COUNTRY[modeOf(leagues) ?? ''] ?? null
      const existing = curatedIdByKey.get(key)
      let id: string
      if (existing) {
        id = existing
      } else {
        const row = await prisma.club.upsert({
          where: { key },
          update: { name: displayName, countryId: countryName ? countryIdByName.get(countryName) : null },
          create: {
            key,
            name: displayName,
            color: DEFAULT_CLUB_COLOR,
            countryId: countryName ? countryIdByName.get(countryName) : null,
          },
        })
        id = row.id
        curatedIdByKey.set(key, id)
      }
      clubIdByDatasetName.set(datasetName, id)
    }
    const clubCount = await prisma.club.count()
    console.log(`[curate] ${clubCount} klub`)

    const BATCH = 500
    let updated = 0
    for (let i = 0; i < players.length; i += BATCH) {
      const chunk = players.slice(i, i + BATCH)
      await prisma.$transaction(
        chunk.map((p) => {
          const countryName = p.nationality ? (NATIONALITY_NORMALIZE[p.nationality] ?? p.nationality) : null
          const clubId = p.currentClub ? clubIdByDatasetName.get(p.currentClub) : undefined
          return prisma.player.update({
            where: { id: p.id },
            data: {
              countryId: countryName ? countryIdByName.get(countryName) : null,
              clubId: clubId ?? null,
            },
          })
        }),
      )
      updated += chunk.length
      console.log(`[curate] players ${updated}/${players.length}`)
    }

    const linked = await prisma.player.count({ where: { clubId: { not: null } } })
    const natLinked = await prisma.player.count({ where: { countryId: { not: null } } })
    console.log(`[curate] linked clubs=${linked} countries=${natLinked}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})