#!/usr/bin/env npx tsx
/**
 * Third pass: Unsplash-only search for remaining missing dishes.
 */
import * as fs from 'fs'
import * as path from 'path'

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY || ''
const BASE_DIR = path.join(__dirname, 'candidates')

const SPECIFIC_QUERIES: Record<string, string> = {
  'Ojingeo Bokkeum': 'Korean spicy stir fried squid',
  'Matcha Parfait': 'matcha green tea parfait dessert',
  'Som Tum': 'Thai green papaya salad',
  'Pad See Ew': 'Thai wide noodles soy sauce',
  'Kai Med Ma Muang': 'Thai cashew chicken stir fry',
  'Pla Rad Prik': 'Thai fried fish chili sauce',
  'Gaeng Keow Wan Gai': 'Thai green curry chicken',
  'Pad Woon Sen': 'Thai glass noodles stir fry',
  'Boat Noodles': 'Thai boat noodles dark broth',
  'Goi Cuon': 'Vietnamese fresh spring rolls',
  'Banh Trang Nuong': 'Vietnamese grilled rice paper',
  'Hainanese Chicken Rice': 'Hainanese chicken rice plate',
  'Bak Kut Teh': 'bak kut teh pork rib soup',
  'Rojak': 'Malaysian rojak fruit salad',
  'Wonton Mee': 'wonton noodles Malaysian',
  'Asam Laksa': 'Penang asam laksa noodle soup',
  'Ayam Percik': 'Malaysian grilled chicken percik',
  'Apam Balik': 'Malaysian peanut pancake turnover',
  'Kuih': 'Malaysian kuih colorful cakes',
}

async function searchUnsplash(query: string): Promise<string[]> {
  if (!UNSPLASH_KEY) return []
  try {
    const params = new URLSearchParams({ query, per_page: '3', orientation: 'squarish' })
    const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
      headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.results || []).map((r: any) => r.urls?.small).filter(Boolean)
  } catch { return [] }
}

async function downloadImage(url: string, filePath: string): Promise<boolean> {
  try {
    const res = await fetch(url)
    if (!res.ok) return false
    fs.writeFileSync(filePath, Buffer.from(await res.arrayBuffer()))
    return true
  } catch { return false }
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50)
}

async function main() {
  console.log('=== Third Pass: Unsplash for remaining ===\n')
  if (!UNSPLASH_KEY) { console.log('ERROR: No UNSPLASH_ACCESS_KEY'); return }

  const resultsPath = path.join(BASE_DIR, 'search-results.json')
  const data = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'))
  const missing = [...data.noCandidates] as string[]

  let found = 0
  const stillMissing: string[] = []

  for (const key of missing) {
    const [cuisine, dish] = key.split('/')
    const query = SPECIFIC_QUERIES[dish] || `${dish} food`
    process.stdout.write(`  ${dish}: "${query}"... `)

    await new Promise(r => setTimeout(r, 200))
    const urls = await searchUnsplash(query)

    if (urls.length > 0) {
      const dishDir = path.join(BASE_DIR, cuisine, sanitize(dish))
      fs.mkdirSync(dishDir, { recursive: true })
      const candidates: any[] = []
      for (let i = 0; i < urls.length; i++) {
        const localPath = path.join(dishDir, `${i}.jpg`)
        if (await downloadImage(urls[i], localPath)) {
          candidates.push({ url: urls[i], source: `Unsplash`, localPath })
        }
      }
      if (candidates.length > 0) {
        const entry = data.results.find((r: any) => r.cuisine === cuisine && r.dish === dish)
        if (entry) {
          entry.candidateCount = candidates.length
          entry.candidates = candidates
          entry.errors = []
        }
        console.log(`✓ ${candidates.length} images`)
        found++
      } else {
        console.log(`download failed`)
        stillMissing.push(key)
      }
    } else {
      console.log(`❌ no results`)
      stillMissing.push(key)
    }
  }

  data.withCandidates = data.results.filter((r: any) => r.candidateCount > 0).length
  data.noCandidates = stillMissing
  fs.writeFileSync(resultsPath, JSON.stringify(data, null, 2))

  console.log(`\nFound ${found} more. Still missing: ${stillMissing.length}`)
  if (stillMissing.length > 0) console.log(`Missing: ${stillMissing.join(', ')}`)
}

main().catch(console.error)
