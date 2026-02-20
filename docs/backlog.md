# Plate Expectations — Improvement Backlog

## Priority 1: Perceived Speed & Loading UX

### 1.1 Progressive dish loading
- **What**: Show dishes one-by-one as Phase 2 enrichment batches complete, instead of waiting for all batches
- **Why**: First dishes appear in ~20s instead of ~45s. Users can start browsing immediately.
- **How**: NDJSON streaming via ReadableStream, unified skeleton→enriched card list
- **Status**: DONE

### 1.2 Better loading progress indicator
- **What**: Step-by-step progress: rotating messages during Phase 1, enrichment counter during Phase 2
- **Why**: Makes 45s wait feel shorter. Users know something is happening.
- **How**: Rotating client-side messages + menu image preview during Phase 1, batch counter during Phase 2
- **Status**: DONE

### 1.3 Scan new menu button
- **What**: Button to clear current results and scan another menu
- **Why**: Currently no way to scan again without refreshing the page
- **How**: clearScan() in Zustand store, button in header
- **Status**: DONE

### 1.4 Replace Phase 1 Vision OCR with dedicated OCR + Translate
- **What**: Use Google Cloud Vision (or Tesseract.js client-side) for OCR, Google Translate for translation, skip GPT Vision entirely for Phase 1
- **Why**: Cuts Phase 1 from ~15s to ~2-3s. OCR and translation are solved problems — GPT Vision is overkill.
- **How**: Client-side Tesseract.js OCR while uploading, server-side Google Translate, simple parsing to structure dishes
- **Status**: TODO

### 1.5 Image hash caching
- **What**: Hash menu images and cache scan results. Same photo = instant results.
- **Why**: Repeat scans of same menu (common in groups) skip all API calls
- **How**: perceptual hash or SHA of compressed image, Redis/KV cache
- **Status**: TODO

### 1.6 Restaurant menu DB
- **What**: Recognize known restaurants via GPS + image matching, serve pre-cached menus
- **Why**: Eliminates all wait time for known restaurants
- **How**: Build menu DB over time from user scans, match by location + image similarity
- **Status**: TODO

### 1.7 Improve dish image match rate
- **What**: ~50% of dishes get no image from Wikipedia. Add fallback image sources and smarter query construction.
- **Why**: Empty plate icons look unfinished and reduce trust
- **How**: Try English name fallback if local script fails, add Pexels/Unsplash API as fallback, use `imageSearchQuery` from GPT enrichment as secondary query
- **Status**: DONE (Vision validation + DALL-E fallback ensures every dish gets an image)

### 1.8 Vision-validated dish images
- **What**: Use GPT-4o-mini Vision to validate image candidates before showing them. DALL-E 3 generates images when no real photo matches.
- **Why**: Text-based search matches keywords not content — "순대" (blood sausage soup) matched StrawberrySundae.jpg, "Marinated Pork" matched sushi images
- **How**: Filename heuristic pre-filter (free) → high-confidence food filenames accepted instantly → remaining candidates Vision-validated in parallel (3 at a time) → DALL-E fallback. AI-generated images show ✨ badge.
- **Status**: DONE

### 1.9 Optimize results page re-renders
- **What**: Extract DishCard as top-level component with targeted Zustand selectors
- **Why**: Each image load triggered full-page re-render of 20+ cards, making UI sluggish during image loading
- **How**: DishCard subscribes only to its own `dishImages[dish.id]` via `useStore((s) => s.dishImages[dish.id])` instead of entire store
- **Status**: DONE

## Priority 2: Core Functionality

### 2.1 Multi-page menu support
- **What**: Upload 2-3 photos for multi-page menus, merge results
- **Why**: Most restaurant menus span multiple pages
- **How**: Accept array of images, run Phase 1 on each, merge dish lists, run Phase 2 on combined list
- **Status**: TODO

