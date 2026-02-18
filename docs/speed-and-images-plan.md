# Feature: Speed & Images — Technical Plan

## Problem

1. **Speed**: Menu scan takes too long — generating structured JSON for 17 dishes is bottlenecked by OpenAI's output token speed (~40-50 tokens/sec)
2. **No dish images**: Detail view shows emoji placeholder — no real food photos
3. **Ingredient annotations**: Mockups show ingredient badges overlaid on dish photos

## Approach & Reasoning

### Phase A: Speed — Parallel Batch Pipeline

**Change**: Two-phase pipeline: fast Vision OCR → parallel enrichment batches.

**Key finding from benchmarking** (Feb 2026):

OpenAI token generation speed is the bottleneck, not network or image processing:
- Simple text call: ~0.4s
- Vision + short answer: ~3s
- 17 dishes × full schema JSON: ~55-90s (2000-3000 completion tokens at 40-50 tok/s)
- This is the same speed regardless of model (gpt-4o vs gpt-4o-mini)
- VPN adds ~50ms ping, not the issue

**Options benchmarked on Korean Kitchen menu (17 dishes):**

| Approach | Time | Why |
|----------|------|-----|
| Single merged call (all fields) | **90s** | ~3000 output tokens sequentially. Too slow. |
| Single merged call (lean fields) | **39s** | Still ~1300 tokens sequentially. |
| Structured Outputs (`json_schema`) | **158s** | Schema validation adds huge overhead with Vision. 10x slower. |
| `detail: "low"` | **19s** | Faster but misses 5/17 dishes. Quality unacceptable. |
| gpt-4o-mini only | **41s** | Same speed — bottleneck is output tokens, not model. |
| **Two-phase parallel (chosen)** | **~40-50s** | Phase 1: Vision OCR ~15s. Phase 2: 4 parallel batches of ~5 dishes, each ~15-20s, run concurrently. |

**Architecture:**
1. **Phase 1** — GPT-4o-mini Vision: Extract dish names, prices, local script, country (~15s, ~700 tokens)
2. **Phase 2** — GPT-4o-mini × N batches in parallel: Enrich with descriptions, allergens, nutrition, ingredients, explanations (~15-20s per batch, all concurrent)

**Files changed:**
- `src/lib/openai.ts` — `scanMenu()` → `extractDishes()` + `enrichInParallel()` + `enrichBatch()`
- `src/app/api/scan/route.ts` — logging update

### Phase B: Dish Images — Wikipedia Article Images

**Change**: Add image search pipeline triggered after results load. Non-blocking (results show immediately, images lazy-load).

**Image search strategy (evolved through testing):**

| Approach | Result | Why |
|----------|--------|-----|
| Wikimedia Commons keyword search | **Poor** | Returns generic/wrong images. "Korean ramen" → instant ramen packet. Many duplicates. |
| Wikipedia `generator=images` | **Poor** | Needs exact article title, fragile matching. |
| **Wikipedia opensearch → pageimages (chosen)** | **Best** | Finds correct article via fuzzy search, returns editorially curated lead image. 17/17 Korean dishes found. |
| Using local name (Korean script) as search query | **Key improvement** | 잡채 matches "Japchae" article perfectly. English "japchae" matched "Japheth" (wrong article). |

**Final architecture:**
1. GPT returns `imageSearchQuery` field per dish
2. Client uses **local name** (Korean/Thai script) as primary search query
3. `/api/dish-image` endpoint: Wikipedia opensearch → article lead image → Commons fallback → Unsplash fallback
4. Images cached in Zustand store with deduplication (no two dishes share the same image URL)
5. Bad results filtered (logos, flags, newspapers, etc.)

**Files changed:**
- `src/lib/types.ts` — add `imageSearchQuery` to Dish interface
- `src/lib/openai.ts` — include `imageSearchQuery` in enrichment prompt
- `src/app/api/dish-image/route.ts` — new endpoint (Wikipedia opensearch + pageimages)
- `src/app/results/page.tsx` — trigger image prefetch, show thumbnails
- `src/app/dish/[id]/page.tsx` — display hero image from cache
- `src/lib/store.ts` — image URL cache with deduplication

### Phase C: Ingredient Annotations on Hero Image

**Change**: Position ingredient badges on the dish photo in a clean fixed grid layout.

**Why fixed positions (not AI segmentation):**
- AI image segmentation is way too complex and slow for this use case
- Fixed positions (corners + edges) look clean and professional
- Top 4-5 ingredients by category (protein, vegetable, sauce, carb) placed at preset spots
- Color-coded: red=protein, green=vegetable, orange=sauce, yellow=carb
- Backdrop blur for readability over photos

**Files changed:**
- `src/app/dish/[id]/page.tsx` — badge positioning layout

### Bug Fixes (discovered during testing)

1. **Back navigation re-scan**: Results page re-triggered OpenAI API on every mount. Fixed: skip scan if dishes already in Zustand store.
2. **"Dish not found" on detail page**: Phase 2 enrichment batches returned inconsistent IDs (numeric, duplicates). Fixed: normalize all IDs to `dish-N` strings after enrichment; use String() comparison in detail lookup.
3. **Duplicate/wrong images**: Multiple dishes got same generic photo. Fixed: deduplicate URLs in store, filter bad Wikimedia results, use local name as primary search.

## Status: COMPLETE

All phases implemented, tested, and committed on `feat/speed-and-images` (8 commits).

**Test results (Korean Kitchen menu, 17 dishes):**
- Scan time: ~40-50s (down from 90s)
- All 17 dishes return relevant food images via Wikipedia
- Back navigation is instant (no re-scan)
- Dish detail loads correctly with hero image + ingredient badges
- Build passes

**Ready to merge to `main` after final review.**
