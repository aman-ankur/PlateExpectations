# CLAUDE.md — Plate Expectations

## Project Overview

PWA for travelers to scan and understand foreign-language menus anywhere. Scan a menu photo → get translated, enriched dish cards with images, dietary info, allergens, nutrition.

## Tech Stack

- **Framework:** Next.js 14, App Router, TypeScript
- **Styling:** Tailwind CSS 3 (dark theme, `pe-*` color namespace)
- **State:** Zustand + localStorage for preferences
- **AI:** OpenAI GPT-4o-mini (Vision OCR + parallel batch enrichment)
- **Images:** Wikipedia pageimages API (free, no key needed)
- **Deploy:** Vercel | **Package manager:** npm

## File Structure

```
src/app/
  page.tsx                  — Home / Scan screen (camera upload)
  preferences/page.tsx      — Dietary preferences onboarding
  results/page.tsx          — Menu results list with thumbnails
  dish/[id]/page.tsx        — Dish detail (hero image, badges, nutrition)
  settings/page.tsx         — Edit preferences
  api/scan/route.ts         — Two-phase parallel scan pipeline
  api/dish-image/route.ts   — Wikipedia image search endpoint
src/lib/
  openai.ts                 — extractDishes() + enrichInParallel() + enrichBatch()
  store.ts                  — Zustand store (preferences, scan, dish image cache)
  types.ts                  — Dish, Ingredient, CulturalTerm, Preferences
  ranking.ts                — Preference-based dish ranking
  compress.ts               — Client-side image compression (max 1200px, 0.7 quality)
  constants.ts              — Design tokens, dietary options
docs/
  backlog.md                — Prioritized improvement items (16 items, 4 tiers)
  speed-and-images-plan.md  — Benchmarks and architecture decisions
```

## API Architecture

### POST `/api/scan` — Menu scan pipeline
**Input:** `{ image: string, preferences?: Preferences }` (base64)
1. **Phase 1**: GPT-4o-mini Vision → dish names, prices, local script (~15s)
2. **Phase 2**: GPT-4o-mini × N parallel batches of 5 → full enrichment (~15-20s concurrent)
3. IDs normalized to `dish-N` strings after enrichment
4. Return `{ dishes: Dish[] }` ranked by preferences

### GET `/api/dish-image?q=<query>` — Dish photo search
Wikipedia opensearch → article lead image (pageimages) → Commons fallback → Unsplash fallback. Uses local script names (Korean/Thai) for best matching. ~1s per image.

## Learnings & Gotchas (from testing)

### OpenAI Performance
- Token generation is ~40-50 tok/s regardless of model (gpt-4o vs gpt-4o-mini)
- Structured Outputs (`json_schema`) is 10x SLOWER with Vision — use `json_object` mode
- `detail: "low"` is faster but misses dishes on dense menus — use `detail: "auto"`
- Bottleneck is always output tokens, not image processing or network
- Parallel batches are the only way to speed up large menus

### Image Search
- Wikimedia Commons keyword search returns generic/wrong images — don't use
- Wikipedia opensearch → pageimages gives editorially curated photos — best quality
- Local script names (잡채) match articles better than English ("japchae" → "Japheth" wrong match)
- Deduplicate image URLs in store — multiple dishes can match the same Commons photo

### Common Bugs to Watch For
- **Hydration errors**: Any component reading localStorage must use a `mounted` state guard
- **Dish ID mismatch**: Enrichment batches return inconsistent IDs — always normalize after
- **Back nav re-scan**: Results page must check `dishes.length > 0` before calling API
- **next.config.mjs**: `api.bodyParser` is Pages Router only — don't use with App Router

### Testing
- Test image: `/Users/aankur/Downloads/korean.jpg` (Korean Kitchen menu, 17 dishes)
- Dev server: `npm run dev -- -p 3001`
- Curl test: `BASE64=$(base64 -i image.jpg | tr -d '\n') && curl -X POST localhost:3001/api/scan -H 'Content-Type: application/json' -d "{\"image\":\"data:image/jpeg;base64,${BASE64}\"}"`
- Always verify with `npm run build` before merging to main
- React Strict Mode causes double API calls in dev — this is normal, doesn't happen in prod

## State Management

Zustand store: **preferences** (synced to localStorage), **scan** (ephemeral), **dishImages** (cache with dedup)

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
