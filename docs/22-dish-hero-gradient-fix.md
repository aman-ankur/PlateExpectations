# 22 — Strengthen Dish Detail Hero Gradient

## Problem

The gradient overlay on the dish detail hero image was too subtle. The dish name, dietary tags, allergen badges, and "AI Generated" label were nearly invisible against bright food images — especially AI-generated ones with vibrant colors.

## Changes

| File | Change |
|------|--------|
| `src/app/dish/[id]/page.tsx` | Stronger 4-stop gradient: solid base → 85% at 20% → 45% at 40% → transparent at 60% (was: solid → 40% at 18% → transparent at 40%). Tag backgrounds changed from `/80` opacity to full opacity; AI Generated badge from `/20` to `/30` bg and `font-semibold`. |

## Before vs After

- **Before**: Gradient faded to transparent at 40% height with only 40% opacity at 18%. Tags used 80% opacity backgrounds.
- **After**: Gradient extends to 60% height with 85% opacity at 20% and 45% at 40%. Tags use full opacity backgrounds. Text and badges are clearly readable on any food image.
