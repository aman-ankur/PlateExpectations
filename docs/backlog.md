# Plate Expectations — Improvement Backlog

## Priority 1: Perceived Speed & Loading UX

### 1.1 Progressive dish loading
- **What**: Show dishes one-by-one as Phase 2 enrichment batches complete, instead of waiting for all batches
- **Why**: First dishes appear in ~20s instead of ~45s. Users can start browsing immediately.
- **How**: Return Phase 1 results immediately (names/prices), then stream enrichment via SSE or polling
- **Status**: TODO

### 1.2 Better loading progress indicator
- **What**: Step-by-step progress: "Reading menu..." → "Found 17 dishes" → "Translating 1/4..." → "Done"
- **Why**: Makes 45s wait feel shorter. Users know something is happening.
- **How**: Split scan endpoint into phases with progress events, or use SSE
- **Status**: TODO

### 1.3 Scan new menu button
- **What**: Button to clear current results and scan another menu
- **Why**: Currently no way to scan again without refreshing the page
- **How**: Clear dishes/images from Zustand store, navigate to home
- **Status**: TODO

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
- **Status**: TODO

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
