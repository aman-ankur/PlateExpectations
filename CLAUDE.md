# CLAUDE.md — Plate Expectations

## Project Overview

PWA for Indian travelers to scan and understand foreign menus in SE/East Asia.

## Tech Stack

- **Framework:** Next.js 14, App Router, TypeScript
- **Styling:** Tailwind CSS 3
- **State:** Zustand + localStorage for preferences
- **AI:** OpenAI API (GPT-4o Vision for OCR, GPT-4o for enrichment)
- **Deploy:** Vercel
- **Package manager:** npm

## File Structure

```
/app
  /layout.tsx          — Root layout (dark theme, fonts, metadata)
  /page.tsx            — Home / Scan screen
  /preferences/page.tsx — Preferences onboarding
  /results/page.tsx    — Menu Detected results list
  /dish/[id]/page.tsx  — Dish Detail view
  /api/scan/route.ts   — Menu scan endpoint (OCR + enrichment)
/components
  /ui/                 — Reusable UI primitives (Button, Card, Badge, Tag, Chip, Tooltip)
  /scan/               — Upload zone, image preview
  /preferences/        — Protein grid, spice selector, diet toggles
  /results/            — DishCard, RankBadge
  /dish/               — HeroImage, FloatingBadge, StatusTags, NutritionCard, IngredientChips, TermExplainer
/lib
  /store.ts            — Zustand store
  /types.ts            — TypeScript types (Dish, Preferences, etc.)
  /openai.ts           — OpenAI API helpers
  /ranking.ts          — Preference-based ranking logic
  /constants.ts        — Design tokens, dietary options, country list
/public
  /manifest.json       — PWA manifest
  /icons/              — App icons
```

## Design Tokens (Dark Theme)

```
Background:        #1a1a1a (main), #242424 (card surface), #2a2a2a (elevated)
Text primary:      #f5f5f5
Text secondary:    #a0a0a0
Text muted:        #707070
Accent (sage):     #8fbc8f
Accent hover:      #7aab7a

Tag dietary:       bg #3d2028, text #f4a0b0 (pink/rose)
Tag allergen:      bg #3d3520, text #f0c060 (yellow/amber)
Tag macro:         bg #1a3030, text #60c0b0 (teal)
Tag rank gold:     bg #3d3520, text #d4a030 (gold)

Badge protein:     #e05050 (red)
Badge vegetable:   #50b050 (green)
Badge sauce:       #e08030 (orange)
Badge carb:        #d0c040 (yellow)

Border:            #333333
Border subtle:     #2a2a2a
```

## Tailwind Config Extensions

Extend the default Tailwind config with the above tokens under `colors.pe` namespace:
- `pe-bg`, `pe-surface`, `pe-elevated`
- `pe-text`, `pe-text-secondary`, `pe-text-muted`
- `pe-accent`, `pe-accent-hover`
- `pe-tag-*`, `pe-badge-*`, `pe-border`

## Component Patterns

- All components are React Server Components by default; add `'use client'` only when needed (interactivity, hooks, browser APIs)
- Use Tailwind classes directly — no CSS modules or styled-components
- Mobile-first: design for 375px viewport, scale up
- Cards: `rounded-xl border border-pe-border bg-pe-surface p-4`
- Buttons: `rounded-full bg-pe-accent text-white font-semibold px-6 py-3`
- Tags: `rounded-full px-3 py-1 text-xs font-medium`

## API Route Architecture

### POST `/api/scan`

**Input:** `{ image: string }` (base64-encoded image)

**Pipeline:**
1. Call GPT-4o Vision with the image → extract structured menu items (name, price, description in original language)
2. Call GPT-4o with extracted items + user preferences → translate, enrich, classify each dish
3. Return `{ dishes: Dish[] }`

**Dish type:**
```typescript
interface Dish {
  id: string
  nameEnglish: string
  nameLocal: string
  description: string
  country: string
  price: string
  dietaryType: 'veg' | 'non-veg' | 'jain-safe'
  allergens: string[]
  ingredients: Ingredient[]
  nutrition: { protein: number; carbs: number; fat: number; fiber: number; kcal: number }
  explanation: string
  culturalTerms: CulturalTerm[]
  imageUrl?: string
  rankScore?: number
  rankLabel?: string
}

interface Ingredient {
  name: string
  category: 'protein' | 'vegetable' | 'sauce' | 'carb' | 'dairy' | 'spice' | 'other'
  isUnfamiliar: boolean
  explanation?: string
}

interface CulturalTerm {
  term: string
  explanation: string
}
```

## State Management

Zustand store with two slices:

1. **preferences** — synced to localStorage
   ```typescript
   { proteins: string[], spice: string, diet: string, restrictions: string[], allergies: string[] }
   ```

2. **scan** — ephemeral session state
   ```typescript
   { dishes: Dish[], isLoading: boolean, error: string | null, selectedDishId: string | null }
   ```

## Key Rules

- Never hardcode OpenAI API keys — use `OPENAI_API_KEY` env var
- Always show a disclaimer on dietary/allergen info: "AI-estimated. Verify with restaurant staff."
- Keep bundle size small — no heavy UI libraries
- Image uploads: compress client-side before sending to API (max 1MB)
- All AI prompts live in `/lib/openai.ts` for easy iteration
- Use `loading.tsx` and `error.tsx` in route segments for loading/error states
