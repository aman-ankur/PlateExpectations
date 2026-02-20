# Changelog 14 — Client-Side Cuisine Cache Integration

## What Changed

Integrated the offline cuisine cache (125 pre-generated dishes across 5 Asian cuisines) into the scan pipeline for instant dish enrichment.

### New Files
- `src/lib/cuisine-cache.ts` — IndexedDB-backed cache layer with fuzzy matching
- `public/cache/_manifest.json` — Cache metadata for 5 cuisines

### Modified Files
- `src/app/results/page.tsx` — Phase 1 handler now checks offline cache before LLM enrichment

## How It Works

1. **Phase 1** arrives from scan (dish names, prices, country)
2. `matchFromCache()` detects cuisine from country fields
3. Loads cached dish data (IndexedDB first, then `/cache/{cuisine}.json` via CDN)
4. Fuzzy-matches Phase 1 names against cache using 4-pass strategy:
   - Exact match on `matchKeys` (pre-computed normalized variants)
   - Exact match on `nameEnglish`/`nameLocal`/`nameRomanized`
   - Contains match (substring in either direction)
   - Local script substring match (Korean/Thai/Vietnamese characters)
5. Cache hits are injected as fully enriched dishes with pre-verified Wikipedia images
6. Cache misses go through normal LLM enrichment pipeline (no change)
7. If LLM later returns a dish that cache already provided, LLM version overwrites (merge by ID)

### Non-Breaking Design
- Cache is purely additive — zero changes to scan API, LLM pipeline, or demo mode
- If IndexedDB is unavailable or cache fetch fails, falls back silently to full LLM enrichment
- Cache data stored in IndexedDB with 7-day TTL, refreshed from CDN
- Bundle impact: +0.23KB on results page (cuisine-cache.ts is tree-shaken)

### Image Handling
- Cache hits set dish images directly from pre-verified Wikipedia URLs
- No `/api/dish-image` calls needed for cache hits (saves ~25 API calls per cached menu)
- 122/125 dishes have verified image URLs; 3 dishes (Tamagoyaki, Tod Mun Pla, Kai Jeow) fall back to runtime image search
