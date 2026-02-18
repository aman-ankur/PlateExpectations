/**
 * Compare Groq vs GPT text parsing accuracy on the same OCR input.
 * Usage: npx tsx scripts/compare-parsers.ts /path/to/menu.jpg
 */
import { extractTextFromImage } from '../src/lib/ocr'
import * as fs from 'fs'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!
const GROQ_API_KEY = process.env.GROQ_API_KEY!

const SYSTEM_PROMPT = `You are given OCR text from a restaurant menu. Extract EVERY dish/item. Do NOT skip any items. Include all sections, categories, and variations. Return JSON: {"dishes":[{"id":"dish-1","nameEnglish":"...","nameLocal":"original script in native characters (e.g. 김치전, ผัดไทย). If the menu is only in English, infer the native script from the dish name and country.","price":"...","brief":"3 word description","country":"Korea|Thailand|Vietnam|Japan|Indonesia"}]}. Number IDs sequentially. Minimal output but complete coverage.`

async function callGPT(ocrText: string) {
  const t = Date.now()
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Extract ALL dishes from this menu text:\n\n${ocrText}` },
      ],
      max_tokens: 4096,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  })
  const data = await res.json()
  const ms = Date.now() - t
  return { dishes: JSON.parse(data.choices[0].message.content).dishes || [], ms }
}

async function callGroq(ocrText: string) {
  const t = Date.now()
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Extract ALL dishes from this menu text:\n\n${ocrText}` },
      ],
      max_tokens: 4096,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  })
  const data = await res.json()
  const ms = Date.now() - t
  return { dishes: JSON.parse(data.choices[0].message.content).dishes || [], ms }
}

async function main() {
  const imagePath = process.argv[2]
  if (!imagePath) {
    console.error('Usage: npx tsx scripts/compare-parsers.ts /path/to/menu.jpg')
    process.exit(1)
  }

  // Step 1: OCR
  const raw = fs.readFileSync(imagePath)
  const base64 = `data:image/jpeg;base64,${raw.toString('base64')}`
  console.log('Running Cloud Vision OCR...')
  const ocrText = await extractTextFromImage(base64)
  console.log(`OCR: ${ocrText.length} chars`)
  console.log('\n--- OCR text ---')
  console.log(ocrText)
  console.log('--- end OCR ---\n')

  // Step 2: Parse with both
  console.log('Parsing with GPT-4o-mini and Groq llama-3.3-70b in parallel...\n')
  const [gpt, groq] = await Promise.all([callGPT(ocrText), callGroq(ocrText)])

  // Step 3: Compare
  console.log(`=== GPT-4o-mini: ${gpt.dishes.length} dishes in ${gpt.ms}ms ===`)
  console.log(`=== Groq Llama:  ${groq.dishes.length} dishes in ${groq.ms}ms ===\n`)

  // Build lookup by nameLocal for matching
  const gptByLocal = new Map(gpt.dishes.map((d: any) => [d.nameLocal, d]))
  const groqByLocal = new Map(groq.dishes.map((d: any) => [d.nameLocal, d]))

  console.log('\n--- Groq raw JSON sample ---')
  console.log(JSON.stringify(groq.dishes.slice(0, 3), null, 2))

  // Backfill nameLocal from OCR text (same logic as production)
  for (const dish of groq.dishes) {
    if (dish.nameLocal && dish.nameLocal.trim()) continue
    const engLower = dish.nameEnglish.toLowerCase().replace(/\s+/g, '')
    for (const line of ocrText.split('\n')) {
      const lineNonLatin = line.match(/[^\x00-\x7F\s]+(?:\s*[^\x00-\x7F\s]+)*/g)
      if (!lineNonLatin) continue
      const hasPrice = dish.price && line.includes(dish.price)
      const lineLatinLower = line.replace(/[^\x00-\x7F]/g, '').toLowerCase().replace(/\s+/g, '')
      const hasEngMatch = engLower.length > 3 && lineLatinLower.includes(engLower)
      if (hasPrice || hasEngMatch) {
        dish.nameLocal = lineNonLatin.join(' ')
        break
      }
    }
  }

  console.log('\n--- Groq after backfill ---')
  for (const d of groq.dishes) console.log(`  ${d.id}: ${d.nameLocal || '(empty)'} → ${d.nameEnglish} (${d.price})`)
  console.log('')

  // Dump raw for comparison
  console.log('--- GPT dishes ---')
  for (const d of gpt.dishes) console.log(`  ${d.id}: ${d.nameLocal} → ${d.nameEnglish} (${d.price})`)
  console.log('\n--- Groq dishes ---')
  for (const d of groq.dishes) console.log(`  ${d.id}: ${d.nameLocal} → ${d.nameEnglish} (${d.price})`)
  console.log('')

  // Table header
  console.log('| # | nameLocal | GPT nameEnglish | Groq nameEnglish | GPT price | Groq price | Match |')
  console.log('|---|-----------|-----------------|------------------|-----------|------------|-------|')

  const allLocals = new Set([...gptByLocal.keys(), ...groqByLocal.keys()])
  let matchCount = 0
  let i = 0
  for (const local of allLocals) {
    i++
    const g = gptByLocal.get(local)
    const q = groqByLocal.get(local)
    const nameMatch = g && q && g.nameEnglish.toLowerCase() === q.nameEnglish.toLowerCase()
    const priceMatch = g && q && g.price === q.price
    const match = nameMatch && priceMatch ? '✅' : g && q ? '⚠️' : '❌'
    if (nameMatch && priceMatch) matchCount++
    console.log(`| ${i} | ${local || '-'} | ${g?.nameEnglish || 'MISSING'} | ${q?.nameEnglish || 'MISSING'} | ${g?.price || '-'} | ${q?.price || '-'} | ${match} |`)
  }

  console.log(`\nExact matches: ${matchCount}/${allLocals.size}`)
  console.log(`GPT-only: ${gpt.dishes.filter((d: any) => !groqByLocal.has(d.nameLocal)).length}`)
  console.log(`Groq-only: ${groq.dishes.filter((d: any) => !gptByLocal.has(d.nameLocal)).length}`)
  console.log(`\nSpeed: Groq ${(gpt.ms / groq.ms).toFixed(1)}x faster than GPT`)
}

main().catch(console.error)
