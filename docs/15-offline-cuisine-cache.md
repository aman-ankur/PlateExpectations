# 13 — Offline Cuisine Cache: Architecture & Implementation Plan

## Overview

Pre-package enrichment data + verified image URLs for the top 25 dishes per cuisine (10 cuisines = 250 dishes). Cache hits skip LLM enrichment entirely — instant results for known dishes. Images are fetched on first use and cached in IndexedDB for offline access.

## Architecture

```
BUILD TIME (one-time generation script)
┌─────────────────────────────────────────────────────────────┐
│  scripts/generate-cuisine-cache.ts                          │
│                                                             │
│  For each cuisine (10):                                     │
│    1. Define top 25 dishes (name, local name)               │
│    2. Call Claude Sonnet to generate full Dish enrichment    │
│    3. Search Wikipedia + Commons for image candidates        │
│    4. Call Claude Sonnet Vision to verify each image         │
│    5. Write verified data to public/cache/{cuisine}.json    │
│    6. Generate verification report                          │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
STATIC FILES (deployed to Vercel CDN)
┌─────────────────────────────────────────────────────────────┐
│  public/cache/                                              │
│    korean.json      (~50KB, 25 dishes + image URLs)         │
│    japanese.json                                            │
│    chinese.json                                             │
│    thai.json                                                │
│    vietnamese.json                                          │
│    french.json                                              │
│    italian.json                                             │
│    spanish.json                                             │
│    german.json                                              │
│    greek.json                                               │
│    _manifest.json   (version, last updated, dish counts)    │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
RUNTIME (client-side cache layer)
┌─────────────────────────────────────────────────────────────┐
│  src/lib/cuisine-cache.ts                                   │
│                                                             │
│  1. Phase 1 detects cuisine (e.g. "Korea")                  │
│  2. Check IndexedDB for cached cuisine data                 │
│     - HIT: use local data (works offline)                   │
│     - MISS: fetch /cache/korean.json from CDN               │
│             store in IndexedDB for next time                 │
│  3. Phase 2: match OCR dish names against cache             │
│     - fuzzy match on nameLocal + nameEnglish                │
│     - cache HIT → return enrichment instantly (0ms)         │
│     - cache MISS → normal LLM enrichment (3-5s)            │
│  4. Images: cache URLs point to Wikipedia/Commons           │
│     - first load fetches from source, browser caches        │
│     - IndexedDB stores image blobs for true offline         │
└─────────────────────────────────────────────────────────────┘
```

## Cache JSON Schema

Each `public/cache/{cuisine}.json`:

```typescript
interface CuisineCache {
  version: number              // Increment on updates
  cuisine: string              // "Korean", "Japanese", etc.
  country: string              // "Korea", "Japan", etc.
  generatedAt: string          // ISO date
  dishes: CachedDish[]
}

interface CachedDish {
  // Matches the existing Dish type exactly — drop-in replacement
  id: string                   // e.g. "cache-korean-1"
  nameEnglish: string
  nameLocal: string
  nameLocalCorrected?: string
  nameRomanized?: string
  description: string
  country: string
  price: string                // Empty string — price comes from OCR, not cache
  dietaryType: 'veg' | 'non-veg' | 'jain-safe'
  allergens: string[]
  ingredients: Ingredient[]
  nutrition: { protein: number; carbs: number; fat: number; fiber: number; kcal: number }
  explanation: string
  culturalTerms: CulturalTerm[]
  imageSearchQuery: string
  // Image data (pre-verified)
  imageUrl: string             // Primary verified image URL
  imageUrls: string[]          // Up to 3 verified URLs
  imageSource: string          // "wikipedia" | "commons" | "unsplash"
  imageVerified: boolean       // true if Claude Vision confirmed
  // Matching keys (for fuzzy match during scan)
  matchKeys: string[]          // normalized variants: ["bibimbap", "비빔밥", "비빔밥"]
}
```

## Fuzzy Matching Strategy

When Phase 1 returns a dish name from OCR, match against cache:

```
1. Exact match: nameLocal === ocrNameLocal (fastest, most reliable)
2. Exact match: nameEnglish.toLowerCase() === ocrNameEnglish.toLowerCase()
3. Normalized match: strip diacritics, lowercase, trim whitespace
4. Contains match: cache nameLocal contained in OCR text (handles "비빔밥 (9,000원)")
5. Levenshtein distance ≤ 2 on nameEnglish (handles OCR typos: "Bibimbap" vs "Bibimbab")
```

Match threshold: require score ≥ 0.8 on normalized comparison. If ambiguous (multiple matches), fall through to LLM enrichment — better to be slow than wrong.

## IndexedDB Schema

```
Database: "plateExpectations"
  Store: "cuisineCache"
    Key: cuisine slug ("korean", "japanese", ...)
    Value: { version, data: CuisineCache, fetchedAt: timestamp }

  Store: "dishImageBlobs"
    Key: image URL hash
    Value: { blob: Blob, url: string, cachedAt: timestamp }
```

Using `idb` library (1.2KB gzipped) for async IndexedDB wrapper.

## Integration with Existing Scan Pipeline

### Modified flow in `src/app/api/scan/route.ts`:

```
Phase 1 (unchanged): OCR → parse → RawDish[]
    │
    ▼
Phase 2 (modified):
    ├── For each RawDish, check cuisine cache (client-side)
    │     ├── CACHE HIT → emit as enriched Dish immediately
    │     └── CACHE MISS → add to LLM enrichment batch
    │
    ├── LLM enrichment only runs for cache misses
    │     └── Batches of 3 → Groq/GPT-4o-mini (existing logic)
    │
    └── emit batch events as before
```

