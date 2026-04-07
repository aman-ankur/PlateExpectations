# 24 — Production Readiness Fixes

Pre-trip polish pass fixing critical UX and PWA issues.

## Changes

### Order Templates (`src/lib/orderTemplates.ts`)
- Korean counter word: `개` (objects) → `인분` (servings) — natural restaurant ordering
- Thai greeting: removed `ครับ/ค่ะ` literal slash, default to `ครับ`

### Order Page (`src/app/order/page.tsx`)
- Fixed stale TTS audio: `playAudio` now updates `Audio.src` when URL changes instead of reusing stale object
- Fixed "Long-press dishes" instruction → "Tap the + button on dishes"

### Results Page (`src/app/results/page.tsx`)
- AI Generate button: changed from hover-only (`opacity-0 group-hover:opacity-100`) to always visible on mobile (`sm:opacity-0 sm:group-hover:opacity-100`)
- "Scan New Menu" now requires confirmation dialog before clearing results

### Order FAB (`src/components/OrderFab.tsx`)
- Clear order (✕) button now requires confirmation dialog

### Preferences (`src/app/preferences/page.tsx`)
- Onboarding redirect: `/results` → `/` to avoid bounce (results page redirects home when no scan exists)

### Dish Detail (`src/app/dish/[id]/page.tsx`)
- Nutrition fallback text: "Loading nutrition data..." → "Nutrition data unavailable" when data is absent (not loading)

### PWA (`src/app/layout.tsx`, `public/manifest.json`, `public/icons/`)
- Added PWA icons (192px, 512px) to `public/icons/`
- Added Apple meta tags: `apple-touch-icon`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`
- Aligned theme colors: manifest now matches layout (`#faf8f5`)

## Files Touched
- `src/lib/orderTemplates.ts`
- `src/app/order/page.tsx`
- `src/app/results/page.tsx`
- `src/components/OrderFab.tsx`
- `src/app/preferences/page.tsx`
- `src/app/dish/[id]/page.tsx`
- `src/app/layout.tsx`
- `public/manifest.json`
- `public/icons/icon-192.png` (new)
- `public/icons/icon-512.png` (new)
- `docs/24-production-readiness-fixes.md` (new)
