# 17 — Gemini Flash + Lazy Enrichment

## What Changed

Two performance improvements to the scan pipeline, plus a provider abstraction to make the system configurable.

### 1. Provider Abstraction (`src/lib/providers/`)

The scan pipeline is now built on pluggable providers, selected via environment variables:

| Env Var | Values | Default |
|---------|--------|---------|
| `SCAN_PHASE1_PROVIDER` | `gemini`, `cloud-vision-groq`, `gpt-vision` | `cloud-vision-groq` |
| `SCAN_ENRICHMENT_PROVIDER` | `groq`, `gpt` | `groq` |
| `SCAN_LAZY_ENRICHMENT` | `true`, `false` | `true` |
| `GEMINI_API_KEY` | API key | Required for `gemini` provider |

**Phase 1 providers** handle dish extraction from the menu image:
- **`gemini`** — Single Gemini 2.0 Flash vision call. No separate OCR step, no diacritic corruption. Fastest option.
- **`cloud-vision-groq`** — Google Cloud Vision OCR → Groq Llama 3.3 70B text parsing. The previous default.
- **`gpt-vision`** — GPT-4o-mini Vision fallback. Slowest but most reliable.

**Enrichment providers** handle dish enrichment (dietary info, allergens, descriptions, etc.):
- **`groq`** — Groq Llama 3.3 70B. Fast (~400-500 tok/s). Falls back to GPT on failure.
- **`gpt`** — GPT-4o-mini only. Slower but more reliable.

If the primary Phase 1 provider fails, the pipeline automatically falls back to `gpt-vision`.

### 2. Gemini 2.0 Flash (`src/lib/providers/gemini-flash.ts`)

Replaces the two-step Cloud Vision OCR + Groq text parsing with a single Gemini vision call:
- Sends the image as `inlineData` with `responseMimeType: 'application/json'` for structured output
- No diacritic corruption (Cloud Vision garbles Vietnamese/Thai marks)
- Potentially faster since it's a single API call instead of two sequential ones

### 3. Lazy Enrichment (Tier 1 / Tier 2 Split)

When `SCAN_LAZY_ENRICHMENT=true` (default), enrichment is split into two tiers:

**Tier 1 (card data — during scan):**
- `dietaryType`, `allergens`, `description` (1 sentence), `imageSearchQuery`, `rankScore`, `nameLocalCorrected`
- ~50% fewer output tokens → faster batches
- Tier 2 fields get empty defaults: `ingredients: []`, `nutrition: {protein:0,...}`, `explanation: ''`, `culturalTerms: []`

**Tier 2 (detail data — on-demand):**
- `ingredients[]`, `nutrition{}`, `explanation`, `culturalTerms[]`
- Fetched when user taps into a dish detail page
- Endpoint: `POST /api/enrich-detail`
- Shimmer loading states shown while fetching

The Dish type is unchanged — Tier 1 dishes are valid Dish objects with empty Tier 2 fields.

### 4. Benchmark Script

```bash
npx tsx scripts/benchmark.ts <image> [options]
  --phase1 gemini|cloud-vision-groq|gpt-vision
  --enrichment groq|gpt
  --lazy / --no-lazy
  --ground-truth <path.json>
  --runs <N>
  --output <path.json>
```

Results saved to `scripts/benchmark-results/`.

## Benchmark Results

Tested on `korean.jpg` (17 dishes), Cloud Vision + Groq enrichment pipeline:

| Configuration | Dishes | Phase 1 | Phase 2 | Total |
|---|---|---|---|---|
| Cloud Vision+Groq, full enrichment | 17 | 7.3s | 3.4s | **10.7s** |
| Cloud Vision+Groq, lazy (Tier 1 only) | 17 | 6.2s | 1.2s | **7.4s** |

**Lazy enrichment alone cuts total pipeline time by 31%** — Phase 2 drops from 3.4s to 1.2s (~65% fewer output tokens). Phase 1 is unchanged since it uses the same Cloud Vision + Groq path.

Token output comparison per Groq enrichment batch:
- Full enrichment: ~4,300–6,300 chars per batch
- Tier 1 (card only): ~950–1,400 chars per batch

### Pending: Gemini 2.0 Flash

Gemini Flash replaces the two-step Phase 1 (Cloud Vision OCR ~4s + Groq text parse ~2s = ~6s) with a single vision call. Expected Phase 1 time: ~2-3s, bringing total pipeline to ~3-4s.

Not yet benchmarked — Gemini free tier quota was exhausted. To test:

```bash
npx tsx scripts/benchmark.ts /Users/aankur/Downloads/menuapp/korean.jpg \
  --phase1 gemini --lazy --runs 2 --output scripts/benchmark-results/gemini-lazy.json
```

Requires `GEMINI_API_KEY` with billing enabled (free tier has aggressive daily limits).

## Files Changed

| File | Change |
|------|--------|
| `src/lib/providers/types.ts` | New — provider interfaces |
| `src/lib/providers/shared.ts` | New — extracted shared utilities |
| `src/lib/providers/cloud-vision-groq.ts` | New — Cloud Vision + Groq provider |
| `src/lib/providers/gpt-vision.ts` | New — GPT Vision provider |
| `src/lib/providers/gemini-flash.ts` | New — Gemini 2.0 Flash provider |
| `src/lib/providers/groq-enrichment.ts` | New — Groq enrichment + Tier 1/2 |
| `src/lib/providers/gpt-enrichment.ts` | New — GPT enrichment + Tier 1/2 |
| `src/lib/providers/registry.ts` | New — provider selection by env var |
| `src/lib/providers/index.ts` | New — barrel exports |
| `src/lib/openai.ts` | Refactored — thin orchestrator using providers |
| `src/app/api/enrich-detail/route.ts` | New — Tier 2 detail enrichment endpoint |
| `src/lib/store.ts` | Added `mergeDishDetail()` action |
| `src/app/dish/[id]/page.tsx` | Added lazy Tier 2 loading + shimmer states |
| `scripts/benchmark.ts` | New — pipeline benchmark script |
