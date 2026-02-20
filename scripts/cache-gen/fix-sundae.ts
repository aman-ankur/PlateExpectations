#!/usr/bin/env npx tsx
import * as fs from 'fs'
import * as path from 'path'

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY || ''
const HEADERS = { 'User-Agent': 'PlateExpectations/1.0 (menu-translator-app)' }
const BASE_DIR = path.join(__dirname, 'candidates')

// Korean Sundae (순대) = blood sausage, NOT ice cream sundae
const queries = ['Sundae (Korean food)', 'Korean blood sausage', 'soondae Korean']

async function searchWikipedia(query: string): Promise<string | null> {
  const searchParams = new URLSearchParams({
    action: 'opensearch', search: query, limit: '5', format: 'json', origin: '*',
  })
  const res = await fetch(`https://en.wikipedia.org/w/api.php?${searchParams}`, { headers: HEADERS })
  if (!res.ok) return null
  const data = await res.json()
  const titles: string[] = data[1] || []
  if (!titles.length) return null

  const imgParams = new URLSearchParams({
    action: 'query', format: 'json', titles: titles.slice(0, 3).join('|'),
    prop: 'pageimages', pithumbsize: '500', origin: '*',
  })
  const imgRes = await fetch(`https://en.wikipedia.org/w/api.php?${imgParams}`, { headers: HEADERS })
  if (!imgRes.ok) return null
  const imgData = await imgRes.json()
  const pages = imgData.query?.pages
  if (!pages) return null
  for (const page of Object.values(pages) as any[]) {
    if (page.thumbnail?.source) return page.thumbnail.source
  }
  return null
}

async function searchUnsplash(query: string): Promise<string | null> {
  if (!UNSPLASH_KEY) return null
  const params = new URLSearchParams({ query, per_page: '1', orientation: 'squarish' })
  const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
    headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.results?.[0]?.urls?.small || null
}

async function main() {
  console.log('Fixing Korean Sundae (순대)...\n')

  let url: string | null = null
  let source = ''

  for (const q of queries) {
    url = await searchWikipedia(q)
    if (url) { source = `Wikipedia:${q}`; break }
    await new Promise(r => setTimeout(r, 300))
  }

  if (!url) {
    url = await searchUnsplash('Korean blood sausage soondae')
    if (url) source = 'Unsplash'
  }
  if (!url) {
    url = await searchUnsplash('sundae Korean food')
    if (url) source = 'Unsplash'
  }

  if (url) {
    const dishDir = path.join(BASE_DIR, 'korean', 'Sundae')
    // Remove old wrong images
    for (const f of fs.readdirSync(dishDir)) fs.unlinkSync(path.join(dishDir, f))
    const localPath = path.join(dishDir, '0.jpg')
    const res = await fetch(url, { headers: HEADERS })
    fs.writeFileSync(localPath, Buffer.from(await res.arrayBuffer()))

    // Update search-results.json
    const resultsPath = path.join(BASE_DIR, 'search-results.json')
    const data = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'))
    const entry = data.results.find((r: any) => r.cuisine === 'korean' && r.dish === 'Sundae')
    if (entry) {
      entry.candidateCount = 1
      entry.candidates = [{ url, source, localPath }]
      entry.errors = []
    }
    fs.writeFileSync(resultsPath, JSON.stringify(data, null, 2))
    console.log(`✓ Found: ${source} → ${url.slice(0, 80)}...`)
  } else {
    console.log('❌ Still no image found')
  }
}

main().catch(console.error)
