# Plate Expectations — Product Requirements Document

## Vision

Help Indian couples traveling to Southeast/East Asia for the first time confidently navigate foreign-language menus. Scan any menu with your phone camera and get a translated, personalized, visually rich breakdown of every dish.

## Problem Statement

First-time Indian travelers in Vietnam, Thailand, Korea, Japan, and Indonesia face menus they can't read. They don't know what dishes contain, whether items are vegetarian-safe, or what's worth ordering. This leads to anxiety, poor choices, and missed culinary experiences.

## Target Persona

- **Who:** Indian couples (25–45), first-time SE/East Asia travelers
- **Context:** Sitting in a restaurant abroad, staring at a menu in Thai/Vietnamese/Korean/Japanese/Indonesian
- **Need:** Instant understanding of what each dish is, what's in it, whether it fits their dietary needs, and what they should try

## Supported Countries

Vietnam, Thailand, Korea, Japan, Indonesia

## Core Flow

```
Camera/Upload → OCR (GPT-4o Vision) → Translate & Enrich (GPT-4o) → Personalized Results → Dish Detail
```

---

## Screens

### Screen 1: Home / Scan

The landing screen. Minimal, focused on the single action: scan a menu.

- App title + tagline: "Decode any menu, anywhere"
- Large dashed-border upload zone with camera icon
- "Scan a menu" heading + "Upload a photo of any foreign menu" subtext
- "Choose Photo" button (sage green, rounded) — triggers camera or file picker
- Footer guidance text

### Screen 2: Preferences (Onboarding)

Shown on first launch (or accessible from settings). Stored in localStorage.

- **Protein selection:** Multi-select grid — Chicken, Beef, Pork, Seafood (with emoji icons). Selecting means "I eat this."
- **Spice tolerance:** Single-select — Mild, Medium, Spicy, Any
- **Dietary mode:** Veg / Non-Veg / Jain
- **Restrictions:** Halal, No Beef, No Pork, Allergies (egg, soy, sesame, peanut, shellfish, gluten)
- "Continue" button + "Skip for now" link

### Screen 3: Menu Detected (Results List)

Displayed after AI processing completes.

- Header: "Menu Detected" + "X items identified" + back arrow
- Cards sorted by personalized rank based on preferences
- Each card shows:
  - Gold badge with rank (e.g., "TOP PICK FOR YOU", "#3 FOR YOU")
  - Dish name in English (bold) + local script below
  - Short English description (2-line truncated)
  - Price on the right + chevron for detail
- Loading state while AI processes

### Screen 4: Dish Detail

Full breakdown of a single dish.

- **Hero image:** Full-width photo (real photo via web search, AI-generated fallback)
  - Floating ingredient badges over image (color-coded: red=protein, green=vegetables, orange=sauce, yellow=carb)
- **Below image:**
  - Country label (uppercase, sage green)
  - Dish name (large bold) + local script
  - Three status tags: Dietary type (pink), Allergens (yellow), Primary macro (teal)
  - "What is this dish?" — conversational English explanation
  - "Approx. Nutrition" — 4-column layout: Protein, Carbs, Fat, Fiber (with kcal estimate)
  - "Ingredients" — chip/pill tags, `?` icon on unfamiliar terms
  - "Unfamiliar Terms? Tap to Learn" — tappable chips with inline tooltip explanations

---

## Dietary & Allergen System

| Category | Options |
|----------|---------|
| Diet type | Vegetarian, Non-Vegetarian, Jain |
| Proteins enjoyed | Chicken, Beef, Pork, Seafood |
| Spice tolerance | Mild, Medium, Spicy, Any |
| Restrictions | Halal, No Beef, No Pork |
| Allergies | Egg, Soy, Sesame, Peanut, Shellfish, Gluten |

The AI pipeline uses these preferences to:
1. Flag dishes that violate dietary restrictions (with clear warnings)
2. Rank dishes by compatibility and likely enjoyment
3. Highlight allergens in the detail view

## AI Pipeline Architecture

```
1. CAPTURE: User uploads/photographs a menu
2. OCR: GPT-4o Vision extracts text from the menu image
   - Input: menu photo
   - Output: structured list of dish names, prices, descriptions (in original language)
3. TRANSLATE & ENRICH: GPT-4o processes each dish
   - Translate dish name + description to English
   - Identify ingredients, dietary classification, allergens
   - Generate conversational "what is this" explanation
   - Estimate approximate nutrition
   - Identify unfamiliar cultural terms with explanations
4. RANK: Score dishes against user preferences
   - Dietary compatibility (hard filter: flag violations)
   - Protein match, spice match (soft rank)
   - Popularity/recommendation signal from GPT knowledge
5. DISPLAY: Render results list → detail views
```

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| OCR fails on handwritten/blurry menus | Show clear error + retry prompt; GPT-4o Vision handles most printed menus well |
| Incorrect dietary classification | Always show ingredients list; add disclaimer "AI-estimated, verify with staff" |
| Slow API response (multiple GPT calls) | Stream results; show loading skeleton; batch dish enrichment |
| OpenAI API costs | Cache results by menu image hash; rate limit per session |
| No internet in restaurant | Phase 2: offline mode with cached results |
| Dish photo not found | AI-generated fallback image; clear "illustration" label |
