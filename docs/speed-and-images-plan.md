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
| **Two-phase parallel (chosen)** | **~20s** | Phase 1: Vision OCR ~5s. Phase 2: 4 parallel batches of ~5 dishes, each ~15s, run concurrently. |

**Architecture:**
1. **Phase 1** — GPT-4o Vision: Extract dish names, prices, local script, country (~5s, ~700 tokens)
2. **Phase 2** — GPT-4o-mini × N batches in parallel: Enrich with descriptions, allergens, nutrition, ingredients, explanations (~15s per batch, all concurrent)

**Files changed:**
- `src/lib/openai.ts` — `scanMenu()` → `extractDishes()` + `enrichInParallel()` + `enrichBatch()`
- `src/app/api/scan/route.ts` — logging update

### Phase B: Dish Images — Wikipedia Commons + Unsplash Fallback

**Change**: Add image search pipeline triggered after results load. Non-blocking (results show immediately, images lazy-load).

**Why this combination:**

| Option considered | Verdict | Reasoning |
|-------------------|---------|-----------|
| Unsplash only | **NO** | 50 requests/hour free tier. Attribution required. Too limiting. |
| Google Custom Search | **NO** | Requires GCP setup + API key. Costs after 100/day. Overkill for MVP. |
| Wikipedia Commons (primary) | **YES** | Free, unlimited, no attribution needed. Covers most well-known Asian dishes. |
| Unsplash (fallback) | **YES** | Fills gaps when Wikipedia has no image. 50/hr is fine as fallback. |
| GPT returning image URLs | **NO** | GPT hallucinates URLs. Cannot search the web. |
| DALL-E generated images | **NO** | Slow (3-5s per image), expensive, looks artificial. |

**How it works:**
1. GPT returns a `imageSearchQuery` field per dish (e.g., "Korean Bibimbap rice bowl")
2. Client fetches images in parallel via `/api/dish-image?q=...` after results load
3. API tries Wikipedia Commons first, then Unsplash
4. Images cached in Zustand store — no re-fetching

**Files changed:**
- `src/lib/types.ts` — add `imageSearchQuery` to Dish
- `src/lib/openai.ts` — include `imageSearchQuery` in schema
- `src/app/api/dish-image/route.ts` — new endpoint
- `src/app/results/page.tsx` — trigger image prefetch
- `src/app/dish/[id]/page.tsx` — display fetched image
- `src/lib/store.ts` — image URL cache

### Phase C: Ingredient Annotations on Hero Image

**Change**: Position ingredient badges on the dish photo in a clean fixed grid layout.

**Why fixed positions (not AI segmentation):**
- AI image segmentation is way too complex and slow for this use case
- Fixed positions (corners + edges) look clean and professional
- Top 4-5 ingredients by category (protein, vegetable, sauce, carb) placed at preset spots
- Color-coded: red=protein, green=vegetable, orange=sauce, yellow=carb

**Files changed:**
- `src/app/dish/[id]/page.tsx` — badge positioning layout

## Execution Order

Phase A → Phase B → Phase C (sequential — each builds on the previous)

## Status

All three phases implemented and committed on `feat/speed-and-images`:

- **Phase A** (Speed): Parallel batch pipeline — ~40s for 17 dishes (down from 90s)
- **Phase B** (Images): Wikimedia Commons search, ~1s/image, cached in store
- **Phase C** (Annotations): Ingredient badges positioned at image corners/edges

## Verification

- Korean Kitchen menu (17 items): should complete in ~15-20 seconds (down from 55-90s)
- Each dish detail should show a real food photo
- Ingredient badges should overlay on the photo with correct colors