### 2.2 Price currency conversion
- **What**: Show prices in user's home currency alongside original
- **Why**: Travelers don't know exchange rates off the top of their head
- **How**: Auto-detect currency from menu country, use a free exchange rate API, let user set home currency in preferences
- **Status**: DONE (live rates via open.er-api.com with 6-hour cache, fallback to approximate rates, default INR)

### 2.3 Scan history
- **What**: Save past scans to localStorage so users can revisit previous restaurants
- **Why**: Users want to reference what they ordered or compare menus
- **How**: Store scan results with timestamp and restaurant name (GPT can infer from menu) in localStorage
- **Status**: TODO

### 2.4 Share a dish
- **What**: Share button on dish detail to send info to a travel companion
- **Why**: Couples/groups deciding what to order together
- **How**: Use Web Share API (native share sheet on mobile) with dish name, photo, description
- **Status**: TODO

### 2.5 Order builder with voice ordering
- **What**: Select dishes from results into an "order", view order summary with local-script text, and generate a spoken ordering phrase in the local language to play for restaurant staff
- **Why**: Closes the gap between understanding a menu and actually ordering. Travelers can't pronounce foreign dish names — a voice message eliminates the language barrier entirely.
- **How**:
  - Explicit + button on each dish card to add to order (long-press removed — undiscoverable on mobile)
  - Order summary page: selected dishes with quantities (+/- controls), local-script names, prices, total
  - **Text display**: Full order shown in local script as a "show your phone" fallback — works offline, no API needed
  - **Voice generation**: Construct a polite ordering phrase from per-language templates (e.g., "안녕하세요, [dish1] 하나, [dish2] 두 개 주세요. 감사합니다") → generate audio via ElevenLabs TTS API (multilingual v2 model supports Korean/Thai/Vietnamese/Japanese/etc.)
  - Big play button UI designed for handing phone to waiter
  - Browser `speechSynthesis` as free fallback when ElevenLabs unavailable
  - `ELEVENLABS_API_KEY` env var, API route `/api/tts` to keep key server-side
- **Cost**: ElevenLabs ~$0.30/1K chars, typical order phrase ~100-200 chars = ~$0.03-0.06 per order
- **Status**: DONE (order builder with + button, order page with quantity controls, TTS endpoint, order auto-cleared on new scan)

### 2.6 Allergen/dietary alerts on order
- **What**: When user adds a dish that conflicts with their dietary preferences, show a warning on the order page
- **Why**: Safety net — users might miss the allergen tags while browsing and accidentally order something they can't eat
- **How**: Cross-reference order items against user preferences, show inline warnings with specific allergen/ingredient callouts
- **Status**: TODO

### 2.7 Group ordering
- **What**: Multiple people at the table can each select their dishes, with a combined order summary
- **Why**: Groups traveling together are a primary use case — everyone scans the same menu
- **How**: Tabs or named sections in the order ("Person 1", "Person 2"), each with their own selections, combined voice message
- **Status**: TODO

## Priority 3: Image Quality

### 3.1 Pexels API fallback for dish images
- **What**: Add Pexels as a fallback when Wikipedia has no image
- **Why**: Professional food photography, free (200 req/hr), covers dishes Wikipedia misses
- **How**: Get free API key from pexels.com, add as third fallback after Wikipedia + Commons
- **Status**: LOW PRIORITY (DALL-E fallback now covers all gaps, Pexels would reduce DALL-E cost)

### 3.2 Vision validation result caching
- **What**: Cache Vision validation results (image URL + dish name → YES/NO) to avoid re-validating the same candidates
- **Why**: Same Wikipedia images appear across scans; caching avoids redundant API calls
- **How**: In-memory LRU cache or Redis, keyed by image URL hash + dish name
- **Status**: TODO

### 3.3 DALL-E image caching
- **What**: Cache DALL-E generated images permanently instead of using ephemeral URLs
- **Why**: DALL-E URLs expire after ~1 hour; re-scanning same menu regenerates images at $0.04 each
- **How**: Upload DALL-E images to Cloudflare R2 or Vercel Blob, cache by dish name hash
- **Status**: PARTIAL (5 demo dishes have static DALL-E images in `public/demo-images/`; production scan still uses ephemeral URLs)

