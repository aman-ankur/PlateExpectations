# Sprint: Groq Enrichment + Camera UX

## Feature 1: Groq for Phase 2 Enrichment

### Goal
Determine if Groq Llama 3.3 70B can replace GPT-4o-mini for dish enrichment (Phase 2), cutting enrichment time from ~15-20s to ~3-5s.

### Approach: Benchmark First, Then Decide

Enrichment is more demanding than Phase 1 parsing — it requires 12+ structured fields per dish with nuanced content (nutrition estimates, cultural explanations, Indian-traveler analogies). We benchmark quality before committing.

### Step 1: Extend benchmark script

**File:** `scripts/compare-parsers.ts`

Add enrichment comparison mode:
1. Run Phase 1 (reuse existing OCR → Groq parse)
2. Take the first batch of 3 dishes
3. Send the **same batch** to both GPT-4o-mini and Groq Llama 3.3 70B using the existing `enrichBatchOnce` prompt
4. Print side-by-side comparison:
   - **Speed**: time per batch
   - **Completeness**: count of non-empty fields per dish (all 12 fields present?)
   - **Nutrition plausibility**: are kcal/protein/carbs in reasonable ranges?
   - **Explanation quality**: print both side-by-side for human review
   - **JSON validity**: did both return parseable JSON with correct structure?
5. Test with `korean.jpg` (17 dishes) and `korean2.jpg` (8 dishes)

**What we're looking for:**
- Groq returns all 12 fields with no empty values
- Nutrition values are within ±30% of GPT estimates
- Explanations are coherent and contain Indian comparisons
- Speed: Groq should be 3-5x faster per batch

**Decision matrix:**
| Groq Quality | Action |
|---|---|
| All fields present, nutrition ±30%, good explanations | Ship all-Groq + GPT fallback |
| Some fields weak (e.g., nutrition off, explanations thin) | Ship two-phase: Groq fast fields → GPT backfill |
| Structural failures (missing fields, bad JSON) | Stay on GPT, consider smaller Groq model |

### Step 2: Implement based on results

**If all-Groq wins (expected path):**

**File:** `src/lib/openai.ts`

- Add `enrichBatchGroq()` — same prompt, calls `groqCall()` instead of `gptCall()`
- Update `enrichBatchOnce()`: try Groq first, fall back to GPT on failure
- Keep retry logic for missing dishes (works with either provider)
- Same 200ms stagger between batches (Groq rate limits: 6000 tokens/min on free tier — may need to check if this is enough for enrichment)

**Rate limit concern:** Enrichment batches are ~800-1200 output tokens each. 6 batches × 1000 tokens = 6000 tokens — right at Groq free tier limit. May need:
- Groq paid tier, OR
- Stagger batches by 500ms instead of 200ms, OR
- Hybrid: first 3 batches on Groq, rest on GPT

### Step 3: Verify

- Run benchmark script to confirm speed improvement
- Full scan with korean.jpg — verify all 17 dishes enriched correctly
- Check logs for Groq errors/retries
- `npm run build` passes

---

## Feature 2: Camera Integration — Dual Button UX

### Goal
Replace the single upload area with two clear CTAs: "Take Photo" (opens camera directly) and "Upload from Gallery". Better mobile UX with clear intent.

### Design

```
┌─────────────────────────┐
│                         │
│    Plate Expectations   │
│    Decode any menu      │
│                         │
│  ┌───────────────────┐  │
│  │                   │  │
│  │   [menu preview]  │  │
│  │                   │  │
│  └───────────────────┘  │
│                         │
│  ┌─────────┐ ┌────────┐ │
│  │ 📷 Take │ │ 🖼 From │ │
│  │  Photo  │ │Gallery │ │
│  └─────────┘ └────────┘ │
│                         │
│  [ ── Analyze Menu ── ] │
│                         │
│  Point camera at menu...│
└─────────────────────────┘
```

### Implementation

**File:** `src/app/page.tsx`

1. **Two hidden file inputs:**
   - `cameraInputRef`: `<input accept="image/*" capture="environment" />` — opens rear camera
   - `galleryInputRef`: `<input accept="image/*" />` — opens file picker / gallery (no `capture` attribute)

2. **Two buttons replacing "Choose Photo":**
   - "Take Photo" → triggers `cameraInputRef.click()`
   - "From Gallery" → triggers `galleryInputRef.click()`
   - Side-by-side layout: `grid grid-cols-2 gap-3`
   - Both use the same `handleFileChange` handler

3. **Upload area behavior:**
   - Before photo: show the two buttons below the dashed upload area (keep upload area tappable too as a third entry point)
   - After photo: show preview + "Analyze Menu" button (same as current)

4. **Styling:**
   - Camera button: primary accent color (this is the main action on mobile)
   - Gallery button: secondary/outlined style
   - Both get icons (camera SVG, image/gallery SVG)

### Cross-browser notes
- `capture="environment"` works on iOS Safari, Chrome Android, Firefox Android
- Desktop browsers ignore `capture` and show file picker — both buttons work the same on desktop (acceptable)
- No `getUserMedia` needed — no permission prompts, no cross-browser issues

### Step-by-step

1. Add second `useRef` for gallery input
2. Add second hidden `<input>` without `capture`
3. Replace single "Choose Photo" button with two-button grid
4. Keep upload area tap-to-open (use camera input as default)
5. Style buttons with icons

### Verify

- Test on iOS Safari: "Take Photo" opens camera, "From Gallery" opens photo library
- Test on Chrome Android: same behavior
- Test on desktop: both open file picker
- Preview + Analyze flow unchanged
- `npm run build` passes

---

## Execution Order

1. **Benchmark Groq enrichment** — write the comparison, run it, review results (~30 min)
2. **Implement Groq enrichment** — based on benchmark results (~20 min)
3. **Camera dual buttons** — independent of enrichment work (~15 min)
4. **Full integration test** — scan korean.jpg end-to-end, verify speed + quality
5. **Update docs** — CLAUDE.md, backlog, benchmark doc
6. **Commit + PR**
