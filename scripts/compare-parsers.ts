/**
 * Compare Groq vs GPT text parsing AND enrichment accuracy.
 *
 * Usage:
 *   npx tsx scripts/compare-parsers.ts /path/to/menu.jpg           # Phase 1 only
 *   npx tsx scripts/compare-parsers.ts /path/to/menu.jpg --enrich  # Phase 1 + Phase 2 enrichment
 */
import { extractTextFromImage } from '../src/lib/ocr'
import * as fs from 'fs'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!
const GROQ_API_KEY = process.env.GROQ_API_KEY!

const SYSTEM_PROMPT = `You are given OCR text from a restaurant menu. Extract EVERY dish/item. Do NOT skip any items. Include all sections, categories, and variations. Return JSON: {"dishes":[{"id":"dish-1","nameEnglish":"...","nameLocal":"original script in native characters (e.g. 김치전, ผัดไทย). If the menu is only in English, infer the native script from the dish name and country.","price":"...","brief":"3 word description","country":"Korea|Thailand|Vietnam|Japan|Indonesia"}]}. Number IDs sequentially. Minimal output but complete coverage.`

function buildEnrichPrompt(dishes: any[], country: string) {
  const dishList = dishes
    .map((d: any) => `${d.id}: ${d.nameEnglish} (${d.nameLocal}) - ${d.price} - ${d.brief}`)
    .join('\n')

  return {
    system: `You enrich ${country} restaurant dishes for Indian travelers.

For each dish return ALL these fields:
- "id": keep the original id
- "nameEnglish": English name
- "nameLocal": original script
- "description": 1-2 sentences describing the dish — what it looks like, key ingredients, cooking method, and how it tastes
- "country": "${country}"
- "price": as given
- "dietaryType": "veg" (no meat/fish/eggs), "non-veg", or "jain-safe"
- "allergens": from [egg, soy, sesame, peanut, shellfish, gluten, dairy] — only those present
- "ingredients": [{"name":"...", "category":"protein|vegetable|sauce|carb|dairy|spice|other", "isUnfamiliar":true/false, "explanation":"brief if unfamiliar else empty"}] — top 4-5 ingredients
- "nutrition": {"protein":g, "carbs":g, "fat":g, "fiber":g, "kcal":num} — approximate
- "explanation": 2-3 sentences. First: describe what the dish actually is (cooking method, key flavors, how it's served/eaten). Second: compare to a well-known Indian or global dish if a good analogy exists (e.g. "Similar to tandoori chicken..." or "Think of it as a Korean version of biryani..."). Third (optional): a tip or recommendation (e.g. "Best enjoyed with steamed rice" or "Ask for extra sauce on the side").
- "culturalTerms": [{"term":"...", "explanation":"..."}] — 0-2 terms
- "imageSearchQuery": English query to find a photo (e.g. "Korean bibimbap rice bowl")
- "rankScore": 0-30 popularity score

Return JSON: {"dishes": [<array>]}. Be concise.`,
    user: `Enrich these dishes:\n${dishList}`,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callGPT(messages: { role: string; content: string }[], maxTokens = 4096): Promise<{ content: any; ms: number }> {
  const t = Date.now()
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: maxTokens,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  })
  const data = await res.json()
  const ms = Date.now() - t
  const parsed = JSON.parse(data.choices[0].message.content)
  return { content: parsed, ms }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callGroq(messages: { role: string; content: string }[], maxTokens = 4096): Promise<{ content: any; ms: number }> {
  const t = Date.now()
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: maxTokens,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    console.error('Groq error:', JSON.stringify(data))
    throw new Error(`Groq API error: ${res.status}`)
  }
  const ms = Date.now() - t
  const parsed = JSON.parse(data.choices[0].message.content)
  return { content: parsed, ms }
}

