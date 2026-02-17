# Plate Expectations — Task Breakdown

## Phase 1: PWA Scaffold & Foundations — DONE

- [x] Initialize Next.js 14 project with App Router, TypeScript, Tailwind CSS
- [x] Configure PWA manifest (`manifest.json`)
- [x] Define dark theme design tokens in Tailwind config
- [x] Create shared layout component (dark background, mobile-first max-width)
- [x] Build Home/Scan screen (title, tagline, upload zone, camera capture, image preview)
- [x] Build Preferences screen (protein grid, spice, diet, restrictions, allergies, localStorage)
- [x] Set up Zustand store for app state
- [x] First-launch detection — show Preferences on first visit

## Phase 2: Menu Scan Pipeline — DONE

- [x] Create `/api/scan` route (GPT-4o Vision OCR → GPT-4o enrichment → ranked JSON)
- [x] Define TypeScript types (Dish, Ingredient, CulturalTerm, Preferences)
- [x] Wire Home → upload → `/api/scan` → Results
- [x] Loading state UI (skeleton cards)
- [x] Error states (bad image, API error)
- [x] Increased max_tokens to 16384 for large menus (17+ items)
- [x] Robust JSON parsing with truncation recovery

## Phase 3: Results List — DONE

- [x] Menu Detected screen (header, back arrow, item count)
- [x] Dish card component (rank badge, name, local script, description, price, chevron)
- [x] Ranking algorithm (hard dietary filter, soft protein/spice rank, GPT score)
- [x] Tap card → Dish Detail navigation

## Phase 4: Dish Detail View — DONE (skeleton)

- [x] Hero image section with fallback (emoji placeholder — no real images yet)
- [x] Floating ingredient badges (color-coded)
- [x] Country label + dish name + local script
- [x] Status tags (dietary, allergens, macro)
- [x] "What is this dish?" card
- [x] Nutrition card (4-column + kcal)
- [x] Ingredients chip list with `?` tooltips
- [x] Unfamiliar terms section
- [x] Back navigation

## P1 Fixes — DONE

- [x] Client-side image compression (1200px max, JPEG 0.7 quality)
- [x] End-to-end test with real OpenAI API + Korean Kitchen menu (17 dishes)
- [x] GPT JSON mode enabled for reliable parsing
- [x] Truncated JSON recovery for large menus
- [x] Settings page with gear icon on home screen
- [x] `error.tsx` + `loading.tsx` in route segments
- [x] Hydration fix (mounted guard for localStorage-dependent UI)
- [x] Console logging in scan API for debugging

---

## Remaining Work (by priority)

### P2: Speed & Images (NEXT — new branch)
- [ ] Combine OCR + enrichment into single GPT-4o Vision call (eliminate 2nd API call)
- [ ] Fetch real dish images (Unsplash/Wikipedia/web search)
- [ ] Annotate dish images with ingredient overlays
- [ ] AI-generated fallback images when no photo found
- [ ] Image caching strategy

### P3: UI polish to match mockups
- [ ] Home screen — match mockup spacing, button sizing, icon weight
- [ ] Preferences — match mockup grid layout, selected state styling
- [ ] Results list — card spacing, rank badge positioning, typography sizing
- [ ] Dish detail — hero image aspect ratio, floating badge layout, nutrition grid alignment, tooltip animations

### P4: Missing app features
- [ ] Basic service worker for PWA install (offline app shell)
- [ ] PWA icons (192px + 512px)
- [ ] Handle very large menus (20+ items — pagination or batch)

### P5: Future
- [ ] Offline mode (cache scan results, service worker data caching)
- [ ] Scan history (saved menus)
- [ ] Community ratings/tips
