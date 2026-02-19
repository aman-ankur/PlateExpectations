# 10 — Spice Meter, Default Currency, Live Rates, Order Clearing

## What Changed

### 1. Spice Meter Component
Replaced pill-button spice selector with a draggable meter on both preferences and settings pages.

- 6 snap points: No Heat, Mild, Medium, Spicy, Very Spicy, Burn Me
- Gradient track (green to red) with circular emoji thumb
- Touch drag + tap-to-position via pointer events
- Labels with emojis below the track
- Default value for new users: Medium

**New file:** `src/components/SpiceMeter.tsx`
**Modified:** `src/app/preferences/page.tsx`, `src/app/settings/page.tsx`

### 2. Default Home Currency to INR
Changed `DEFAULT_PREFERENCES.homeCurrency` from `undefined` to `'INR'`. Existing users with localStorage are unaffected.

**Modified:** `src/lib/types.ts`

### 3. Live Exchange Rates
Added background fetch of live exchange rates from `open.er-api.com` (free, no API key).

- New API route proxies the request; demo mode returns hardcoded rates
- Store caches rates and skips re-fetch within 6 hours
- `ExchangeRateLoader` component triggers fetch on app mount
- `convertPrice()` and `convertTotal()` accept optional `rates` param, falling back to hardcoded rates
- Results page and order page pass live rates to conversion functions

**New files:** `src/app/api/exchange-rates/route.ts`, `src/components/ExchangeRateLoader.tsx`
**Modified:** `src/lib/currency.ts`, `src/lib/store.ts`, `src/app/layout.tsx`, `src/app/results/page.tsx`, `src/app/order/page.tsx`

### 4. Clear Order on New Scan
Previous order items no longer persist into the next scan. `clearOrder()` is called at the start of each new scan in the results page effect.

**Modified:** `src/app/results/page.tsx`