### 3.4 Fix broken demo multi-image gallery URLs
- **What**: 4 common demo dishes (Bibimbap, Kimchi Jjigae, Bulgogi, Tteokbokki) have 3-image arrays but only the 1st URL works — 2nd and 3rd Wikimedia URLs return 404
- **Why**: Gallery swipe only shows 1 image instead of 3 for these dishes in demo mode
- **How**: Use Wikipedia API to find real image filenames, or source from Unsplash/Pexels, or generate more DALL-E images as static assets
- **Status**: TODO

## Priority 4: Polish & Production

### 4.1 UI polish pass
- **What**: Compare each screen against design mockups, fix spacing/sizing/colors
- **Why**: Current UI is functional but not polished
- **How**: Screen-by-screen comparison with mockups
- **Status**: IN PROGRESS — Dish detail hero decluttered (toggle badges, lighter gradient, compact text overlay, AI tag inline with dietary tags). Mobile touch fixes (scroll vs tap discrimination, explicit + button). Spice meter with draggable slider. Results cards use simple tap navigation.

### 4.2 Camera integration
- **What**: Direct camera capture instead of file upload picker
- **Why**: Faster UX — tap to scan instead of browse files
- **How**: Use `getUserMedia` API with rear camera, capture frame as image
- **Status**: TODO

### 4.3 PWA offline shell
- **What**: Service worker caches app shell for instant load without network
- **Why**: App should load instantly even on spotty travel wifi
- **How**: next-pwa or custom service worker for static asset caching
- **Status**: TODO

### 4.4 Error recovery
- **What**: If one enrichment batch fails, still show the others
- **Why**: Currently one failed batch causes the entire scan to fail
- **How**: Use `Promise.allSettled` instead of `Promise.all`, return partial results
- **Status**: DONE (batch promises catch errors individually, empty batches skipped, retry logic per batch)

### 4.5 Response caching
- **What**: Cache scan results by image hash so re-scanning the same menu is instant
- **Why**: Users might re-upload the same photo or scan the same menu twice
- **How**: Hash the image client-side, check localStorage before calling API
- **Status**: TODO

### 4.6 Analytics
- **What**: Track cuisines/countries scanned, average scan times, error rates
- **Why**: Understand usage patterns, identify performance bottlenecks
- **How**: Lightweight event logging (Vercel Analytics or custom)
- **Status**: TODO

### 4.7 Accessibility pass
- **What**: Screen reader support, color contrast checks, keyboard navigation
- **Why**: Usability for visually impaired travelers; also improves general UX
- **How**: aria labels, focus management, contrast ratios per WCAG 2.1 AA
- **Status**: TODO

## Priority 5: Smart Features & Intelligence

### 5.1 Dish recommendations
- **What**: AI-powered "Recommended for you" section based on preferences, past orders, and popularity
- **Why**: Decision fatigue on a 30-dish menu — surface the 3-5 best bets
- **How**: Already have preference-based ranking (top 5 labels). Extend with collaborative filtering if scan history (2.3) is built, or use LLM to pick "must-try" dishes for the cuisine
- **Status**: TODO

### 5.2 "What's popular here?" — crowd insights
- **What**: If multiple users scan the same restaurant, surface which dishes are most frequently ordered
- **Why**: Social proof helps travelers pick confidently
- **How**: Requires backend (restaurant DB from 1.6 + order tracking). Lightweight version: LLM adds a "signature dish" flag during enrichment based on its knowledge
- **Status**: TODO

### 5.3 Spice level & taste profile
- **What**: Visual spice meter and taste profile (sweet/sour/salty/umami/bitter) per dish
- **Why**: Travelers often get surprised by spice levels — a visual indicator prevents bad surprises
- **How**: Add to enrichment prompt, display as a small flame/pepper icon row on dish cards
- **Status**: TODO

