# CLAUDE.md — Plate Expectations

## Project Overview

PWA for travelers to scan and understand foreign-language menus anywhere. Scan a menu photo → get translated, enriched dish cards with images, dietary info, allergens, nutrition.

## Tech Stack

- **Framework:** Next.js 14, App Router, TypeScript
- **Styling:** Tailwind CSS 3 (dark theme, `pe-*` color namespace)
- **State:** Zustand + localStorage for preferences
- **AI:** OpenAI GPT-4o-mini (Vision OCR + parallel batch enrichment)
- **Images:** Wikipedia pageimages API + GPT-4o-mini Vision validation + DALL-E 3 fallback
- **Deploy:** Vercel | **Package manager:** npm

## File Structure

```
src/app/
  page.tsx                  — Home / Scan screen (camera upload)
  preferences/page.tsx      — Dietary preferences onboarding
  results/page.tsx          — Menu results list (streaming, progressive loading)
  dish/[id]/page.tsx        — Dish detail (hero image, badges, nutrition)
  settings/page.tsx         — Edit preferences
  api/scan/route.ts         — NDJSON streaming scan pipeline
  api/dish-image/route.ts   — Vision-validated dish image search + DALL-E fallback
src/lib/
  openai.ts                 — extractDishes() + scanMenuStreaming() + enrichBatch()
  store.ts                  — Zustand store (preferences, scan, skeletons, dish image cache)
  types.ts                  — Dish, RawDish, ScanEvent, Ingredient, CulturalTerm, Preferences
  ranking.ts                — Preference-based dish ranking (top 5 labels, menu order preserved)
  compress.ts               — Client-side image compression (max 1200px, 0.7 quality)
  constants.ts              — Design tokens, dietary options
docs/
  backlog.md                — Prioritized improvement items
  speed-and-images-plan.md  — Benchmarks and architecture decisions
```

## API Architecture

### POST `/api/scan` — Streaming menu scan pipeline
**Input:** `{ image: string, preferences?: Preferences }` (base64)
**Output:** NDJSON stream (`text/event-stream`) with events:
```
{"type":"progress","message":"Reading menu..."}
{"type":"progress","message":"Found 17 dishes"}
{"type":"phase1","dishes":[{id,nameEnglish,nameLocal,price,brief,country},...]}
{"type":"progress","message":"Enriching 17 dishes..."}
{"type":"batch","dishes":[<enriched Dish objects>]}
{"type":"batch","dishes":[<enriched Dish objects>]}
{"type":"done"}
```

1. **Phase 1**: GPT-4o-mini Vision → dish names, prices, local script (~15s)
2. **Phase 2**: GPT-4o-mini × N parallel batches of 5 → full enrichment (~15-20s concurrent)
3. Events streamed via `ReadableStream` with `pull()` pattern
4. Batches yielded in completion order (first-finished-first-shown)
5. Client ranks dishes on `done` event (top 5 get labels, menu order preserved)

### GET `/api/dish-image?q=<query>` — Dish photo search
Wikipedia opensearch → article lead image (pageimages) → Commons fallback → Unsplash fallback. Uses local script names (Korean/Thai) for best matching. Parenthetical suffixes (weights like `(150g)`) are stripped before search.

**Image validation pipeline:**
1. Filename heuristic: reject non-food patterns (portrait, flag, pdf, etc.) — free
2. Filename heuristic: accept food patterns (soup, kimchi, galbi, ramen, etc.) — free, ~1s
3. Remaining candidates: GPT-4o-mini Vision validation ("Is this {dish}? YES/NO") — ~$0.0001/check, 3 candidates validated in parallel
4. All candidates rejected → DALL-E 3 generation — ~$0.04/image, ~15s
5. Response includes `generated: true` flag for AI-generated images

**Cost:** ~$0.003 for Vision checks on a 20-dish menu. DALL-E only triggered when no real photo matches.

## Learnings & Gotchas (from testing)

### OpenAI Performance
- Token generation is ~40-50 tok/s regardless of model (gpt-4o vs gpt-4o-mini)
- Structured Outputs (`json_schema`) is 10x SLOWER with Vision — use `json_object` mode
- `detail: "low"` is faster but misses dishes on dense menus — use `detail: "auto"`
- Bottleneck is always output tokens, not image processing or network
- Parallel batches are the only way to speed up large menus
- **Concurrent batch limit**: Firing 8+ parallel gpt-4o-mini requests simultaneously causes some to return `{"dishes": []}` (valid 200, `finish_reason=stop`, ~650ms). Not a rate limit — the model returns an empty array. Fix: stagger batch launches by 200ms each.

