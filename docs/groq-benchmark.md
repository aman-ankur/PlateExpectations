# Groq Integration — Benchmark & Testing

## Summary

Replaced GPT-4o-mini with Groq (Llama 3.3 70B) for Phase 1 text parsing. OCR stays on Google Cloud Vision. **12x faster** parsing with identical accuracy.

## Benchmark Results (korean.jpg, 17 dishes)

| Metric | GPT-4o-mini | Groq Llama 3.3 70B |
|--------|------------|-------------------|
| Dishes found | 17 | 17 |
| Parse time | ~20-24s | **~1.7-1.9s** |
| Speedup | — | **12.4x** |
| Korean script (nameLocal) | ✅ | ✅ (with explicit prompt) |
| Prices correct | ✅ all match | ✅ all match |
| English names match | 17/17 | 17/17 |
| Exact field match | — | 15/17 (2 differ: Japanese vs Korean script for udon/ramen) |

### Phase 1 total time

| Step | Before | After |
|------|--------|-------|
| Cloud Vision OCR | ~4s | ~4s |
| Text parsing | ~20s (GPT) | ~2s (Groq) |
| **Total Phase 1** | **~24s** | **~6s** |

## Known Llama Quirks

- **Empty `nameLocal`**: Llama 3.3 sometimes returns empty strings for non-Latin script fields in JSON output. Fixed by:
  1. Updated prompt to explicitly say "infer the native script from the dish name and country"
  2. `backfillNameLocal()` function recovers from OCR text as safety net
- **Japanese vs Korean**: For dishes like udon/ramen, Llama uses Korean script (야키우동) while GPT uses Japanese (焼きうどん). Both are valid — the menu is at a Korean restaurant.

## Fallback Chain

```
Cloud Vision OCR → Groq text parse (fast path, ~6s)
       ↓ (if Groq fails or no GROQ_API_KEY)
Cloud Vision OCR → GPT-4o-mini text parse (~24s)
       ↓ (if OCR fails or 0 dishes)
GPT-4o-mini Vision (direct image → dishes)
```

## How to Re-run This Benchmark

### Prerequisites
- `.env.local` must have: `OPENAI_API_KEY`, `GROQ_API_KEY`, `GOOGLE_CLOUD_VISION_API_KEY`
- Test image: any menu photo (e.g., `/Users/aankur/Downloads/menuapp/korean.jpg`)

### Run comparison script
```bash
# Load env vars and run
set -a && source .env.local && set +a && npx tsx scripts/compare-parsers.ts /path/to/menu.jpg
```

### What the script does
1. Runs Cloud Vision OCR once on the image
2. Sends the same OCR text to **both** GPT-4o-mini and Groq Llama 3.3 70B in parallel
3. Prints a side-by-side table comparing: dish count, English names, local script, prices
4. Reports exact matches, mismatches, and speed difference

### Test images used
- `korean.jpg` — Korean restaurant menu, 17 dishes, English text with prices

## Cost Comparison

| Provider | Model | Cost per menu (~768 output tokens) |
|----------|-------|------------------------------------|
| OpenAI | GPT-4o-mini | ~$0.002 |
| Groq | Llama 3.3 70B | ~$0.0006 |

Groq free tier: 6,000 requests/day, 6,000 tokens/minute.

## Phase 2: Enrichment Benchmark (korean.jpg, 3-dish batch)

| Metric | GPT-4o-mini | Groq Llama 3.3 70B |
|--------|------------|-------------------|
| Time per batch | ~21s | **~2.6s** |
| Speedup | — | **8.3x** |
| Field completeness | 3/3 all fields | 3/3 all fields |
| Dietary type accuracy | Missed egg in pajeon (called "veg") | Correctly flagged egg ("non-veg") |
| Cultural terms | None returned | Useful terms (Banchan, Kimchi, Haemul) |
| Ingredients | 5 per dish | 4 per dish |
| Explanation quality | Good Indian analogies | Good Indian analogies |

### Full pipeline time (17 dishes)

| Phase | Before (all GPT) | After (Groq) |
|-------|-----------------|--------------|
| Phase 1 (OCR + parse) | ~24s | ~6s |
| Phase 2 (enrichment) | ~15-20s | ~3-5s |
| **Total** | **~35-44s** | **~11s** |

### Key finding
Groq is **more accurate** on dietary classification — correctly identifies egg in Korean pancakes (pajeon), which GPT misses. Critical for Indian vegetarian travelers. Cultural terms also richer.

## Files Changed

- `src/lib/openai.ts` — added `groqCall()`, `backfillNameLocal()`, updated `extractDishesFromText()`, Groq-first `enrichBatchOnce()`
- `scripts/compare-parsers.ts` — benchmark script with `--enrich` flag for Phase 2 comparison
- `tsconfig.json` — excluded `scripts/` from build
