# Feature: Order Builder with Voice Ordering

## Summary
Select dishes from scanned menu → view order in local script (show phone to staff) → generate spoken ordering phrase via OpenAI TTS (play for staff). Eliminates the pronunciation barrier for travelers.

## How It Works

### Adding to Order
- **Results page**: Long-press (500ms) on a dish card adds it to the order. Visual flash confirms. Quantity badge appears on the card.
- **Dish detail page**: "Add to Order" button at the bottom of the page.
- **OrderFab**: Floating action button (bottom-right) appears when order has items, shows total count, navigates to order page.

### Order Page (`/order`)
- Lists all ordered dishes with thumbnail, English name, local name, quantity stepper (+/-), and price.
- **Allergen warnings**: Cross-references dish allergens against user's allergy preferences.
- **Estimated total**: Parses prices from dish data, handles various currency formats.
- **Show to Staff**: Large local-script text block with polite ordering phrase, formatted for the dish's country language.
- **AI Voice**: OpenAI TTS (`tts-1`, `nova` voice) generates a spoken ordering phrase in the local language (~$0.002/order).
- **Device Voice**: Free fallback using browser `speechSynthesis` with language-appropriate voice selection.

### Supported Languages
| Country | Language | Greeting |
|---------|----------|----------|
| Korea | Korean | 안녕하세요, 주문하겠습니다. |
| Japan | Japanese | すみません、注文お願いします。 |
| Vietnam | Vietnamese | Xin chào, cho tôi gọi món. |
| Thailand | Thai | สวัสดีครับ/ค่ะ ขอสั่งอาหารครับ/ค่ะ |
| Indonesia | Indonesian | Permisi, saya mau pesan. |
| Other | English (fallback) | Hello, I would like to order: |

## Technical Details

### State
- `order: Record<string, number>` in Zustand store, persisted to `localStorage` key `pe-order`.
- Cleared automatically when `clearScan()` is called (new menu scan).

### API
- `POST /api/tts` — accepts `{ dishes: [{name, quantity}], country }`, returns `audio/mpeg` blob.
- Uses OpenAI `tts-1` model with `nova` voice.

### New Files
- `src/app/order/page.tsx` — Order summary page
- `src/app/api/tts/route.ts` — TTS endpoint
- `src/components/OrderFab.tsx` — Floating cart button
- `src/lib/useLongPress.ts` — Touch long-press hook
- `src/lib/orderTemplates.ts` — Per-language ordering phrase templates

### Modified Files
- `src/lib/store.ts` — Order slice (add/remove/update/clear)
- `src/lib/types.ts` — `OrderItem` interface
- `src/app/results/page.tsx` — Long-press on DishCard, order badge, OrderFab
- `src/app/dish/[id]/page.tsx` — "Add to Order" button, OrderFab
- `src/app/globals.css` — `bounce-in` keyframe animation
