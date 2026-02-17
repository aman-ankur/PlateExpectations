# Plate Expectations — Roadmap

## Phase 1: PWA Scaffold & Foundations

- Next.js 14 App Router project setup with TypeScript + Tailwind CSS
- Dark theme design system (tokens matching mockups)
- PWA manifest + service worker basics (installable on mobile)
- Home/Scan screen — upload zone, camera capture, file picker
- Preferences screen — protein grid, spice tolerance, dietary/allergen selection
- localStorage persistence for preferences
- Zustand store setup
- Mobile-first responsive layout

## Phase 2: Menu Scan Pipeline

- API route: `/api/scan` — accepts menu image upload
- GPT-4o Vision call for OCR — extract dish names, prices, descriptions in original language
- GPT-4o call for translation & enrichment — English name, description, ingredients, dietary classification, allergens, nutrition estimate, cultural term explanations
- Structured JSON response schema for dish data
- Loading/processing UI (skeleton cards, progress indicator)
- Error handling (bad image, no dishes found, API failures)

## Phase 3: Menu Detected Results List

- Results list screen with personalized ranking
- Ranking algorithm using user preferences (dietary hard-filter, protein/spice soft-rank, GPT popularity signal)
- Dish cards: rank badge, English name, local script, description, price, chevron
- Navigation from results to dish detail

## Phase 4: Dish Detail View

- Hero image section (placeholder initially)
- Floating ingredient badges over image (color-coded by category)
- Country label + dish name + local script
- Status tags row: dietary (pink), allergens (yellow), macro (teal)
- "What is this dish?" explanation card
- Approx. Nutrition card (4-column: protein/carbs/fat/fiber + kcal)
- Ingredients chip list with `?` icons on unfamiliar terms
- "Unfamiliar Terms" section with tappable tooltip explanations

## Phase 5: Dish Images

- Real photo search integration (web image search API or curated sources)
- AI-generated fallback images (DALL-E or similar)
- Image caching strategy
- "Illustration" label for AI-generated images

## Future Phases

- Offline mode (cached results, service worker enhancements)
- Scan history (saved menus)
- Community ratings/tips
- Multi-language UI (Hindi, etc.)
- Restaurant recommendations nearby