### 5.4 Portion size & sharing guidance
- **What**: Indicate whether a dish is individual-sized, shareable, or family-style, with estimated serving size
- **Why**: Portion conventions vary wildly by country — Korean BBQ is shared, Japanese ramen is individual
- **How**: Add to enrichment prompt, show as badge or note on dish detail
- **Status**: TODO

### 5.5 "Pair with" suggestions
- **What**: Suggest side dishes, drinks, or complementary items from the same menu
- **Why**: Travelers don't know local meal conventions (e.g., Korean meals come with banchan, Thai meals pair with rice)
- **How**: LLM suggests pairings from the scanned menu during enrichment or as a post-processing step
- **Status**: TODO

### 5.6 Real-time menu translation overlay (AR)
- **What**: Point camera at menu, see translated text overlaid on the original in real-time
- **Why**: More natural than scan-and-wait — like Google Lens but with enriched dish info
- **How**: WebXR or canvas overlay with OCR + translation running on each frame. Heavy lift — requires optimized on-device OCR
- **Status**: FUTURE

### 5.7 Dietary preference auto-detection
- **What**: Analyze a user's past orders to infer dietary patterns and suggest preference updates
- **Why**: Users may not set preferences explicitly but consistently avoid certain foods
- **How**: Pattern analysis over scan history, prompt to update preferences
- **Status**: FUTURE

## Priority 6: Social & Group Features

### 6.1 Table QR sharing — collaborative ordering
- **What**: After scanning a menu, generate a shareable link/QR code. Anyone at the table opens it on their phone, sees the same menu with their own dietary preferences applied, and adds dishes to a shared real-time order.
- **Why**: Groups are a primary use case — one person scans, everyone orders together. Currently only the scanner can interact with results. This is also a viral growth mechanic (every scan introduces 3-5 new people to the app).
- **How**:
  - Scanner taps "Share with table" → generates a short-lived session (Vercel KV or Cloudflare KV, 2-hour TTL)
  - Session stores: dish data (full enrichment), shared order state
  - Shareable via QR code (rendered client-side with `qrcode` lib) or Web Share API link
  - Guests open link → apply their own preferences (stored locally) → browse the same menu with personalized ranking
  - Shared order uses server-sent events (SSE) or polling for real-time sync — everyone sees dishes added by others
  - Each person tagged by name/emoji avatar (entered on join, stored in session)
  - Host can "lock" the order when ready → combined "Show to Staff" view with all dishes grouped
  - No auth required — ephemeral sessions, privacy-friendly
- **Cost**: Vercel KV ~free tier for short-lived sessions. SSE is free (server-push over HTTP).
- **Dependencies**: None (works with current scan pipeline)
- **Status**: TODO

### 6.2 Group ordering with named sections
- **What**: Extension of the order page — each person at the table has a named section showing their picks, with a combined total and combined "Show to Staff" text
- **Why**: When the phone gets passed to the waiter, the staff can see which dishes go to which person. Also helps split the bill.
- **How**: Build on top of 6.1 (table sharing). Each participant's selections tagged with their name. Order page shows collapsible sections per person + a "Full Order" view. Combined TTS phrase groups by person: "Person 1: bibimbap, dakgalbi. Person 2: bulgogi, japchae."
- **Dependencies**: 6.1 (table sharing) or can work standalone as tabs in the order page for a single device
- **Status**: TODO

## Priority 7: Real-World Intelligence

### 7.1 Price intelligence — value badges + cross-restaurant comparison
- **What**: Two tiers of price insight:
  1. **Value badge** on each dish: "Good Value" / "Average" / "Premium" based on LLM knowledge of typical prices for that dish in that country
  2. **Cross-restaurant comparison** (requires scan history 2.3): "This bibimbap is ₩9,000 — you paid ₩7,000 at the place you scanned yesterday"
