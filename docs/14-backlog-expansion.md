# Changelog 14 — Backlog Expansion: Social, Intelligence, Crowdsourcing, Nutrition, Offline

## What Changed
Expanded the backlog from 5 priority sections to 10, adding 14 new feature items across 5 new categories.

## New Priority Sections

### Priority 6: Social & Group Features
- **6.1 Table QR sharing** — Collaborative ordering via shareable link/QR. Real-time sync with SSE, ephemeral sessions, no auth required.
- **6.2 Group ordering** — Named sections per person in the order, combined "Show to Staff" view.

### Priority 7: Real-World Intelligence
- **7.1 Price intelligence** — Value badges (Good Value/Typical/Premium) from LLM + cross-restaurant price comparison from scan history.
- **7.2 Restaurant context detection** — "How to Eat Here" expandable guide with cuisine-specific etiquette and ordering tips.
- **7.3 Adventurous sort** — Re-rank menu by uniqueness/unfamiliarity relative to user's home cuisine.
- **7.4 Portion size guidance** — Individual vs shared vs family-style indicators.
- **7.5 Pair with suggestions** — Side dish and drink pairings from the same menu.

### Priority 8: Crowdsourced Content
- **8.1 Photo your actual dish** — Cloud-stored (Cloudflare R2) crowdsourced photo library keyed by dish + restaurant GPS.
- **8.2 Menu comparison** — Compare overlapping dishes and prices across multiple scanned restaurants.

### Priority 9: Diet & Nutrition
- **9.1 Macro-based diet filters** — Keto/high-protein/low-carb toggles in preferences + results page filter chips.
- **9.2 Ingredient substitution requests** — Hybrid template + AI-generated modification phrases in local language with TTS.

### Priority 10: Performance & Offline
- **10.1 Offline cached cuisines** — Pre-packaged enrichment for top 50-100 dishes per cuisine (East Asian + European first). ~2MB for 10 cuisines.
- **10.2 Full-screen kiosk mode** — Dedicated "Show to Staff" view with large text, high contrast, prominent TTS button.

## Files Changed
- `docs/backlog.md` — Added ~180 lines across 5 new priority sections
- `CLAUDE.md` — Minor doc fixes (demo image notes, Wikimedia URL warning)
- `docs/12-mobile-ux-hero-demo.md` — Minor update
- `docs/13-dalle-static-images.md` — New changelog (from previous session)
