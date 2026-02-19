# 09 — Approximate Currency Conversion

## What changed

Added approximate currency conversion so travelers can see foreign menu prices in their home currency. Uses hardcoded exchange rates (no API calls) with a `~` prefix to signal approximation.

## Why

Prices like "₩9,000" or "¥1,200" are meaningless to most travelers. A subtle converted price gives instant context without cluttering the UI.

## Files touched

| File | Change |
|------|--------|
| `src/lib/constants.ts` | Added `CURRENCY_OPTIONS`, `COUNTRY_CURRENCY`, `APPROX_RATES_TO_USD` |
| `src/lib/types.ts` | Added optional `homeCurrency?: string` to `Preferences` |
| `src/lib/currency.ts` | New file — `convertPrice()` and `convertTotal()` pure utilities |
| `src/app/preferences/page.tsx` | Added Home Currency pill section at top of onboarding |
| `src/app/settings/page.tsx` | Added Home Currency pill section at top of settings |
| `src/app/results/page.tsx` | Converted price shown below dish price on cards and skeletons |
| `src/app/order/page.tsx` | Per-item converted price inline; converted total in sticky bar |
| `docs/09-currency-conversion.md` | This changelog |

## Design decisions

- **No API calls**: Hardcoded rates updated Feb 2026. The `~` prefix communicates approximate.
- **USD pivot**: All conversions go source → USD → target for simplicity.
- **Opt-in**: No `homeCurrency` set by default. Conversion only appears after user picks one.
- **Deselectable**: Tapping a selected currency pill again deselects it, turning conversion off.
- **Graceful no-ops**: Returns `null` for unknown country, same currency, or unparseable price.
