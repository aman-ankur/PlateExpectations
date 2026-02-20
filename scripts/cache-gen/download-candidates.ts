#!/usr/bin/env npx tsx
/**
 * Search Wikipedia/Commons/Unsplash for dish images and download candidates.
 * Run: npx tsx scripts/cache-gen/download-candidates.ts
 *
 * Downloads up to 3 candidate images per dish to scripts/cache-gen/candidates/{cuisine}/{dish}/
 * These will be visually verified by Claude, then the best URL stored in the cache JSON.
 */

import * as fs from 'fs'
import * as path from 'path'
import { CUISINES } from './cuisine-dishes'

const HEADERS = { 'User-Agent': 'PlateExpectations/1.0 (menu-translator-app)' }
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY || ''
const BASE_DIR = path.join(__dirname, 'candidates')

const REJECT_FILENAME = /portrait|headshot|logo|flag|map|statue|monument|building|skyline|album|screenshot|coat.of.arms|diagram|newspaper|sign|banner|field|hybrid|paddy|harvest|farm|cultivation|pdf|document|concert|crowd|people|band|music|stadium|event|audience|singer|performer/i

interface CandidateResult {
  cuisine: string
  dish: string
  nameLocal: string
  candidates: { url: string; source: string; localPath: string }[]
  errors: string[]
}

async function searchWikipedia(query: string): Promise<{ url: string; title: string }[]> {
  const results: { url: string; title: string }[] = []

  // Try the query and a tone-stripped variant
  const noTones = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
  const variants = [query, ...(noTones !== query ? [noTones] : []), `${query} food`]

  for (const variant of variants) {
    try {
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
        if (page.thumbnail?.source) {
          const url = page.thumbnail.source
          if (!REJECT_FILENAME.test(url) && !results.find(r => r.url === url)) {
            results.push({ url, title: page.title })
          }
        }
      }
    } catch {}
  }
  return results
}

async function searchCommons(query: string): Promise<string[]> {
  const urls: string[] = []
  try {
    const params = new URLSearchParams({
      action: 'query', format: 'json', list: 'search',
      srsearch: query, srnamespace: '6', srlimit: '5', origin: '*',
    })
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: HEADERS })
    if (!res.ok) return urls
    const data = await res.json()
    const results = data.query?.search || []

    for (const result of results) {
      if (REJECT_FILENAME.test(result.title)) continue
      const thumbParams = new URLSearchParams({
        action: 'query', format: 'json', titles: result.title,
        prop: 'imageinfo', iiprop: 'url', iiurlwidth: '500', origin: '*',
      })
      const thumbRes = await fetch(`https://commons.wikimedia.org/w/api.php?${thumbParams}`, { headers: HEADERS })
      if (!thumbRes.ok) continue
      const thumbData = await thumbRes.json()
      const pages = thumbData.query?.pages
      if (!pages) continue
      for (const page of Object.values(pages) as any[]) {
        if (page.imageinfo?.[0]?.thumburl) {
          const u = page.imageinfo[0].thumburl
          if (!REJECT_FILENAME.test(u) && !urls.includes(u)) urls.push(u)
        }
      }
    }
  } catch {}
  return urls
}

async function searchUnsplash(query: string): Promise<string | null> {
  if (!UNSPLASH_KEY) return null
  try {
    const params = new URLSearchParams({ query: `${query} food`, per_page: '1', orientation: 'squarish' })
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

async function processDish(cuisine: string, dish: { nameEnglish: string; nameLocal: string }): Promise<CandidateResult> {
  const result: CandidateResult = {
    cuisine, dish: dish.nameEnglish, nameLocal: dish.nameLocal,
    candidates: [], errors: [],
  }

  const dishDir = path.join(BASE_DIR, cuisine, sanitize(dish.nameEnglish))
  fs.mkdirSync(dishDir, { recursive: true })

  const allUrls: { url: string; source: string }[] = []

  // Wikipedia — search by local name first, then English
  const wikiLocal = await searchWikipedia(dish.nameLocal)
  for (const w of wikiLocal) allUrls.push({ url: w.url, source: `Wikipedia:${w.title}` })

  const wikiEng = await searchWikipedia(dish.nameEnglish)
  for (const w of wikiEng) {
    if (!allUrls.find(u => u.url === w.url)) allUrls.push({ url: w.url, source: `Wikipedia:${w.title}` })
  }

  // Commons
  const commons = await searchCommons(dish.nameEnglish)
  for (const url of commons) {
    if (!allUrls.find(u => u.url === url)) allUrls.push({ url, source: 'Commons' })
  }

  // Unsplash
  const unsplash = await searchUnsplash(dish.nameEnglish)
  if (unsplash && !allUrls.find(u => u.url === unsplash)) {
    allUrls.push({ url: unsplash, source: 'Unsplash' })
  }

  // Download top 3 candidates
  let idx = 0
  for (const candidate of allUrls.slice(0, 5)) {
    if (result.candidates.length >= 3) break
    const ext = candidate.url.includes('.png') ? 'png' : 'jpg'
    const localPath = path.join(dishDir, `${idx}.${ext}`)
    const ok = await downloadImage(candidate.url, localPath)
    if (ok) {
      result.candidates.push({ url: candidate.url, source: candidate.source, localPath })
      idx++
    } else {
      result.errors.push(`Failed to download: ${candidate.url}`)
    }
  }

  if (result.candidates.length === 0) {
    result.errors.push('No candidates found from any source')
  }

  return result
}

async function main() {
  console.log('=== Dish Image Candidate Downloader ===\n')

  if (!UNSPLASH_KEY) {
    console.log('⚠ No UNSPLASH_ACCESS_KEY — skipping Unsplash source\n')
  }

  const allResults: CandidateResult[] = []

  for (const [cuisine, { dishes }] of Object.entries(CUISINES)) {
    console.log(`\n--- ${cuisine.toUpperCase()} (${dishes.length} dishes) ---`)

    for (const dish of dishes) {
      process.stdout.write(`  ${dish.nameEnglish}... `)
      // Rate limit — be nice to Wikipedia
      await new Promise(r => setTimeout(r, 300))
      const result = await processDish(cuisine, dish)
      allResults.push(result)

      if (result.candidates.length > 0) {
        console.log(`${result.candidates.length} candidates (${result.candidates.map(c => c.source.split(':')[0]).join(', ')})`)
      } else {
        console.log('❌ NO CANDIDATES')
      }
    }
  }

  // Write summary
  const summary = {
    totalDishes: allResults.length,
    withCandidates: allResults.filter(r => r.candidates.length > 0).length,
    noCandidates: allResults.filter(r => r.candidates.length === 0).map(r => `${r.cuisine}/${r.dish}`),
    results: allResults.map(r => ({
      cuisine: r.cuisine,
      dish: r.dish,
      nameLocal: r.nameLocal,
      candidateCount: r.candidates.length,
      candidates: r.candidates.map(c => ({ url: c.url, source: c.source, localPath: c.localPath })),
      errors: r.errors,
    })),
  }

  const summaryPath = path.join(BASE_DIR, 'search-results.json')
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2))

  console.log(`\n=== DONE ===`)
  console.log(`Total: ${summary.totalDishes} dishes`)
  console.log(`With candidates: ${summary.withCandidates}`)
  console.log(`No candidates: ${summary.noCandidates.length}`)
  if (summary.noCandidates.length > 0) {
    console.log(`Missing: ${summary.noCandidates.join(', ')}`)
  }
  console.log(`\nResults saved to: ${summaryPath}`)
}

main().catch(console.error)
