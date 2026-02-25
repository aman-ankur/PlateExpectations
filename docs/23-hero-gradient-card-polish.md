# 23 — Dish Hero Gradient + Results Card Polish

## What Changed

### Part B: Dish Detail Hero — Minimal Tight Gradient
- **Replaced** heavy 60% gradient overlay with a tight bottom-25% dark scrim (`rgba(0,0,0,0.7)` → `rgba(0,0,0,0.35)` → `transparent`)
- Gradient div changed from `absolute inset-0` to `absolute bottom-0 left-0 right-0 h-[40%]`
- Added `text-shadow: 0 1px 8px rgba(0,0,0,0.5)` on country label, dish name, and subtitle for legibility
- Forced `text-white` on dish name and subtitle (always white on dark scrim, regardless of theme)
- Added `[&>span]:shadow-sm` on dietary tags row for subtle elevation against food image

### Part C: Results Page Cards — Refined Horizontal
- **Removed** image fade gradient (`bg-gradient-to-r from-transparent to-pe-surface`) for cleaner image edge
- **Moved price to top-right** of card body in a flex row with the title
- Price now `text-[15px] font-bold text-pe-text` (bigger, bolder, more scannable)
- **Solid accent add button**: `bg-pe-accent text-white shadow-sm` instead of ghost `bg-pe-accent/15 text-pe-accent`
- Button slightly larger: `h-8 w-8 rounded-[10px]` (was `h-7 w-7 rounded-lg`)
- Footer now has tags (left) + add button (right) — price no longer duplicated in footer

## Files Changed
- `src/app/dish/[id]/page.tsx` — hero gradient + text shadows
- `src/app/results/page.tsx` — card layout restructure

## Why
- Heavy gradient made food images dark and muddy — now ~75% of hero shows the food
- Price buried at bottom-left was hard to scan; top-right is the natural scan position
- Ghost add button was too subtle; solid coral button is more discoverable