- **Why**: Travelers have no price calibration. Tourist-trap restaurants charge 2-3x local prices. Even locals appreciate knowing if a dish is fairly priced.
- **How**:
  - Tier 1: Add to enrichment prompt — ask LLM to classify price as below-average/average/above-average for the dish+country. Display as a small badge (green "Good Value" / gray "Typical" / amber "Premium") on dish cards.
  - Tier 2: When scan history (2.3) exists, compare prices of matching dishes across scans. Show delta on dish detail: "30% less than Restaurant X" or "Most expensive you've seen."
  - Price comparison uses `nameEnglish` as the matching key (fuzzy match for variants like "Bibimbap" vs "Dolsot Bibimbap")
- **Dependencies**: Tier 1 standalone. Tier 2 requires 2.3 (scan history).
- **Status**: TODO

### 7.2 Restaurant context detection — "How to Eat Here" guide
- **What**: Detect the type of restaurant (BBQ, noodle shop, street food, izakaya, fine dining, etc.) from the menu content and show a dedicated expandable "How to Eat Here" section at the top of results.
- **Why**: Ordering conventions, etiquette, and meal structure vary wildly. Korean BBQ: you cook at the table, banchan is free and unlimited. Japanese izakaya: small plates meant for sharing. Thai street food: point and pay. Travelers miss these norms and feel lost.
- **How**:
  - During Phase 2 enrichment (or as a separate lightweight LLM call after Phase 1), classify restaurant type from the dish list
  - Generate 3-5 contextual tips: how to order, what comes free, tipping norms, meal structure, etiquette dos/don'ts
  - Display as an expandable card below the header: icon + "Korean BBQ Restaurant" title, tap to expand tips
  - Tips are cuisine+restaurant-type specific, e.g.:
    - Korean BBQ: "Meat is cooked at your table. Banchan (side dishes) are free and refillable. Wrap meat in lettuce with ssamjang."
    - Japanese Ramen: "Slurping is polite. Don't tip. Choose your broth richness and noodle firmness."
    - Thai Street Food: "Point at what you want. Pay cash. Water/ice is usually free."
  - Can be pre-cached for common restaurant types (saves LLM call) or generated dynamically
- **Dependencies**: None
- **Status**: TODO

### 7.3 "I'm feeling adventurous" — sort by uniqueness
- **What**: A sort/filter mode on the results page that re-ranks the entire menu by "how unfamiliar/adventurous" each dish is relative to the user's home cuisine (inferred from preferences).
- **Why**: Many travelers specifically want the authentic local experience but don't know which dish is the "real" one vs. a safe tourist pick. They'd love guidance like "this is the dish locals order that you've never heard of."
- **How**:
  - Add an `adventureScore` (1-10) to the enrichment prompt: "Rate how unfamiliar this dish would be to someone from [user's home country]. 1 = very common internationally (fried rice), 10 = highly local/unusual (blood sausage, fermented skate)."
  - Home country inferred from currency selection (USD → American, INR → Indian, etc.)
  - New sort option on results page: "Adventurous" alongside existing "Menu Order" and "Recommended"
  - High-adventure dishes get a badge: "🗺️ Local Favorite" or "🔍 Hidden Gem"
  - Could also spotlight the single most adventurous dish at the top as a "Try Something New" callout
- **Dependencies**: None (enrichment prompt change only)
- **Status**: TODO

### 7.4 Portion size & sharing guidance
- **What**: Indicate whether a dish is individual-sized, shareable, or family-style, with estimated serving size
- **Why**: Portion conventions vary wildly by country — Korean BBQ is shared, Japanese ramen is individual. Travelers over-order or under-order constantly.
- **How**: Add to enrichment prompt: `portionType` (individual/shared/family), `servingSize` (e.g., "feeds 1", "feeds 2-3"), `orderingTip` (e.g., "Order one per person" or "One is enough for the table"). Display as a small icon + text below the price on dish cards.
- **Dependencies**: None
- **Status**: TODO

