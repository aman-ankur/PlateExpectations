# 20 — Scan History + Results Card Polish

## What Changed
1. Auto-save completed scans to IndexedDB for instant restoration
2. Results card UI improvements: reduced image gradient, icon-based conflict badges, fixed Galbitang demo image

## Scan History

### Why
Scans are ephemeral — `clearScan()` wipes everything. Users lose past results when starting a new scan. This adds persistent history with instant restoration.

### How It Works
- After a scan completes (`done` event), the store auto-saves dishes, dish images, a thumbnail, and metadata to IndexedDB (`pe-scan-history` DB)
- Home page shows a horizontal carousel of up to 5 recent scans below the upload zone
- Tapping a saved scan restores the full dish list and images, then navigates to results
- Max 20 entries stored; oldest auto-evicted on save
- DALL-E generated image URLs are filtered out before saving (they expire after ~1hr)
- Thumbnails are 200px wide JPEG at 0.6 quality (~5-15KB each)

## Results Card Polish

### Reduced gradient overlay
- Image-to-card gradient narrowed from `w-12` to `w-6` so dish photos are more visible

### Icon-based conflict badges
- Replaced the generic `⚠️` emoji with recognizable icons per conflict type:
  - `🔴 Non-Veg` / `🔴 Not Jain` for dietary type conflicts
  - `🫘 Soy`, `🥚 Egg`, `🥜 Peanut`, `🦐 Shellfish`, `🌾 Gluten`, `⚪ Sesame`, `🥛 Dairy` for allergens
  - `🐄 Beef`, `🐷 Pork` for restriction conflicts
- Each conflict gets its own compact badge with icon + short label
- Full conflict description preserved in `title` attribute (hover/long-press)

### Fixed Galbitang demo image
- Replaced `public/demo-images/Galbitang.jpg` with correct photo from `menu_images/wiki_images/`

## Files
- **Created** `src/lib/scan-history.ts` — IndexedDB helpers, thumbnail generation, types
- **Modified** `src/lib/store.ts` — added `scanHistoryList`, `loadScanHistoryList`, `saveScan`, `loadScan`, `deleteScanFromHistory`
- **Modified** `src/app/results/page.tsx` — fire-and-forget `saveScan()` on scan completion, reduced gradient, icon conflict badges
- **Modified** `src/app/page.tsx` — recent scans carousel on home page
- **Modified** `public/demo-images/Galbitang.jpg` — replaced with correct image
- **Modified** `docs/backlog.md` — marked scan history (2.3) as DONE