Key decision: **Cache lookup happens client-side**, not server-side. Reasons:
- IndexedDB is client-side only
- Avoids adding the cache data to the API route's memory
- Client can show cached dishes instantly while waiting for server to enrich the rest
- Works offline for fully-cached menus

### Modified flow in results page:

```
1. Phase 1 arrives with RawDish[]
2. Client checks IndexedDB for cuisine cache
3. For each RawDish:
   a. Try fuzzy match against cache
   b. HIT → immediately render as full Dish card (no skeleton)
   c. MISS → show skeleton, wait for server enrichment
4. Server enrichment batches fill in the remaining dishes
5. On "done" event, rank all dishes (cached + enriched)
```

## Image Strategy: Hybrid CDN + IndexedDB

**Build time:**
- For each dish, find 1-3 verified image URLs from Wikipedia/Commons
- Store only the URLs in the cache JSON (not the images themselves)
- URLs point to Wikimedia CDN — reliable, fast, free

**Runtime (first visit):**
- Browser fetches images from Wikimedia URLs (normal `<img src>`)
- Service worker (if PWA enabled) caches image responses
- Additionally: store image blob in IndexedDB for true offline

**Runtime (repeat visit / offline):**
- Check IndexedDB for cached blob → use `URL.createObjectURL(blob)`
- Fallback to network fetch → Wikimedia CDN

**Bundle impact: ~0 bytes for images.** Only JSON data is in the bundle (~50KB per cuisine, ~500KB total for 10 cuisines). Images are fetched on demand.

## Cache Generation Script

### `scripts/generate-cuisine-cache.ts`

Run with: `npx tsx scripts/generate-cuisine-cache.ts`

**Requirements:**
- `ANTHROPIC_API_KEY` env var (Claude Sonnet for enrichment + Vision verification)
- No other API keys needed (Wikipedia/Commons are free, no auth)

**Steps per cuisine:**
1. Define top 25 dishes with English name, local script name, romanized name
2. Call Claude Sonnet in batches of 5 to generate full enrichment (matching Dish schema)
3. For each dish, search Wikipedia (pageimages API) + Commons for image candidates
4. For each candidate, call Claude Sonnet with the image URL: "Is this a photo of {dish}? YES/NO"
5. Store first verified image URL. Flag dishes with no verified image.
6. Write `public/cache/{cuisine}.json`
7. Write `scripts/cache-report.md` with verification results

**Estimated costs:**
- Claude Sonnet enrichment: 25 dishes × 10 cuisines × ~500 tokens = ~125K tokens = ~$0.75
- Claude Sonnet Vision verification: ~750 image checks × ~$0.003 = ~$2.25
- **Total: ~$3 for all 10 cuisines**

## 10 Cuisines × 25 Dishes

See `scripts/cuisine-dishes.ts` for the full list. Cuisines:

1. **Korean** — Bibimbap, Kimchi Jjigae, Bulgogi, Japchae, Tteokbokki, ...
2. **Japanese** — Ramen, Sushi, Tempura, Tonkatsu, Okonomiyaki, ...
3. **Chinese** — Kung Pao Chicken, Mapo Tofu, Xiaolongbao, Peking Duck, ...
4. **Thai** — Pad Thai, Green Curry, Tom Yum, Som Tum, Massaman Curry, ...
5. **Vietnamese** — Pho, Banh Mi, Bun Cha, Goi Cuon, Com Tam, ...
6. **French** — Coq au Vin, Croque Monsieur, Bouillabaisse, Ratatouille, ...
7. **Italian** — Margherita Pizza, Carbonara, Osso Buco, Risotto, Tiramisu, ...
8. **Spanish** — Paella, Patatas Bravas, Gazpacho, Tortilla Espanola, ...
9. **German** — Schnitzel, Bratwurst, Currywurst, Sauerbraten, Kartoffelpuffer, ...
10. **Greek** — Moussaka, Souvlaki, Spanakopita, Gyros, Baklava, ...

## Cons & Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Wikimedia image URLs can change/break | Medium | Periodic re-validation script. Version field triggers refresh. |
| Stale enrichment data (nutrition, allergens) | Low | LLM data is approximate anyway. Quarterly regeneration. |
| Fuzzy match picks wrong cached dish | Medium | High threshold (0.8). Ambiguous matches fall through to LLM. |
| IndexedDB storage limits | Low | ~500KB for 10 cuisines. Well within browser limits. |
| Bundle size increase | Low | ~500KB total JSON. Gzips to ~100KB. Negligible. |
| Cache doesn't cover the dish (uncommon menu) | Expected | Graceful fallback — LLM enrichment runs as before. Cache is additive. |
| Image not available offline on first visit | Expected | Images load from CDN first time, cached in IndexedDB after. Enrichment text is instant regardless. |

## File Changes

### New files:
- `scripts/generate-cuisine-cache.ts` — cache generation script
- `scripts/cuisine-dishes.ts` — dish lists for all 10 cuisines
- `scripts/cache-report.md` — generated verification report
- `public/cache/{cuisine}.json` × 10 — cached enrichment data
- `public/cache/_manifest.json` — version and metadata
- `src/lib/cuisine-cache.ts` — client-side cache lookup + IndexedDB layer

### Modified files:
- `src/app/results/page.tsx` — check cache before showing skeletons
- `src/lib/store.ts` — add cuisine cache state + actions
- `package.json` — add `idb` dependency, `generate-cache` script

## Implementation Order

1. Write cuisine dish lists (`scripts/cuisine-dishes.ts`)
2. Build generation script with Claude enrichment + image search + Vision verification
3. Run generation, review report, fix any issues
4. Build client-side `cuisine-cache.ts` with IndexedDB
5. Integrate into results page (cache hit → instant card, miss → skeleton)
6. Test with demo mode + real scan
7. Deploy, verify CDN serving of cache files
