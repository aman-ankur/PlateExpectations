# Accuracy Test Results

Tracking translation accuracy and image match rates across changes.

## Test: Vietnam Menu (`vietnam1.png`) — 9 dishes

### 2026-02-19 — OCR correction + imageSearchQuery improvements

**Changes:** Added `nameLocalCorrected` field to enrichment prompt, improved `imageSearchQuery` to prefer canonical local names, added tone-stripped Wikipedia search variants.

**Branch:** `feat/multi-image-gallery`

| Metric | Score | Details |
|--------|-------|---------|
| Names (exact) | 6/9 | GỎI CUỐN, CHẢ GIÒ, CÁNH GÀ NƯỚC MẮM, MỰC RANG MUỐI, BÁNH ƯỚT TÔM SẤY, BÁNH ƯỚT CHẢ LỤA |
| Names (fuzzy) | 1/9 | TÔM LĂN BỘT → TÔM LAN BỘT (tone diff) |
| Names (wrong) | 2/9 | BÁNH CUỐN → BÁNH CUỐN HÀ NỘI (expanded), BÁNH ƯỚT ĐẬU HŨ → BÁNH ƯỚT ĐẬU HỒI |
| Prices | 3/9 | LLM returns numbers without decimals; some OCR errors |
| Real images | 3/9 | Gỏi cuốn, Chả giò, Cánh gà nước mắm |
| DALL-E images | 6/9 | Less common dishes lack Wikipedia coverage |
| Dish count | 9/9 | All dishes found |

**Key wins:**
- OCR correction working: "CÒI CUỐN" → "GỎI CUỐN" (was echoing garbled name before)
- `imageSearchQuery` now returns canonical local names ("Gỏi cuốn") instead of generic English
- 3 real Wikipedia images (previously ~2 with garbled queries)

**Remaining issues:**
- LLM sometimes expands dish names beyond what's on the menu (BÁNH CUỐN → BÁNH CUỐN HÀ NỘI)
- Price parsing unreliable (numbers without decimals, some completely wrong like 170 for a $7 item)
- Bánh ướt variants too obscure for Wikipedia — DALL-E fallback is expected
