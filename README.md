# Plate Expectations 🍽️

**Decode any menu, anywhere.** AI-powered menu translator for travelers abroad.

Scan a foreign menu with your phone camera and get a translated, personalized, visually rich breakdown of every dish — with dietary info, allergen warnings, nutrition estimates, and cultural context.

## The Problem

Travelers facing foreign-language menus don't know what dishes contain, whether items meet their dietary needs, or what's worth ordering.

## How It Works

1. **Scan** — Take a photo of any foreign-language menu
2. **Understand** — AI translates and explains every dish in plain English
3. **Choose** — Dishes ranked by your dietary preferences, with allergen warnings

## Features

- **OCR + Translation** — GPT-4o Vision reads menus in any foreign language
- **Real Dish Photos** — Wikipedia-sourced images for every dish
- **Personalized Ranking** — Dishes ranked based on your dietary preferences and restrictions
- **Dietary System** — Veg/Non-Veg/Jain, Halal, No Beef/Pork, allergy tracking (egg, soy, sesame, peanut, shellfish, gluten)
- **Dish Detail** — Ingredients with photo annotations, approximate nutrition, cultural term explanations
- **Mobile-First PWA** — Installable on any phone, dark theme

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **State:** Zustand + localStorage
- **AI:** OpenAI GPT-4o-mini Vision (OCR) + GPT-4o-mini (translation/enrichment, parallel batches)
- **Deploy:** Vercel

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.local.example .env.local
# Add your OpenAI API key to .env.local

# Run locally
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your phone or browser.

## Project Structure

```
src/
  app/
    page.tsx              # Home / Scan screen
    preferences/page.tsx  # Dietary preferences onboarding
    results/page.tsx      # Menu results list
    dish/[id]/page.tsx    # Dish detail view
    settings/page.tsx     # Edit preferences
    api/scan/route.ts     # OpenAI OCR + enrichment pipeline (parallel batches)
    api/dish-image/route.ts # Wikipedia image search for dishes
  lib/
    store.ts              # Zustand state management
    openai.ts             # OpenAI API helpers
    ranking.ts            # Preference-based dish ranking
    types.ts              # TypeScript interfaces
    compress.ts           # Client-side image compression
    constants.ts          # App constants
```

## Roadmap

- [x] PWA scaffold + dark theme
- [x] Preferences onboarding (diet, proteins, spice, allergies)
- [x] Menu scan pipeline (OCR → translate → enrich → rank)
- [x] Results list with personalized ranking
- [x] Dish detail (nutrition, ingredients, cultural terms)
- [x] End-to-end testing with real menus
- [x] Dish images via Wikipedia article lead photos
- [x] Ingredient annotations on dish hero images
- [ ] UI polish to match design mockups
- [ ] Offline mode
- [ ] Scan history

## License

MIT
