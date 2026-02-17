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

## Phase 2: Menu Scan Pipeline — DONE (skeleton)

- [x] Create `/api/scan` route (GPT-4o Vision OCR → GPT-4o enrichment → ranked JSON)
- [x] Define TypeScript types (Dish, Ingredient, CulturalTerm, Preferences)
- [x] Wire Home → upload → `/api/scan` → Results
- [x] Loading state UI (skeleton cards)
- [x] Error states (bad image, API error)

## Phase 3: Results List — DONE (skeleton)

- [x] Menu Detected screen (header, back arrow, item count)
- [x] Dish card component (rank badge, name, local script, description, price, chevron)
- [x] Ranking algorithm (hard dietary filter, soft protein/spice rank, GPT score)
- [x] Tap card → Dish Detail navigation

## Phase 4: Dish Detail View — DONE (skeleton)

- [x] Hero image section with fallback
- [x] Floating ingredient badges (color-coded)
- [x] Country label + dish name + local script
- [x] Status tags (dietary, allergens, macro)
- [x] "What is this dish?" card
- [x] Nutrition card (4-column + kcal)
- [x] Ingredients chip list with `?` tooltips
- [x] Unfamiliar terms section
- [x] Back navigation

---

## Remaining Work (by priority)

### P1: End-to-end testing & fixes
- [x] Add client-side image compression before upload (max ~1MB base64)
- [ ] Test full flow with real OpenAI API key + real menu photo
- [x] Fix API response parsing issues (GPT JSON mode + robust fallback parsing)
- [ ] Handle large menus (pagination or batch limits)

### P2: UI polish to match mockups
- [ ] Home screen — match mockup spacing, button sizing, icon weight
- [ ] Preferences — match mockup grid layout, selected state styling
- [ ] Results list — card spacing, rank badge positioning, typography sizing
- [ ] Dish detail — hero image aspect ratio, floating badge layout, nutrition grid alignment, tooltip animations

### P3: Missing app features
- [x] Settings page — way to re-edit preferences after onboarding
- [ ] Basic service worker for PWA install (offline app shell)
- [x] `error.tsx` error boundaries in route segments
- [x] `loading.tsx` loading states in route segments
- [ ] PWA icons (192px + 512px)

### P4: Phase 5 — Dish images
- [ ] Integrate web image search for real dish photos (in enrichment pipeline)
- [ ] AI-generated fallback via DALL-E when no photo found
- [ ] Image caching strategy
- [ ] "Illustration" badge on AI-generated images

### P5: Future
- [ ] Offline mode (cache scan results, service worker data caching)
- [ ] Scan history (saved menus)
- [ ] Community ratings/tips
