# 19 — Light Theme + Playful Redesign

## Summary
Redesigned the entire app from a dark monochrome theme to a warm, playful light-first design with cream backgrounds, soft shadows, coral accents, and rounded cards. Dark mode preserved as a toggle option in Settings.

## What Changed

### Foundation
- **`globals.css`**: CSS variables under `:root` (light) and `.dark` (dark) for all `--pe-*` tokens
- **`tailwind.config.ts`**: All `pe-*` colors now reference CSS variables (`var(--pe-*)`), added `darkMode: 'class'`, new `pe-teal`/`pe-amber` colors, `shadow-pe-card`/`shadow-pe-lg` shadow tokens
- **`store.ts`**: Added `theme: 'light' | 'dark'` state with `setTheme()` action, persisted to localStorage
- **`layout.tsx`**: Blocking `<script>` to apply `.dark` class before paint (no flash), switched font from Inter to DM Sans, updated `themeColor` to `#faf8f5`

### Design Language
- Borders → soft shadows (`shadow-pe-card`) on all cards/buttons
- `rounded-2xl` → `rounded-3xl` on main dish cards
- Ring overlays removed (replaced with shadow)
- Sage green accent (`#8fbc8f`) → coral (`#f25c54`)
- Black pill CTAs (`bg-pe-text text-pe-bg`) for primary actions (Gallery, Continue, Save, Analyze)
- Sort toggle pills: active state uses `bg-pe-text text-pe-bg`
- Error states: `bg-red-50 dark:bg-red-950/30`

### Per-File
- **`page.tsx`** (home): Upload zone uses shadow card instead of dashed border
- **`results/page.tsx`**: DishCard uses `shadow-pe-card rounded-3xl`, skeleton cards too
- **`dish/[id]/page.tsx`**: Hero gradient uses `var(--pe-hero-base)` via inline style, sticky bar uses `var(--pe-sticky-bg)`, content cards use shadow, fiber color changed to `pe-teal`
- **`order/page.tsx`**: Item cards use `shadow-pe-card`, sticky bar uses `var(--pe-sticky-bg)`, device voice button uses shadow instead of border
- **`preferences/page.tsx`**: Inactive buttons use shadow instead of border, CTA is black pill
- **`settings/page.tsx`**: New Light/Dark theme toggle section, same shadow treatment
- **`OrderFab.tsx`**: Uses `shadow-pe-lg` instead of border
- **`SpiceMeter.tsx`**: Thumb shadow updated to `shadow-pe-lg`

## Files Touched
- `src/app/globals.css`
- `tailwind.config.ts`
- `src/lib/store.ts`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/results/page.tsx`
- `src/app/dish/[id]/page.tsx`
- `src/app/order/page.tsx`
- `src/app/preferences/page.tsx`
- `src/app/settings/page.tsx`
- `src/components/OrderFab.tsx`
- `src/components/SpiceMeter.tsx`
