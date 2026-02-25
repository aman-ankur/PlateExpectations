# 21 — Fix Demo Mode Image Loss + "Load Failed" Error

## Problem

1. **AI-generated dish images disappear on history restore**: `saveScan()` filtered out all URLs in the `generatedImageUrls` set, but demo mode AI dishes use local `/demo-images/` paths that are permanent static files — not expiring DALL-E URLs.
2. **Galbitang missing AI badge**: Not listed in `_generated` array in `demo-images.json`.
3. **"Load failed" on iOS/Vercel**: Demo mode POST to `/api/scan` included the full base64 menu image (~5MB), exceeding Vercel's 4.5MB body limit. The scan API never reads the image in demo mode.
4. **Dead config**: `api.bodyParser` in `next.config.mjs` is a Pages Router option that does nothing in App Router.

## Changes

| File | Change |
|------|--------|
| `src/lib/store.ts` | Smart image filtering in `saveScan()`: keep local paths (`/`) and Wikipedia/Wikimedia URLs; only filter external DALL-E URLs |
| `src/fixtures/demo-images.json` | Add `"Galbitang"` and `"갈비탕"` to `_generated` array |
| `next.config.mjs` | Remove dead `api.bodyParser` block |
| `src/app/results/page.tsx` | Skip sending image in POST body when `pe-demo` cookie is set |
