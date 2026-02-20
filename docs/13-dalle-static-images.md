# 13 — DALL-E Static Images for AI Demo Dishes

## What changed

### 1. DALL-E generated images stored as static assets
The 5 "uncommon" demo dishes (Jajangmyeon, Galbitang, Hotteok, Sundae, Bossam) previously had no real images. DALL-E 3 was used to generate photorealistic images for each, with detailed prompts emphasizing Korean restaurant presentation, ceramic bowls, natural lighting, and authentic plating.

Each dish got 2 images (except Sundae which got 1) for gallery support:
- Jajangmyeon: noodles with black bean sauce, julienned cucumber
- Galbitang: clear short rib soup in earthenware pot
- Hotteok: golden pan-fried pancake with sugar filling
- Sundae: sliced blood sausage with salt dip
- Bossam: pork belly with napa wraps and accompaniments

### 2. Image optimization
Raw DALL-E output was 1024px PNG (~2MB each, 18MB total). Compressed to 500px JPEG at 80% quality using macOS `sips`:
```
sips -Z 500 -s format jpeg -s formatOptions 80
```
Final total: ~743KB for all 9 images.

### 3. demo-images.json updated
AI dish entries changed from placeholder paths to actual `/demo-images/*.jpg` local paths. Format supports both single strings and arrays for gallery dishes.

## Known issue: Broken multi-image Wikimedia URLs
The 4 common dishes (Bibimbap, Kimchi Jjigae, Bulgogi, Tteokbokki) each have 3-image arrays in `demo-images.json`, but **only the first URL per dish works**. The 2nd and 3rd URLs were incorrectly constructed and return 404 from Wikimedia. These dishes currently display only 1 image in the gallery instead of 3.

**To fix:** Replace the broken URLs with verified images — either:
- Use Wikipedia API (`action=query&prop=images`) to find real image filenames, then construct proper thumb URLs
- Source from Unsplash/Pexels (requires API key for hotlinking)
- Generate additional DALL-E images and store as static assets (like the AI dishes)

## Files changed
- `public/demo-images/` — 9 new JPEG files (Bossam.jpg, Bossam2.jpg, Galbitang.jpg, Galbitang2.jpg, Hotteok.jpg, Hotteok2.jpg, Jajangmyeon.jpg, Jajangmyeon2.jpg, Sundae.jpg)
- `src/fixtures/demo-images.json` — Updated AI dish paths from placeholders to `/demo-images/*.jpg`