### Streaming
- `ReadableStream` with `start()` doesn't await async work — use `pull()` pattern instead
- `text/event-stream` content type + `X-Accel-Buffering: no` prevents proxy buffering
- React Strict Mode fires effects twice (mount → unmount → remount). Use a `useRef` guard (`scanStarted`) to ensure the scan only runs once — don't rely on abort-and-restart which creates race conditions with in-flight OpenAI requests.
- Batches that complete at similar times (~300ms apart) will appear together to the client
- `AbortController` on server-side `ReadableStream.cancel()` for cleanup when client disconnects; client fetch has no abort signal (let scan complete through Strict Mode cycles)

### Image Search
- Wikimedia Commons keyword search returns generic/wrong images — don't use
- Wikipedia opensearch → pageimages gives editorially curated photos — best quality
- Local script names (잡채) match articles better than English ("japchae" → "Japheth" wrong match)
- Deduplicate image URLs in store — multiple dishes can match the same Commons photo
- Strip weight/quantity suffixes from queries: `소갈비살(150g)` → `소갈비살`
- **Text-based search can't catch wrong-food-for-wrong-food** (e.g., "순대" → StrawberrySundae.jpg). Vision AI validation is the only reliable check.
- Vision validation with `detail: "low"` + `max_tokens: 3` costs ~$0.0001 per check — negligible
- **Fail closed**: if Vision API errors, reject the image (don't show wrong food)
- Validate candidates in parallel (batches of 3) to avoid sequential latency
- Food-related filenames (soup, kimchi, ramen) can skip Vision — high confidence from filename alone
- Unsplash returns generic food photos — must be Vision-validated too

### Common Bugs to Watch For
- **Hydration errors**: Any component reading localStorage must use a `mounted` state guard
- **Dish ID mismatch**: Enrichment batches return inconsistent IDs — always normalize after
- **Back nav re-scan**: Results page must check `dishes.length > 0` before calling API
- **next.config.mjs**: `api.bodyParser` is Pages Router only — don't use with App Router
- **Derived loading state**: Don't rely on `isLoading` flag alone — derive from `menuImage` + `dishes.length` + `scanProgress` to avoid flash of empty content
- **Zustand re-renders**: Don't destructure the entire store in list components. Use targeted selectors (e.g., `useStore((s) => s.dishImages[dish.id])`) to avoid full-page re-renders when individual images load.
- **Inline component definitions**: Never define components inside render functions — they get recreated every render, defeating React reconciliation and causing webpack HMR errors

### Testing
- Test images: `/Users/aankur/Downloads/korean.jpg` (17 dishes), `/Users/aankur/Downloads/korean2.jpg` (8 dishes)
- Dev server: always use port 3001 — `npm run dev -- -p 3001` (kill existing process on 3001 first if needed)
- Curl NDJSON test: `BASE64=$(base64 -i image.jpg | tr -d '\n') && curl -N -X POST localhost:3001/api/scan -H 'Content-Type: application/json' -d "{\"image\":\"data:image/jpeg;base64,${BASE64}\"}"`
- Always verify with `npm run build` before merging to main
- React Strict Mode causes double API calls in dev — this is normal, doesn't happen in prod

## State Management

Zustand store: **preferences** (synced to localStorage), **scan** (ephemeral: dishes, skeletonDishes, scanProgress), **dishImages** (cache with dedup), **generatedDishIds** (module-level Set tracking AI-generated images). Key actions: `appendEnrichedDishes()` for incremental batch merging, `clearScan()` for full reset, `fetchDishImagesForBatch()` for per-batch image loading, `isGeneratedImage()` for checking if a dish image was AI-generated.

## Git Workflow

- `main` is protected — always deployable
- Feature branches: `feat/<name>`, `fix/<name>`, `refactor/<name>`
- Merge only after `npm run build` passes
- Small docs/config changes can go directly to main

## Key Rules

- Never hardcode API keys — use `OPENAI_API_KEY` env var
- Always show disclaimer: "AI-estimated. Verify with restaurant staff."
- All AI prompts live in `src/lib/openai.ts`
- Compress images client-side before upload (max 1MB)
- Keep bundle small — no heavy UI libraries
- Backlog tracked in `docs/backlog.md`

## Commands
- Build: `npm run build` | Dev: `npm run dev` | Lint: `npm run lint` | Deploy: `vercel deploy`
