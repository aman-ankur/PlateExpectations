# Plate Expectations — Task Breakdown

## Phase 1: PWA Scaffold & Foundations

- [x] Initialize Next.js 14 project with App Router, TypeScript, Tailwind CSS
- [ ] Configure PWA manifest (`manifest.json`) + basic service worker
- [ ] Define dark theme design tokens in Tailwind config (colors, typography, spacing)
- [ ] Create shared layout component (dark background, mobile-first max-width)
- [ ] Build Home/Scan screen
  - [ ] App title + tagline
  - [ ] Dashed-border upload zone with camera icon
  - [ ] "Choose Photo" button — triggers `<input type="file" accept="image/*" capture="environment">`
  - [ ] Image preview after selection
  - [ ] Navigation to results (wired in Phase 2)
- [ ] Build Preferences screen
  - [ ] Protein multi-select grid (Chicken, Beef, Pork, Seafood)
  - [ ] Spice tolerance single-select (Mild, Medium, Spicy, Any)
  - [ ] Dietary mode selector (Veg, Non-Veg, Jain)
  - [ ] Restrictions toggles (Halal, No Beef, No Pork)
  - [ ] Allergy multi-select (Egg, Soy, Sesame, Peanut, Shellfish, Gluten)
  - [ ] Continue + Skip buttons
  - [ ] Persist to localStorage
- [ ] Set up Zustand store for app state (preferences, scan results, current dish)
- [ ] First-launch detection — show Preferences on first visit, then Home

## Phase 2: Menu Scan Pipeline

- [ ] Create `/api/scan` route
  - [ ] Accept image upload (multipart form data or base64)
  - [ ] Call GPT-4o Vision for OCR extraction
  - [ ] Call GPT-4o for translation, enrichment, dietary classification
  - [ ] Return structured JSON array of dishes
- [ ] Define TypeScript types for Dish, Ingredient, NutritionEstimate, CulturalTerm
- [ ] Wire Home screen "Choose Photo" → upload → `/api/scan` → navigate to results
- [ ] Loading state UI (skeleton cards while processing)
- [ ] Error states (no dishes found, bad image, API error)

## Phase 3: Results List

- [ ] Build Menu Detected screen
  - [ ] Header with back arrow + "X items identified"
  - [ ] Dish card component (rank badge, name, local script, description, price, chevron)
  - [ ] Gold badge system ("TOP PICK FOR YOU", "#2 FOR YOU", etc.)
- [ ] Implement ranking algorithm
  - [ ] Hard filter: flag dietary violations
  - [ ] Soft rank: protein preference match, spice tolerance match, GPT popularity
- [ ] Tap card → navigate to Dish Detail

## Phase 4: Dish Detail View

- [ ] Build Dish Detail screen
  - [ ] Hero image section (placeholder/fallback)
  - [ ] Floating ingredient badges (color-coded overlays)
  - [ ] Country label + dish name + local script
  - [ ] Status tags row (dietary, allergens, macro)
  - [ ] "What is this dish?" card
  - [ ] Nutrition card (4-column grid + kcal footer)
  - [ ] Ingredients chip list with `?` icon for unfamiliar terms
  - [ ] Unfamiliar terms section — tappable chips with tooltip/modal explanations
- [ ] Back navigation to results list

## Phase 5: Dish Images

- [ ] Integrate image search for real dish photos
- [ ] AI-generated fallback via DALL-E (or similar)
- [ ] Image caching (URL-based, avoid re-fetching)
- [ ] "Illustration" badge on AI-generated images
