#!/usr/bin/env npx tsx
/**
 * Second pass: search for missing dishes with alternative query terms.
 * Run: npx tsx scripts/cache-gen/download-missing.ts
 */

import * as fs from 'fs'
import * as path from 'path'

const HEADERS = { 'User-Agent': 'PlateExpectations/1.0 (menu-translator-app)' }
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY || ''
const BASE_DIR = path.join(__dirname, 'candidates')
const REJECT_FILENAME = /portrait|headshot|logo|flag|map|statue|monument|building|skyline|album|screenshot|coat.of.arms|diagram|newspaper|sign|banner|field|hybrid|paddy|harvest|farm|cultivation|pdf|document|concert|crowd|people|band|music|stadium|event|audience|singer|performer/i

// Alternative search terms for dishes that failed the first pass
const ALT_QUERIES: Record<string, string[]> = {
  // Korean
  'Galbitang': ['galbitang', 'galbi tang', 'Korean short rib soup', '갈비탕'],
  'Bossam': ['bossam', 'Korean boiled pork', 'bo-ssam', '보쌈'],
  'Samgyetang': ['samgyetang', 'ginseng chicken soup', 'sam gye tang', '삼계탕'],
  'Doenjang Jjigae': ['doenjang jjigae', 'Korean soybean paste stew', 'doenjang stew', '된장찌개'],
  'Budae Jjigae': ['budae jjigae', 'Korean army stew', 'army base stew', '부대찌개'],
  'Gamjatang': ['gamjatang', 'Korean pork bone soup', 'pork backbone stew', '감자탕'],
  'Gimbap': ['gimbap', 'kimbap', 'Korean rice roll', 'Korean sushi roll', '김밥'],
  'Ojingeo Bokkeum': ['ojingeo bokkeum', 'Korean spicy squid', 'stir fried squid Korean', '오징어볶음'],
  // Japanese
  'Katsu Curry': ['katsu curry', 'Japanese curry katsu', 'katsu kare', 'カツカレー', 'Japanese curry rice cutlet'],
  'Gyoza': ['gyoza', 'Japanese dumplings', 'Japanese gyoza', 'pot sticker Japanese', '餃子'],
  'Nikujaga': ['nikujaga', 'Japanese meat potato stew', '肉じゃが'],
  'Matcha Parfait': ['matcha parfait', 'Japanese matcha dessert', 'green tea parfait', '抹茶パフェ'],
  // Thai
  'Tom Yum Goong': ['tom yum', 'tom yam kung', 'Thai hot sour soup', 'tom yum goong', 'ต้มยำกุ้ง'],
  'Som Tum': ['som tum', 'Thai papaya salad', 'green papaya salad', 'som tam', 'ส้มตำ'],
  'Pad See Ew': ['pad see ew', 'Thai soy sauce noodles', 'phat si io', 'ผัดซีอิ๊ว'],
  'Kai Med Ma Muang': ['cashew chicken Thai', 'Thai cashew nut chicken', 'gai pad med mamuang'],
  'Pla Rad Prik': ['pla rad prik', 'Thai fried fish chili', 'Thai crispy fish chili sauce'],
  'Gaeng Keow Wan Gai': ['green curry chicken', 'Thai green curry chicken', 'kaeng khiao wan kai'],
  'Pad Woon Sen': ['pad woon sen', 'Thai glass noodle stir fry', 'phat wun sen'],
  'Boat Noodles': ['Thai boat noodles', 'kuay teow reua', 'Bangkok boat noodles'],
  // Vietnamese
  'Goi Cuon': ['goi cuon', 'Vietnamese spring rolls', 'Vietnamese fresh rolls', 'summer rolls Vietnamese'],
  'Bo Luc Lac': ['bo luc lac', 'Vietnamese shaking beef', 'shaking beef', 'bò lúc lắc'],
  'Banh Trang Nuong': ['banh trang nuong', 'Vietnamese rice paper pizza', 'Vietnamese grilled rice paper'],
  // Malaysian
  'Hainanese Chicken Rice': ['Hainanese chicken rice', 'chicken rice Singapore', 'chicken rice Malaysian'],
  'Bak Kut Teh': ['bak kut teh', 'pork bone tea soup', 'Malaysian bak kut teh'],
  'Rojak': ['rojak', 'Malaysian fruit salad', 'rojak pasembur', 'Malaysian rojak'],
  'Wonton Mee': ['wonton mee', 'Malaysian wonton noodles', 'wonton noodle soup'],
  'Asam Laksa': ['asam laksa', 'Penang laksa', 'Malaysian sour fish noodle'],
  'Ayam Percik': ['ayam percik', 'Malaysian grilled chicken', 'percik chicken'],
  'Nasi Kerabu': ['nasi kerabu', 'Malaysian blue rice', 'Kelantan blue rice'],
  'Apam Balik': ['apam balik', 'Malaysian peanut pancake', 'ban jian kuih', 'Malaysian turnover'],
  'Kuih': ['Malaysian kuih', 'kueh', 'Malay cakes', 'nyonya kuih', 'Malaysian dessert kuih'],
  'Prawn Mee': ['prawn mee', 'Malaysian prawn noodle soup', 'Penang prawn mee', 'har mee'],
}

