#!/usr/bin/env npx tsx
import * as fs from 'fs'
import * as path from 'path'

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY || ''
const BASE_DIR = path.join(__dirname, 'candidates')

const queries: Record<string, string[]> = {
  'thai/Pad See Ew': ['pad see ew', 'Thai flat noodles', 'stir fried noodles dark soy'],
  'thai/Kai Med Ma Muang': ['cashew chicken', 'Thai cashew nut chicken', 'Asian cashew stir fry'],
  'malaysian/Hainanese Chicken Rice': ['chicken rice', 'steamed chicken rice Asian', 'poached chicken rice'],
  'malaysian/Rojak': ['rojak', 'Asian fruit salad', 'Malaysian mixed salad'],
  'malaysian/Kuih': ['kuih', 'Asian colorful dessert cakes', 'Malaysian sweet cakes'],
}

async function search(q: string): Promise<string | null> {
  const params = new URLSearchParams({ query: q, per_page: '1', orientation: 'squarish' })
  const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
    headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.results?.[0]?.urls?.small || null
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50)
}

async function main() {
  const resultsPath = path.join(BASE_DIR, 'search-results.json')
  const data = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'))
  const still: string[] = []

  for (const [key, qs] of Object.entries(queries)) {
    const [cuisine, dish] = key.split('/')
    let url: string | null = null
    for (const q of qs) {
      url = await search(q)
      if (url) break
      await new Promise(r => setTimeout(r, 200))
    }
    if (url) {
      const dishDir = path.join(BASE_DIR, cuisine, sanitize(dish))
      fs.mkdirSync(dishDir, { recursive: true })
      const localPath = path.join(dishDir, '0.jpg')
      const res = await fetch(url)
      fs.writeFileSync(localPath, Buffer.from(await res.arrayBuffer()))
      const entry = data.results.find((r: any) => r.cuisine === cuisine && r.dish === dish)
      if (entry) {
        entry.candidateCount = 1
        entry.candidates = [{ url, source: 'Unsplash', localPath }]
        entry.errors = []
      }
      console.log(`${dish}: ✓`)
    } else {
      still.push(key)
      console.log(`${dish}: ❌`)
    }
  }

  data.withCandidates = data.results.filter((r: any) => r.candidateCount > 0).length
  data.noCandidates = still
  fs.writeFileSync(resultsPath, JSON.stringify(data, null, 2))
  console.log(`\nWith candidates: ${data.withCandidates}/125. Still missing: ${still.length}`)
}

main().catch(console.error)
