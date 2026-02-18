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
- **Status**: TODO

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
- **Status**: TODO

## Priority 4: Polish & Production

### 4.1 UI polish pass
- **What**: Compare each screen against design mockups, fix spacing/sizing/colors
- **Why**: Current UI is functional but not polished
- **How**: Screen-by-screen comparison with mockups
- **Status**: TODO

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