async function searchWikipedia(query: string): Promise<string | null> {
  try {
    const noTones = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
    const variants = [query, ...(noTones !== query ? [noTones] : [])]

    for (const variant of variants) {
      const searchParams = new URLSearchParams({
        action: 'opensearch', search: variant, limit: '5', format: 'json', origin: '*',
      })
      const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?${searchParams}`, { headers: HEADERS })
      if (!searchRes.ok) continue
      const searchData = await searchRes.json()
      const titles: string[] = searchData[1] || []
      if (titles.length === 0) continue

      const imgParams = new URLSearchParams({
        action: 'query', format: 'json', titles: titles.slice(0, 3).join('|'),
        prop: 'pageimages', pithumbsize: '500', origin: '*',
      })
      const imgRes = await fetch(`https://en.wikipedia.org/w/api.php?${imgParams}`, { headers: HEADERS })
      if (!imgRes.ok) continue
      const imgData = await imgRes.json()
      const pages = imgData.query?.pages
      if (!pages) continue
      for (const page of Object.values(pages) as any[]) {
        if (page.thumbnail?.source && !REJECT_FILENAME.test(page.thumbnail.source)) {
          return page.thumbnail.source
        }
      }
    }
  } catch {}
  return null
}

async function searchUnsplash(query: string): Promise<string | null> {
  if (!UNSPLASH_KEY) return null
  try {
    const params = new URLSearchParams({ query, per_page: '1', orientation: 'squarish' })
    const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
      headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.results?.[0]?.urls?.small || null
  } catch { return null }
}

async function downloadImage(url: string, filePath: string): Promise<boolean> {
  try {
    const res = await fetch(url, { headers: HEADERS })
    if (!res.ok) return false
    const buffer = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(filePath, buffer)
    return true
  } catch { return false }
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50)
}

async function main() {
  console.log('=== Second Pass: Missing Dishes ===\n')

  // Load first-pass results
  const resultsPath = path.join(BASE_DIR, 'search-results.json')
  const firstPass = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'))
  const missing = firstPass.noCandidates as string[]

  let found = 0
  let stillMissing: string[] = []

  for (const key of missing) {
    const [cuisine, dish] = key.split('/')
    const altQueries = ALT_QUERIES[dish]
    if (!altQueries) {
      console.log(`  ${dish}: no alt queries defined, trying Unsplash...`)
      const unsplash = await searchUnsplash(`${dish} food dish`)
      if (unsplash) {
        const dishDir = path.join(BASE_DIR, cuisine, sanitize(dish))
        fs.mkdirSync(dishDir, { recursive: true })
        const ok = await downloadImage(unsplash, path.join(dishDir, '0.jpg'))
        if (ok) {
          // Update the first-pass results
          const entry = firstPass.results.find((r: any) => r.cuisine === cuisine && r.dish === dish)
          if (entry) {
            entry.candidateCount = 1
            entry.candidates = [{ url: unsplash, source: 'Unsplash', localPath: path.join(dishDir, '0.jpg') }]
            entry.errors = []
          }
          console.log(`  ${dish}: ✓ found via Unsplash`)
          found++
          continue
        }
      }
      stillMissing.push(key)
      continue
    }

    process.stdout.write(`  ${dish}... `)
    let foundUrl: string | null = null
    let source = ''

    // Try each alt query on Wikipedia first
    for (const q of altQueries) {
      await new Promise(r => setTimeout(r, 200))
      const url = await searchWikipedia(q)
      if (url) {
        foundUrl = url
        source = `Wikipedia:${q}`
        break
      }
    }

    // Unsplash fallback
    if (!foundUrl) {
      for (const q of altQueries.slice(0, 2)) {
        const url = await searchUnsplash(q)
        if (url) {
          foundUrl = url
          source = `Unsplash:${q}`
          break
        }
      }
    }

    if (foundUrl) {
      const dishDir = path.join(BASE_DIR, cuisine, sanitize(dish))
      fs.mkdirSync(dishDir, { recursive: true })
      const ext = foundUrl.includes('.png') ? 'png' : 'jpg'
      const localPath = path.join(dishDir, `0.${ext}`)
      const ok = await downloadImage(foundUrl, localPath)
      if (ok) {
        const entry = firstPass.results.find((r: any) => r.cuisine === cuisine && r.dish === dish)
        if (entry) {
          entry.candidateCount = 1
          entry.candidates = [{ url: foundUrl, source, localPath }]
          entry.errors = []
        }
        console.log(`✓ (${source})`)
        found++
      } else {
        console.log(`download failed`)
        stillMissing.push(key)
      }
    } else {
      console.log(`❌ still missing`)
      stillMissing.push(key)
    }
  }

  // Save updated results
  firstPass.withCandidates = firstPass.results.filter((r: any) => r.candidateCount > 0).length
  firstPass.noCandidates = stillMissing
  fs.writeFileSync(resultsPath, JSON.stringify(firstPass, null, 2))

  console.log(`\n=== DONE ===`)
  console.log(`Found ${found} more dishes`)
  console.log(`Still missing: ${stillMissing.length}`)
  if (stillMissing.length > 0) {
    console.log(`Missing: ${stillMissing.join(', ')}`)
  }
}

main().catch(console.error)