### 7.5 "Pair with" suggestions
- **What**: Suggest side dishes, drinks, or complementary items from the same menu
- **Why**: Travelers don't know local meal conventions (e.g., Korean meals come with banchan, Thai meals pair with rice, Japanese curry always comes with rice and pickles)
- **How**: LLM suggests pairings from the scanned menu during enrichment or as a post-processing step. Show on dish detail: "Goes well with: Kimchi Jjigae, Soju" with tap-to-add-to-order.
- **Dependencies**: None
- **Status**: TODO

## Priority 8: Crowdsourced Content & Photos

### 8.1 "Photo of your actual dish" — crowdsourced photo library
- **What**: After ordering, let users snap a photo of what arrived. Photos are uploaded to a shared cloud library keyed to dish name + restaurant location. Future users scanning the same restaurant see real photos instead of Wikipedia/DALL-E images.
- **Why**: Wikipedia images are editorial/generic. DALL-E images are AI-generated. Nothing beats a real photo of the actual dish at the actual restaurant. Over time this builds organically — every user contributes.
- **How**:
  - "Photo your dish" button on order page (appears after order is placed, or as a post-meal prompt)
  - Camera capture or gallery upload → compress client-side (reuse existing `compress.ts`)
  - Upload to Cloudflare R2 (or Vercel Blob), keyed by: `{dishNameEnglish}_{restaurantId}_{timestamp}`
  - Restaurant ID = GPS coordinates rounded to ~50m precision + menu image hash (groups scans of same restaurant)
  - Metadata stored in Cloudflare KV: dish name, restaurant location, upload timestamp, user-assigned quality rating
  - Future scans at the same restaurant prioritize crowdsourced photos over Wikipedia/DALL-E
  - Moderation: basic NSFW filter via a lightweight Vision check before storing. Community flagging for bad photos.
  - Privacy: no user accounts needed, photos are anonymous, GPS is coarse-grained
- **Cost**: R2 storage ~$0.015/GB/month, negligible for compressed food photos (~80KB each). 10,000 photos = ~800MB = ~$0.01/month.
- **Dependencies**: Lightweight backend (R2 + KV). Optional: 1.6 (restaurant DB) for better restaurant matching.
- **Status**: TODO

### 8.2 Menu comparison across restaurants
- **What**: When a user has scanned multiple restaurants of the same cuisine, show a comparison: overlapping dishes, price differences, unique offerings at each place.
- **Why**: Travelers restaurant-hop and want to know "is this place better/cheaper than the one I saw yesterday?" Especially useful in food streets or market areas with 10+ stalls selling similar items.
- **How**:
  - Requires scan history (2.3) with at least 2 scans of the same cuisine
  - Match dishes across scans by `nameEnglish` (fuzzy match for variants)
  - Comparison view: side-by-side cards showing price delta, which dishes are unique to each restaurant
  - "This place has 5 dishes you saw at Restaurant X, averaging 15% cheaper"
  - Accessible from scan history page or as a prompt after scanning a second restaurant of the same cuisine
- **Dependencies**: 2.3 (scan history), 7.1 Tier 2 (price comparison)
- **Status**: TODO

## Priority 9: Diet & Nutrition

### 9.1 Macro-based diet filters (keto, high-protein, low-carb)
- **What**: Filter/sort dishes by macronutrient profile. Set defaults in preferences (persistent), quick-toggle on results page (per-session).
- **Why**: Health-conscious travelers, people on specific diets (keto travelers are a real segment), or anyone watching macros. The nutrition data already exists from enrichment — this just surfaces it as a filter.
- **How**:
  - Add diet presets to preferences page: Keto (< 20g carbs), High-Protein (> 30g protein), Low-Carb (< 40g carbs), Low-Fat (< 15g fat), Balanced
  - Preferences saved in Zustand store (persisted to localStorage)
  - Results page: filter chip row below sort options. Active filters gray out non-matching dishes (don't hide — user should see what they're missing)
  - Grayed-out dishes show why they don't match: "62g carbs (keto limit: 20g)"
  - Combine with existing dietary filters (veg/non-veg/allergens) — macro filters are additive
- **Dependencies**: Nutrition data already in enrichment. No new API calls.
- **Status**: TODO

