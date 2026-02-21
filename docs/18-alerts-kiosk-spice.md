# 18 — Allergen Alerts, Show-to-Staff Kiosk, Spice/Taste Profile

## What Changed

### Spice Level & Taste Profile
- Added `spiceLevel` (1-5) and `tasteProfile` (string[]) fields to `Dish` type
- Updated both full and card enrichment prompts to request these fields from LLM
- Results page: flame icons (🌶) on cards for spiceLevel >= 2, taste tags as inline text
- Dish detail: spice pill in hero tag row with severity label (Mild/Low/Medium/Hot/Very Hot)
- Taste profile pills rendered after "What is this dish?" card
- Ranking: spice compatibility scoring (Mild users penalized for spiceLevel >= 4, Spicy users penalized for spiceLevel <= 1)
- Added `pe-tag-spice-bg` and `pe-tag-spice` color tokens

### Allergen/Dietary Alerts
- New `getDishConflicts()` utility in `ranking.ts` — detects diet type, restriction, and allergen conflicts
- Results page: ⚠️ badge on dish cards that conflict with user preferences
- Dish detail: warning banner below hero for conflicting dishes
- Order page: consolidated dietary conflict banner (replaces allergen-only), per-item ⚠️ inline icon

### Show-to-Staff Kiosk Mode
- Fullscreen white-bg overlay with large local-script dish names + quantities
- Triggered from "Show to Staff" bottom bar button on order page
- Requests Fullscreen API + portrait orientation lock (graceful failure)
- Large audio play button (AI voice or device TTS fallback)
- Dismiss by tapping backdrop or Escape key
- Existing inline "Show to Staff" card preserved as non-fullscreen preview

## Files Changed

| File | Change |
|------|--------|
| `src/lib/types.ts` | Added `spiceLevel`, `tasteProfile` to Dish |
| `tailwind.config.ts` | Added spice color tokens |
| `src/lib/providers/shared.ts` | Updated full + card enrichment prompts |
| `src/lib/ranking.ts` | Added `getDishConflicts()`, spice compatibility scoring |
| `src/app/results/page.tsx` | Spice flames, taste tags, allergen ⚠️ on DishCard |
| `src/app/dish/[id]/page.tsx` | Spice pill, taste pills, allergen conflict banner |
| `src/app/order/page.tsx` | Dietary conflict warnings, per-item ⚠️, kiosk overlay |
