# 08 — Demo Mode (Fixture Replay)

## What changed

Added a `DEMO_MODE=true` environment variable that makes the app replay pre-recorded fixture data instead of calling any external APIs (Cloud Vision, Groq, OpenAI, Wikipedia, Unsplash, DALL-E).

## Why

Every manual UI test burns real API tokens. When iterating on card layouts, the order builder, or streaming skeleton states, we don't need live AI — just realistic data flowing through the same pipeline. Demo mode enables full E2E testing for free.

## How it works

Intercepts at the API route level — the client code is completely unchanged:

- **`POST /api/scan`** — Streams pre-recorded NDJSON events from `src/fixtures/demo-scan.json` with realistic delays (200–800ms between events) so skeleton cards, progress indicators, and batch rendering all exercise naturally.
- **`GET /api/dish-image`** — Looks up dish names in `src/fixtures/demo-images.json` and returns Wikipedia Commons URLs (free, public, no API key needed).

## Files changed

| File | Change |
|------|--------|
| `src/app/api/scan/route.ts` | Demo mode early return with streamed fixture replay |
| `src/app/api/dish-image/route.ts` | Demo mode image lookup from fixture map |
| `src/fixtures/demo-scan.json` | **New** — 8 Korean dishes, fully enriched (ingredients, nutrition, allergens, cultural terms) |
| `src/fixtures/demo-images.json` | **New** — Dish name → Wikipedia image URL map (English + Korean keys) |
| `docs/08-demo-mode.md` | **New** — This changelog |

## Usage

```bash
# In .env.local:
DEMO_MODE=true

npm run dev -- -p 3001
# Upload any image → get streaming fixture results
# Unset DEMO_MODE to return to normal API behavior
```