// --- Phase 1 comparison (unchanged logic) ---
async function comparePhase1(ocrText: string) {
  console.log('=== PHASE 1: Parsing Comparison ===\n')
  console.log('Parsing with GPT-4o-mini and Groq llama-3.3-70b in parallel...\n')

  const msgs = (provider: string) => [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Extract ALL dishes from this menu text:\n\n${ocrText}` },
  ]

  const [gpt, groq] = await Promise.all([callGPT(msgs('gpt')), callGroq(msgs('groq'))])
  const gptDishes = gpt.content.dishes || []
  const groqDishes = groq.content.dishes || []

  console.log(`GPT-4o-mini: ${gptDishes.length} dishes in ${gpt.ms}ms`)
  console.log(`Groq Llama:  ${groqDishes.length} dishes in ${groq.ms}ms`)
  console.log(`Speed: Groq ${(gpt.ms / groq.ms).toFixed(1)}x faster\n`)

  // Backfill nameLocal for Groq
  for (const dish of groqDishes) {
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

  // Print comparison table
  const gptByEng = new Map(gptDishes.map((d: any) => [d.nameEnglish.toLowerCase(), d]))
  console.log('| # | Dish | GPT | Groq | Match |')
  console.log('|---|------|-----|------|-------|')
  for (let i = 0; i < Math.max(gptDishes.length, groqDishes.length); i++) {
    const g = gptDishes[i]
    const q = groqDishes[i]
    const match = g && q && g.nameEnglish.toLowerCase() === q.nameEnglish.toLowerCase() ? '✅' : '⚠️'
    console.log(`| ${i + 1} | ${g?.nameLocal || q?.nameLocal || '-'} | ${g?.nameEnglish || 'MISSING'} | ${q?.nameEnglish || 'MISSING'} | ${match} |`)
  }

  return { gptDishes, groqDishes }
}

// --- Phase 2 enrichment comparison ---
async function compareEnrichment(rawDishes: any[]) {
  console.log('\n\n=== PHASE 2: Enrichment Comparison ===\n')

  const country = rawDishes[0]?.country || 'Korea'
  // Take first 3 dishes as test batch
  const testBatch = rawDishes.slice(0, 3)
  console.log(`Testing enrichment on ${testBatch.length} dishes: ${testBatch.map((d: any) => d.nameEnglish).join(', ')}\n`)

  const prompt = buildEnrichPrompt(testBatch, country)
  const msgs = [
    { role: 'system', content: prompt.system },
    { role: 'user', content: prompt.user },
  ]

  const [gpt, groq] = await Promise.all([callGPT(msgs, 8192), callGroq(msgs, 8192)])
  const gptDishes = gpt.content.dishes || []
  const groqDishes = groq.content.dishes || []

  console.log(`GPT-4o-mini: ${gptDishes.length} dishes in ${gpt.ms}ms`)
  console.log(`Groq Llama:  ${groqDishes.length} dishes in ${groq.ms}ms`)
  console.log(`Speed: Groq ${(gpt.ms / groq.ms).toFixed(1)}x faster\n`)

  // --- Field completeness check ---
  const REQUIRED_FIELDS = ['id', 'nameEnglish', 'nameLocal', 'description', 'country', 'price', 'dietaryType', 'allergens', 'ingredients', 'nutrition', 'explanation', 'culturalTerms']

  console.log('--- Field Completeness ---')
  for (const provider of [{ name: 'GPT', dishes: gptDishes }, { name: 'Groq', dishes: groqDishes }]) {
    console.log(`\n${provider.name}:`)
    for (const dish of provider.dishes) {
      const missing = REQUIRED_FIELDS.filter(f => {
        const val = dish[f]
        if (val === undefined || val === null) return true
        if (typeof val === 'string' && val.trim() === '') return true
        return false
      })
      const ingredientCount = Array.isArray(dish.ingredients) ? dish.ingredients.length : 0
      console.log(`  ${dish.nameEnglish}: ${missing.length === 0 ? '✅ all fields' : `❌ missing: ${missing.join(', ')}`} | ${ingredientCount} ingredients`)
    }
  }

  // --- Accuracy deep dive: explanations, ingredients, cultural terms ---
  console.log('\n\n--- Explanation Quality (side-by-side) ---')
  for (let i = 0; i < testBatch.length; i++) {
    const g = gptDishes[i]
    const q = groqDishes.find((d: any) => d.id === testBatch[i].id) || groqDishes[i]
    if (!g && !q) continue

    const name = g?.nameEnglish || q?.nameEnglish || testBatch[i].nameEnglish
    console.log(`\n┌─ ${name} ─────────────────────────────`)
    console.log(`│ GPT explanation:`)
    console.log(`│   ${g?.explanation || '(empty)'}`)
    console.log(`│ Groq explanation:`)
    console.log(`│   ${q?.explanation || '(empty)'}`)
    console.log(`│`)
    console.log(`│ GPT description:`)
    console.log(`│   ${g?.description || '(empty)'}`)
    console.log(`│ Groq description:`)
    console.log(`│   ${q?.description || '(empty)'}`)
    console.log(`└──────────────────────────────────────`)
  }

  console.log('\n\n--- Ingredient Comparison ---')
  for (let i = 0; i < testBatch.length; i++) {
    const g = gptDishes[i]
    const q = groqDishes.find((d: any) => d.id === testBatch[i].id) || groqDishes[i]
    if (!g && !q) continue

    const name = g?.nameEnglish || q?.nameEnglish
    const gIngr = (g?.ingredients || []).map((x: any) => `${x.name} (${x.category})${x.isUnfamiliar ? ' [?]' : ''}`).join(', ')
    const qIngr = (q?.ingredients || []).map((x: any) => `${x.name} (${x.category})${x.isUnfamiliar ? ' [?]' : ''}`).join(', ')
    console.log(`\n${name}:`)
    console.log(`  GPT:  ${gIngr || '(empty)'}`)
    console.log(`  Groq: ${qIngr || '(empty)'}`)

    // Check unfamiliar ingredient explanations
    const gUnfamiliar = (g?.ingredients || []).filter((x: any) => x.isUnfamiliar)
    const qUnfamiliar = (q?.ingredients || []).filter((x: any) => x.isUnfamiliar)
    if (gUnfamiliar.length > 0 || qUnfamiliar.length > 0) {
      console.log(`  Unfamiliar ingredients:`)
      for (const ing of gUnfamiliar) console.log(`    GPT:  ${ing.name}: "${ing.explanation || '(no explanation)'}"`)
      for (const ing of qUnfamiliar) console.log(`    Groq: ${ing.name}: "${ing.explanation || '(no explanation)'}"`)
    }
  }

  console.log('\n\n--- Cultural Terms ---')
  for (let i = 0; i < testBatch.length; i++) {
    const g = gptDishes[i]
    const q = groqDishes.find((d: any) => d.id === testBatch[i].id) || groqDishes[i]
    if (!g && !q) continue

    const name = g?.nameEnglish || q?.nameEnglish
    const gTerms = (g?.culturalTerms || []).map((t: any) => `"${t.term}": ${t.explanation}`).join(' | ')
    const qTerms = (q?.culturalTerms || []).map((t: any) => `"${t.term}": ${t.explanation}`).join(' | ')
    console.log(`\n${name}:`)
    console.log(`  GPT:  ${gTerms || '(none)'}`)
    console.log(`  Groq: ${qTerms || '(none)'}`)
  }

  // --- Dietary accuracy check ---
  console.log('\n\n--- Dietary Type & Allergens ---')
  console.log('| Dish | GPT dietary | Groq dietary | GPT allergens | Groq allergens | Match |')
  console.log('|------|------------|-------------|--------------|----------------|-------|')
  for (let i = 0; i < testBatch.length; i++) {
    const g = gptDishes[i]
    const q = groqDishes.find((d: any) => d.id === testBatch[i].id) || groqDishes[i]
    if (!g && !q) continue
    const dietMatch = g?.dietaryType === q?.dietaryType ? '✅' : '❌'
    console.log(`| ${g?.nameEnglish || q?.nameEnglish} | ${g?.dietaryType || '-'} | ${q?.dietaryType || '-'} | ${(g?.allergens || []).join(', ') || 'none'} | ${(q?.allergens || []).join(', ') || 'none'} | ${dietMatch} |`)
  }

  // --- Nutrition comparison (approximate is fine) ---
  console.log('\n\n--- Nutrition (approximate, for reference only) ---')
  for (let i = 0; i < testBatch.length; i++) {
    const g = gptDishes[i]
    const q = groqDishes.find((d: any) => d.id === testBatch[i].id) || groqDishes[i]
    if (!g?.nutrition && !q?.nutrition) continue
    const name = g?.nameEnglish || q?.nameEnglish
    console.log(`${name}: GPT ${g?.nutrition?.kcal || '?'}kcal | Groq ${q?.nutrition?.kcal || '?'}kcal`)
  }

  // --- Summary ---
  console.log('\n\n=== ENRICHMENT SUMMARY ===')
  console.log(`Speed: GPT ${gpt.ms}ms vs Groq ${groq.ms}ms (${(gpt.ms / groq.ms).toFixed(1)}x faster)`)
  console.log(`Dishes returned: GPT ${gptDishes.length}/${testBatch.length} | Groq ${groqDishes.length}/${testBatch.length}`)

  const gptComplete = gptDishes.filter((d: any) => REQUIRED_FIELDS.every(f => d[f] !== undefined && d[f] !== null && d[f] !== '')).length
  const groqComplete = groqDishes.filter((d: any) => REQUIRED_FIELDS.every(f => d[f] !== undefined && d[f] !== null && d[f] !== '')).length
  console.log(`Field completeness: GPT ${gptComplete}/${gptDishes.length} | Groq ${groqComplete}/${groqDishes.length}`)

  const dietMatches = testBatch.filter((_, i) => {
    const g = gptDishes[i]
    const q = groqDishes.find((d: any) => d.id === testBatch[i].id) || groqDishes[i]
    return g?.dietaryType === q?.dietaryType
  }).length
  console.log(`Dietary type agreement: ${dietMatches}/${testBatch.length}`)

  console.log('\n⚡ Review the explanation and ingredient sections above to assess quality.')
  console.log('Key question: Are Groq explanations accurate, culturally nuanced, and complete?')
}

async function main() {
  const args = process.argv.slice(2)
  const imagePath = args.find(a => !a.startsWith('--'))
  const doEnrich = args.includes('--enrich')

  if (!imagePath) {
    console.error('Usage: npx tsx scripts/compare-parsers.ts /path/to/menu.jpg [--enrich]')
    process.exit(1)
  }

  // Step 1: OCR
  const raw = fs.readFileSync(imagePath)
  const base64 = `data:image/jpeg;base64,${raw.toString('base64')}`
  console.log('Running Cloud Vision OCR...')
  const ocrText = await extractTextFromImage(base64)
  console.log(`OCR: ${ocrText.length} chars\n`)

  // Step 2: Phase 1 comparison
  const { gptDishes } = await comparePhase1(ocrText)

  // Step 3: Phase 2 enrichment comparison
  if (doEnrich) {
    if (gptDishes.length === 0) {
      console.error('No dishes found in Phase 1, cannot run enrichment comparison')
      process.exit(1)
    }
    await compareEnrichment(gptDishes)
  } else {
    console.log('\nRun with --enrich flag to compare Phase 2 enrichment quality')
  }
}

main().catch(console.error)
