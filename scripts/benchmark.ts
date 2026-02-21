#!/usr/bin/env npx tsx
/**
 * Benchmark script for the scan pipeline.
 *
 * Usage:
 *   npx tsx scripts/benchmark.ts <image> [options]
 *
 * Options:
 *   --phase1 gemini|cloud-vision-groq|gpt-vision
 *   --enrichment groq|gpt
 *   --lazy / --no-lazy
 *   --ground-truth <path.json>
 *   --runs <N>  (default 1)
 *   --output <path.json>
 */

import * as fs from 'fs'
import * as path from 'path'
import { config } from 'dotenv'

// Load .env.local
config({ path: path.resolve(__dirname, '..', '.env.local') })

// Parse args before importing anything (so env vars are set first)
const args = process.argv.slice(2)
const imagePath = args.find((a) => !a.startsWith('--'))
if (!imagePath) {
  console.error('Usage: npx tsx scripts/benchmark.ts <image> [--phase1 ...] [--enrichment ...] [--lazy|--no-lazy] [--ground-truth ...] [--runs N] [--output ...]')
  process.exit(1)
}

function getArg(name: string): string | undefined {
  const idx = args.indexOf(name)
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined
}

const phase1 = getArg('--phase1') || 'gemini'
const enrichment = getArg('--enrichment') || 'groq'
const lazy = args.includes('--no-lazy') ? false : true
const groundTruthPath = getArg('--ground-truth')
const runs = parseInt(getArg('--runs') || '1', 10)
const outputPath = getArg('--output')

// Set env vars before importing providers
process.env.SCAN_PHASE1_PROVIDER = phase1
process.env.SCAN_ENRICHMENT_PROVIDER = enrichment
process.env.SCAN_LAZY_ENRICHMENT = lazy ? 'true' : 'false'

async function main() {
  // Dynamic import after env vars are set
  const { scanMenu } = await import('../src/lib/openai')
  const { DEFAULT_PREFERENCES } = await import('../src/lib/types')

  // Read image
  const absPath = path.resolve(imagePath!)
  if (!fs.existsSync(absPath)) {
    console.error(`Image not found: ${absPath}`)
    process.exit(1)
  }
  const imageBuffer = fs.readFileSync(absPath)
  const ext = path.extname(absPath).slice(1) || 'jpeg'
  const base64 = `data:image/${ext};base64,${imageBuffer.toString('base64')}`

  // Load ground truth if provided
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let groundTruth: any = null
  if (groundTruthPath) {
    groundTruth = JSON.parse(fs.readFileSync(path.resolve(groundTruthPath), 'utf-8'))
  }

  console.log(`\n=== Benchmark Configuration ===`)
  console.log(`Image: ${absPath}`)
  console.log(`Phase 1: ${phase1}`)
  console.log(`Enrichment: ${enrichment}`)
  console.log(`Lazy: ${lazy}`)
  console.log(`Runs: ${runs}`)
  console.log(`Ground truth: ${groundTruthPath || 'none'}`)
  console.log()

  const allResults = []

  for (let run = 0; run < runs; run++) {
    if (runs > 1) console.log(`--- Run ${run + 1}/${runs} ---`)

    const t0 = Date.now()
    const dishes = await scanMenu(base64, DEFAULT_PREFERENCES)
    const totalMs = Date.now() - t0

    const result = {
      run: run + 1,
      phase1Provider: phase1,
      enrichmentProvider: enrichment,
      lazy,
      dishCount: dishes.length,
      totalMs,
      dishes: dishes.map((d) => ({ id: d.id, nameEnglish: d.nameEnglish, nameLocal: d.nameLocal, price: d.price })),
      accuracy: null as null | { dishCountDelta: number; nameMatches: number; priceMatches: number; total: number },
    }

    // Accuracy check
    if (groundTruth) {
      const gtDishes = groundTruth.dishes || groundTruth
      const gtNames = gtDishes.map((d: { nameEnglish: string }) => d.nameEnglish.toLowerCase())
      let nameMatches = 0
      let priceMatches = 0
      for (const dish of dishes) {
        const name = dish.nameEnglish.toLowerCase()
        // Fuzzy: check if any GT name contains this or vice versa
        const match = gtNames.find((gt: string) => gt.includes(name) || name.includes(gt))
        if (match) {
          nameMatches++
          const gtDish = gtDishes.find((d: { nameEnglish: string }) => d.nameEnglish.toLowerCase() === match)
          if (gtDish && gtDish.price === dish.price) priceMatches++
        }
      }
      result.accuracy = {
        dishCountDelta: dishes.length - gtDishes.length,
        nameMatches,
        priceMatches,
        total: gtDishes.length,
      }
    }

    allResults.push(result)

    console.log(`  Dishes: ${result.dishCount}`)
    console.log(`  Total:  ${result.totalMs}ms`)
    if (result.accuracy) {
      console.log(`  Accuracy: ${result.accuracy.nameMatches}/${result.accuracy.total} names, ${result.accuracy.priceMatches}/${result.accuracy.total} prices, delta=${result.accuracy.dishCountDelta}`)
    }
    console.log()
  }

  // Summary
  if (runs > 1) {
    const avgMs = Math.round(allResults.reduce((s, r) => s + r.totalMs, 0) / runs)
    const avgDishes = Math.round(allResults.reduce((s, r) => s + r.dishCount, 0) / runs)
    console.log(`=== Summary (${runs} runs) ===`)
    console.log(`  Avg total: ${avgMs}ms`)
    console.log(`  Avg dishes: ${avgDishes}`)
  }

  // Save output
  const outPath = outputPath || `scripts/benchmark-results/${Date.now()}.json`
  const outDir = path.dirname(path.resolve(outPath))
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.resolve(outPath), JSON.stringify({ config: { phase1, enrichment, lazy, runs, image: absPath }, results: allResults }, null, 2))
  console.log(`Results saved to ${outPath}`)
}

main().catch((err) => {
  console.error('Benchmark failed:', err)
  process.exit(1)
})
