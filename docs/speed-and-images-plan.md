# Feature: Speed & Images — Technical Plan

## Problem

1. **Speed**: Two sequential GPT-4o API calls (OCR → enrichment) takes 10-15 seconds per menu scan
2. **No dish images**: Detail view shows emoji placeholder — no real food photos
3. **Ingredient annotations**: Mockups show ingredient badges overlaid on dish photos

## Approach & Reasoning

### Phase A: Speed — Single Call + Structured Outputs

**Change**: Merge OCR + enrichment into a single GPT-4o Vision call with Structured Outputs.

**Why this is the best approach:**

| Option considered | Verdict | Reasoning |
|-------------------|---------|-----------|
| Single merged call | **YES** | Eliminates a full network round-trip. GPT-4o Vision handles OCR + enrichment well in one pass. ~50% latency reduction. |
| GPT-4o-mini | **NO** | Significantly worse OCR for Thai/Korean/Japanese/Vietnamese scripts. 20-30% faster but quality loss is unacceptable. |
| Structured Outputs (`json_schema`) | **YES** | Guarantees valid schema-compliant JSON from OpenAI's side. Eliminates all our fallback parsing hacks. ~10% faster than `json_object` mode. |
| Streaming responses | **NO** | Partial JSON is useless — users need complete dish data (allergens, nutrition) to make decisions. Adds frontend complexity with no UX benefit. |
| `detail: "auto"` instead of `"high"` | **YES** | Lets OpenAI choose optimal resolution. Saves input tokens on clearly readable menus. |

**Expected result**: 10-15s → 5-7s

**Files changed:**
- `src/lib/openai.ts` — new `scanMenu()` function replaces `extractMenuItems()` + `enrichDishes()`
- `src/app/api/scan/route.ts` — simplified to single function call

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

## Why Single Agent, Not Team

- Codebase is ~15 files, all phases touch overlapping files (`openai.ts`, `dish/[id]/page.tsx`)
- Phases are sequential (B depends on A's schema changes, C depends on B's image loading)
- No parallelization benefit — team overhead would slow things down

## Verification

- Korean Kitchen menu (17 items): should complete in ~5-7 seconds
- Each dish detail should show a real food photo
- Ingredient badges should overlay on the photo with correct colors