### 9.2 Ingredient substitution requests
- **What**: Generate polite phrases in the local language for common modifications: "no peanuts please", "less spicy", "vegetarian version", "no MSG". Show alongside the order text for the user to point at or play via TTS.
- **Why**: Allergen avoidance and preference customization are critical for travelers. Currently the app helps you understand and order — but not modify. The language barrier makes custom requests the hardest part of ordering abroad.
- **How**:
  - **Template phrases** for common requests (pre-built, no LLM call, instant):
    - Allergen removal: "Without [allergen] please" in 10+ languages
    - Spice adjustment: "Not spicy / mild / extra spicy please"
    - Portion: "Small portion / large portion"
    - Templates stored as JSON keyed by language code + modification type
  - **AI-generated phrases** for complex/dish-specific requests (LLM call):
    - "Can I get the dakgalbi without rice cakes and extra chicken?"
    - "Is the japchae sauce gluten-free? Can you use tamari instead?"
    - Generated via a lightweight LLM call with dish context + modification request
    - Cached per dish+modification combo
  - **UX**: On dish detail page, "Customize" button → shows common modification chips (template) + free-text input for custom requests (AI-generated). Result shown as local-script text + TTS playback.
- **Dependencies**: TTS endpoint already exists. Template phrases need translation data.
- **Status**: TODO

## Priority 10: Performance & Offline

### 10.1 Offline cached cuisines — instant enrichment for common dishes
- **What**: Pre-package enrichment data for the top 50-100 dishes per cuisine. If OCR detects a known dish, skip the LLM enrichment call entirely and serve cached data. Covers East Asian (Korean, Japanese, Chinese, Thai, Vietnamese) and European (French, Italian, Spanish, German, Greek) cuisines first.
- **Why**: Dramatically cuts latency for common dishes (instant vs. 3-5s per batch). Works fully offline for known dishes. Reduces API costs. ~80% of dishes on a typical tourist-area menu are "common" dishes that don't need fresh LLM analysis.
- **How**:
  - Build a static JSON dataset: `{cuisine}/{dishName}.json` with full enrichment (description, ingredients, nutrition, allergens, cultural context, etc.)
  - Generate once via LLM batch job, review for accuracy, ship as part of the app bundle
  - During Phase 2, match OCR dish names against the cache (fuzzy match on `nameLocal` and `nameEnglish`)
  - Cache hits → serve instantly, cache misses → normal LLM enrichment
  - Cache bundle size estimate: 100 dishes × ~2KB each = ~200KB per cuisine, ~2MB for 10 cuisines. Acceptable for a PWA.
  - Update cache periodically (quarterly) or let users trigger a cache refresh
  - Phase 1 (OCR + parsing) still requires network — but Phase 2 enrichment (the slow part) can be fully offline for cached dishes
- **Dependencies**: None (static data, no backend)
- **Status**: DONE (Phase 1: 5 Asian cuisines × 25 dishes = 125 dishes cached with IndexedDB + CDN, see docs/15-offline-cuisine-cache.md and docs/16-cuisine-cache-integration.md)

### 10.2 Show to staff — full-screen kiosk mode
- **What**: A dedicated full-screen view of the order in the local script, optimized for handing your phone to a waiter. Large text, high contrast, minimal UI chrome, prominent audio playback button.
- **Why**: The current order page has the local-script text but it's embedded in a scrollable page with quantity controls and other UI. When you hand your phone to a waiter, they need to see just the order — big, clear, no distractions.
- **How**:
  - "Show to Staff" button on order page → enters full-screen mode (Fullscreen API)
  - White background, large black text (local script), each dish on its own line with quantity
  - Big centered play button for TTS audio
  - "Tap anywhere to exit" overlay hint
  - Auto-lock screen rotation to portrait
  - Optional: show dish photos in a small thumbnail next to each item (helps waiter confirm the right dish)
- **Dependencies**: Order builder (already done), TTS (already done)
- **Status**: TODO
