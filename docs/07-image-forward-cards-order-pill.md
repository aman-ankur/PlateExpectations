# 07 — Image-Forward Cards + Order Builder + Compact Order Pill

## What changed

### 1. Dish card redesign — editorial image-forward layout
The dish cards on the results page were redesigned to make food photography the hero element, matching the immersive approach already used on the dish detail page.

**Before:** 64px square thumbnail in a bordered box, bolted onto a padded card.
**After:** 112px-wide image spanning the full card height, with a gradient fade dissolving the image into the card surface.

Key design decisions:
- `overflow-hidden` + `rounded-2xl` clips the image into the card's rounded corners naturally
- A `w-12` gradient overlay (`from-transparent to-pe-surface`) on the image's right edge creates a seamless blend — no hard border between photo and content
- Card elevation via `shadow-md shadow-black/25` + `ring-1 ring-white/[0.06]` (barely-perceptible edge) replaces the old hard `border border-pe-border`
- Hover lifts with deeper shadow; long-press flash uses `ring-2 ring-pe-accent` glow
- No padding on the card itself — image goes edge-to-edge, text area has its own `py-3 pr-3`
- Skeleton/streaming cards updated to match the new layout

### 2. Order builder — tap + button to add dishes
- Explicit "+" button on each dish card adds it to the order (with a green flash confirmation)
- ~~Long-press removed~~ — was undiscoverable on mobile; scroll gestures conflicted with long-press detection
- Tap on card navigates to dish detail
- Order quantity badge shown on the image area
- Order state managed in Zustand store with `order`, `addToOrder`, `removeFromOrder`, `updateQuantity`, `clearOrder`
- Dish detail page has a sticky add-to-order bar with quantity controls
- Order auto-cleared on new menu scan

### 3. OrderFab — compact centered pill
**Before:** Full-width accent-green bar spanning edge to edge.
**After:** Compact auto-width pill, centered at bottom:
- `bg-pe-surface/95 backdrop-blur border border-pe-border rounded-full` — muted, glass-like
- Layout: `[cart icon] View Order · N items | [x]`
- The x clears the entire order
- `animate-slide-up` entrance

### 4. Order page + TTS
- New `/order` page showing order summary with quantity controls
- Text-to-speech API endpoint for reading dish names aloud
- Order templates for common ordering phrases

## Files changed
- `src/app/results/page.tsx` — Card redesign, long-press, OrderFab integration, skeleton cards
- `src/components/OrderFab.tsx` — New compact pill component
- `src/app/order/page.tsx` — New order summary page
- `src/app/dish/[id]/page.tsx` — Sticky add-to-order bar
- `src/app/api/tts/route.ts` — Text-to-speech endpoint
- `src/app/globals.css` — slide-up animation
- `src/lib/store.ts` — Order state (order map, CRUD actions, clearOrder)
- `src/lib/types.ts` — Order-related types
- `src/lib/useLongPress.ts` — Long-press hook (distinguishes tap vs hold)
- `src/lib/orderTemplates.ts` — Ordering phrase templates
- `src/components/OrderItemCard.tsx` — Order item component
- `docs/06-order-builder-voice.md` — Earlier order builder planning doc
- `docs/backlog.md` — Updated backlog
- `CLAUDE.md` — Updated project docs
