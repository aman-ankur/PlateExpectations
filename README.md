# Plate Expectations 🍽️

**Decode any menu, anywhere.** AI-powered menu translator for Indian travelers in Southeast & East Asia.

Scan a foreign menu with your phone camera and get a translated, personalized, visually rich breakdown of every dish — with dietary info, allergen warnings, nutrition estimates, and cultural context.

## The Problem

Indian couples traveling to Vietnam, Thailand, Korea, Japan, or Indonesia face menus they can't read. They don't know what dishes contain, whether items are vegetarian-safe, or what's worth ordering.

## How It Works

1. **Scan** — Take a photo of any foreign-language menu
2. **Understand** — AI translates and explains every dish in plain English
3. **Choose** — Dishes ranked by your dietary preferences, with allergen warnings

## Features

- **OCR + Translation** — GPT-4o Vision reads menus in Thai, Vietnamese, Korean, Japanese, Indonesian
- **Personalized Ranking** — Dishes ranked based on your dietary preferences and restrictions
- **Dietary System** — Veg/Non-Veg/Jain, Halal, No Beef/Pork, allergy tracking (egg, soy, sesame, peanut, shellfish, gluten)
- **Dish Detail** — Ingredients, approximate nutrition, cultural term explanations
- **Mobile-First PWA** — Installable on any phone, dark theme

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **State:** Zustand + localStorage
- **AI:** OpenAI GPT-4o Vision (OCR) + GPT-4o (translation/enrichment)
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
    api/scan/route.ts     # OpenAI OCR + enrichment pipeline
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
- [ ] End-to-end testing with real menus
- [ ] UI polish to match design mockups
- [ ] Dish image search + AI-generated fallbacks
- [ ] Offline mode
- [ ] Scan history

## License

MIT
