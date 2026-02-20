# 12 — Mobile UX Fixes, Demo Enhancement, Hero Declutter

## What changed

### 1. Mobile touch fix — scroll no longer triggers card clicks
On mobile, scrolling through the dish list was accidentally triggering card navigation because `useLongPress` only checked `didLongPress` on touch end, not whether the finger had moved. Added `didMove` ref that tracks finger displacement during touch — if the finger moves more than 15px, both click and long-press are suppressed.

### 2. Long-press removed, explicit + button added
Long-press to add to cart was undiscoverable on mobile — users didn't know it existed. Removed the `useLongPress` hook from DishCard entirely. Cards now use a simple `onClick` for navigation. An explicit "+" button on each card handles add-to-order with `e.stopPropagation()`.

### 3. Dish detail hero decluttered
The hero image was barely visible — ingredient badges covered the top 40% and the gradient + text covered the bottom 40%.

**Changes:**
- **Ingredient badges hidden by default.** Tap the image to toggle them on/off (300ms fade animation). "Tap image for ingredients" hint shown in top-right when badges are off.
- **Gradient reduced** from `via-[#0f0f0f]/70 via-40%` to `via-[#0f0f0f]/60 via-25%` — more food visible.
- **Text overlay compacted**: romanized + local name combined on a single line (`Galbitang · 갈비탕`), smaller font sizes (2xl vs 3xl), smaller tags (10px with tighter padding).
- **"AI Generated" tag** moved from a floating overlay on the image into the **dietary tags row** at the bottom, inline with Veg/Non-Veg, allergens, macros. Shows as `✨ AI Generated` with accent background.
- **"Generate AI Photo" button** removed from hero overlay (was competing with badges). Now lives below the hero as a full-width bordered button in the content area.
- **Gallery dot indicators** moved to top-center (horizontally centered) to avoid overlap with back button and badges.

### 4. Demo expanded to 15 Korean dishes
- 10 common: Bibimbap, Japchae, Kimchi Jjigae, Bulgogi, Tteokbokki, Samgyeopsal, Sundubu Jjigae, Haemul Pajeon, Dakgalbi, Kalguksu
- 5 uncommon: Jajangmyeon, Galbitang, Hotteok, Sundae (Korean blood sausage), Bossam
- Rich descriptions with Indian food comparisons (thali, seekh kebabs, rasam, malpua, paya shorba, etc.)
- Detailed ingredients with `isUnfamiliar` explanations, nutrition data, cultural terms
- 5 dishes flagged as AI-generated images (Jajangmyeon, Galbitang, Hotteok, Sundae, Bossam)

### 5. Multi-image gallery for demo dishes
4 popular dishes (Bibimbap, Kimchi Jjigae, Bulgogi, Tteokbokki) have 3-image arrays in `demo-images.json`, but **only the first URL per dish works** — the 2nd and 3rd Wikimedia Commons URLs return 404 (incorrectly constructed). The `dish-image` API route was updated to handle both string and string[] values from `demo-images.json`. See backlog item 3.4 for fix options.

### 6. AI tag on result cards
Moved from bottom-left to bottom-right of the card thumbnail for consistency.

### 7. Settings gear always visible
Removed the `hasCompletedOnboarding` gate — the gear icon on the home page is now always visible, even for first-time users on fresh deploys.

## Files changed
- `src/lib/useLongPress.ts` — Added `didMove` ref for scroll detection (still exists for potential future use)
- `src/app/results/page.tsx` — Removed long-press, added explicit + button, simple onClick navigation, AI tag to bottom-right
- `src/app/dish/[id]/page.tsx` — Hero declutter: toggle badges, lighter gradient, compact text, AI tag in tag row, generate button below hero
- `src/app/page.tsx` — Gear icon always visible
- `src/fixtures/demo-scan.json` — 15 Korean dishes with rich enrichment data
- `src/fixtures/demo-images.json` — 15 dishes with multi-image support (arrays for 4 popular dishes)
- `src/app/api/dish-image/route.ts` — Handle string[] values in demo mode, `_generated` array support

## Design decisions
- **Why remove long-press?** Mobile users don't discover hidden gestures. The + button is universally understood and works reliably without conflicting with scroll.
- **Why toggle badges?** The infographic badges are visually distinctive but they obscure the food photo — the most important element. Tap-to-toggle gives users control. The badges are also listed in the Ingredients section below, so they're not lost.
- **Why 25% gradient?** The previous 40% gradient made the bottom half of the hero dark. 25% is enough to ensure text readability while showing significantly more food.
- **Why inline AI tag?** A floating "AI Generated" overlay competed with badges and the generate button for visual real estate on the hero. Placing it in the existing tag row is clean and consistent.
