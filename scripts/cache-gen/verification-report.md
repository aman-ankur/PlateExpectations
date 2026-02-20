# Cuisine Cache — Image Verification Report

**Generated:** 2026-02-20
**Verified by:** Claude Opus 4.6 (visual inspection of each downloaded candidate)
**Method:** Primary candidate image for each dish read and verified as matching the dish name

## Summary

| Cuisine | Total | Verified ✓ | Failed ❌ | Fixed | Final |
|---------|-------|-----------|----------|-------|-------|
| Korean | 25 | 24 | 1 (Sundae) | 1 | **25/25** |
| Japanese | 25 | 25 | 0 | — | **25/25** |
| Thai | 25 | 25 | 0 | — | **25/25** |
| Vietnamese | 25 | 25 | 0 | — | **25/25** |
| Malaysian | 25 | 25 | 0 | — | **25/25** |
| **Total** | **125** | **124** | **1** | **1** | **125/125** |

## Image Sources Breakdown

| Source | Count | Notes |
|--------|-------|-------|
| Wikipedia (pageimages API) | ~85 | Best quality — editorially curated article lead images |
| Wikimedia Commons | ~20 | Keyword search, good for less common dishes |
| Unsplash | ~20 | Fallback for dishes not on Wikipedia. Generic food photography. |

## Failures & Fixes

### Korean Sundae (순대) — FIXED
- **Problem:** Wikipedia opensearch for "순대" matched "Sundae" (ice cream), not "Sundae (Korean food)" (blood sausage). All 3 initial candidates showed ice cream sundaes.
- **Root cause:** English Wikipedia disambiguates to the dessert by default. The Korean food article is titled "Sundae (Korean food)" which opensearch doesn't find.
- **Fix:** Direct Commons search for "Korean food Sundae" found `File:Korean.food-Sundae-01.jpg` — a real photo of sliced Korean blood sausage.
- **Lesson:** Dishes with English homonyms need special handling (sundae, bossam, mandu, etc.)

## Per-Cuisine Verification Details

### Korean (25/25 ✓)
| # | Dish | Source | Status |
|---|------|--------|--------|
| 1 | Bibimbap | Wikipedia | ✓ Mixed rice bowl with vegetables and egg |
| 2 | Kimchi Jjigae | Wikipedia | ✓ Red kimchi stew in pot |
| 3 | Bulgogi | Wikipedia | ✓ Marinated grilled beef |
| 4 | Japchae | Wikipedia | ✓ Glass noodles with vegetables |
| 5 | Tteokbokki | Wikipedia | ✓ Spicy red rice cakes |
| 6 | Samgyeopsal | Wikipedia | ✓ Grilled pork belly slices |
| 7 | Sundubu Jjigae | Wikipedia | ✓ Soft tofu stew |
| 8 | Haemul Pajeon | Commons | ✓ Seafood scallion pancake |
| 9 | Dakgalbi | Wikipedia | ✓ Spicy stir-fried chicken |
| 10 | Kalguksu | Wikipedia | ✓ Knife-cut noodle soup |
| 11 | Jajangmyeon | Wikipedia | ✓ Black bean sauce noodles |
| 12 | Galbitang | Wikipedia | ✓ Short rib soup |
| 13 | Bossam | Wikipedia | ✓ Boiled pork belly wraps |
| 14 | Sundae | Commons | ✓ Korean blood sausage (FIXED — was ice cream) |
| 15 | Hotteok | Wikipedia | ✓ Sweet filled pancake |
| 16 | Naengmyeon | Wikipedia | ✓ Cold buckwheat noodles |
| 17 | Samgyetang | Wikipedia | ✓ Ginseng chicken soup |
| 18 | Doenjang Jjigae | Wikipedia | ✓ Soybean paste stew |
| 19 | Galbi | Wikipedia | ✓ Grilled short ribs |
| 20 | Kimchi Bokkeumbap | Commons | ✓ Kimchi fried rice |
| 21 | Mandu | Wikipedia | ✓ Korean dumplings |
| 22 | Budae Jjigae | Wikipedia | ✓ Army stew with ramen and spam |
| 23 | Gamjatang | Wikipedia | ✓ Pork bone soup |
| 24 | Gimbap | Wikipedia | ✓ Korean rice rolls (sliced) |
| 25 | Ojingeo Bokkeum | Unsplash | ✓ Spicy stir-fried squid |

### Japanese (25/25 ✓)
| # | Dish | Source | Status |
|---|------|--------|--------|
| 1 | Ramen | Wikipedia | ✓ Noodle soup with toppings |
| 2 | Tonkatsu | Wikipedia | ✓ Breaded pork cutlet |
| 3 | Sushi | Wikipedia | ✓ Assorted sushi pieces |
| 4 | Tempura | Wikipedia | ✓ Battered fried shrimp/vegetables |
| 5 | Okonomiyaki | Wikipedia | ✓ Savory Japanese pancake |
| 6 | Gyudon | Wikipedia | ✓ Beef bowl over rice |
| 7 | Udon | Wikipedia | ✓ Thick noodle soup |
| 8 | Soba | Wikipedia | ✓ Buckwheat noodles |
| 9 | Takoyaki | Wikipedia | ✓ Octopus balls |
| 10 | Katsu Curry | Wikipedia | ✓ Curry with breaded cutlet |
| 11 | Yakitori | Wikipedia | ✓ Grilled chicken skewers |
| 12 | Gyoza | Wikipedia | ✓ Japanese dumplings |
| 13 | Sashimi | Wikipedia | ✓ Sliced raw fish |
| 14 | Miso Soup | Wikipedia | ✓ Miso soup with tofu |
| 15 | Onigiri | Wikipedia | ✓ Rice balls with nori |
| 16 | Karaage | Wikipedia | ✓ Japanese fried chicken |
| 17 | Sukiyaki | Wikipedia | ✓ Hot pot with beef |
| 18 | Shabu-shabu | Wikipedia | ✓ Hot pot with sliced meat |
| 19 | Unagi Don | Wikipedia | ✓ Grilled eel over rice |
| 20 | Oyakodon | Wikipedia | ✓ Chicken and egg rice bowl |
| 21 | Curry Rice | Commons | ✓ Japanese curry with rice |
| 22 | Edamame | Wikipedia | ✓ Steamed soybeans in pods |
| 23 | Nikujaga | Wikipedia | ✓ Meat and potato stew |
| 24 | Tamagoyaki | Wikipedia | ✓ Rolled Japanese omelette |
| 25 | Matcha Parfait | Unsplash | ✓ Green tea layered dessert |

### Thai (25/25 ✓)
| # | Dish | Source | Status |
|---|------|--------|--------|
| 1 | Pad Thai | Wikipedia | ✓ Stir-fried rice noodles |
| 2 | Green Curry | Wikipedia | ✓ Green curry in bowl |
| 3 | Tom Yum Goong | Wikipedia | ✓ Hot and sour shrimp soup |
| 4 | Som Tum | Unsplash | ✓ Green papaya salad |
| 5 | Massaman Curry | Wikipedia | ✓ Rich brown curry |
| 6 | Pad See Ew | Unsplash | ✓ Wide flat noodles with soy sauce |
| 7 | Khao Pad | Wikipedia | ✓ Thai fried rice |
| 8 | Larb | Wikipedia | ✓ Minced meat salad |
| 9 | Pad Kra Pao | Wikipedia | ✓ Basil stir-fry with rice and fried egg |
| 10 | Tom Kha Gai | Wikipedia | ✓ Coconut chicken soup |
| 11 | Red Curry | Wikipedia | ✓ Red curry |
| 12 | Mango Sticky Rice | Wikipedia | ✓ Mango with sticky rice |
| 13 | Satay | Wikipedia | ✓ Grilled skewers with peanut sauce |
| 14 | Panang Curry | Commons | ✓ Thick panang curry |
| 15 | Kai Med Ma Muang | Unsplash | ✓ Cashew chicken stir-fry |
| 16 | Gaeng Som | Wikipedia | ✓ Sour orange curry |
| 17 | Pad Pak Ruam | Wikipedia | ✓ Mixed stir-fried vegetables |
| 18 | Khao Soi | Wikipedia | ✓ Northern Thai curry noodles |
| 19 | Tod Mun Pla | Commons | ✓ Thai fish cakes |
| 20 | Pla Rad Prik | Unsplash | ✓ Fried fish with chili sauce |
| 21 | Gaeng Keow Wan Gai | Unsplash | ✓ Green curry chicken |
| 22 | Yam Woon Sen | Commons | ✓ Glass noodle salad |
| 23 | Pad Woon Sen | Unsplash | ✓ Stir-fried glass noodles |
| 24 | Kai Jeow | Wikipedia | ✓ Thai omelette |
| 25 | Boat Noodles | Unsplash | ✓ Dark broth noodle soup |

### Vietnamese (25/25 ✓)
| # | Dish | Source | Status |
|---|------|--------|--------|
| 1 | Pho | Wikipedia | ✓ Noodle soup with herbs |
| 2 | Banh Mi | Wikipedia | ✓ Vietnamese baguette sandwich |
| 3 | Bun Cha | Wikipedia | ✓ Grilled pork with noodles |
| 4 | Goi Cuon | Unsplash | ✓ Fresh spring rolls |
| 5 | Com Tam | Wikipedia | ✓ Broken rice with grilled pork |
| 6 | Bun Bo Hue | Wikipedia | ✓ Spicy beef noodle soup |
| 7 | Banh Xeo | Wikipedia | ✓ Vietnamese crispy crepe |
| 8 | Cao Lau | Wikipedia | ✓ Hoi An noodles |
| 9 | Mi Quang | Wikipedia | ✓ Turmeric noodles |
| 10 | Bun Rieu | Wikipedia | ✓ Crab noodle soup |
| 11 | Bo Luc Lac | Wikipedia | ✓ Shaking beef cubes |
| 12 | Cha Ca | Wikipedia | ✓ Fish with turmeric and dill |
| 13 | Nem Ran | Wikipedia | ✓ Fried spring rolls |
| 14 | Xoi | Wikipedia | ✓ Sticky rice with toppings |
| 15 | Hu Tieu | Wikipedia | ✓ Clear noodle soup |
| 16 | Banh Cuon | Wikipedia | ✓ Steamed rice rolls |
| 17 | Pho Bo | Wikipedia | ✓ Beef pho |
| 18 | Pho Ga | Wikipedia | ✓ Chicken pho |
| 19 | Ca Kho To | Wikipedia | ✓ Caramelized fish in clay pot |
| 20 | Bun Thit Nuong | Wikipedia | ✓ Grilled pork with vermicelli |
| 21 | Che | Wikipedia | ✓ Vietnamese sweet dessert |
| 22 | Banh Bao | Wikipedia | ✓ Steamed bun |
| 23 | Bo Kho | Wikipedia | ✓ Vietnamese beef stew |
| 24 | Canh Chua | Wikipedia | ✓ Vietnamese sour soup |
| 25 | Banh Trang Nuong | Unsplash | ✓ Grilled rice paper |

### Malaysian (25/25 ✓)
| # | Dish | Source | Status |
|---|------|--------|--------|
| 1 | Nasi Lemak | Wikipedia | ✓ Coconut rice with sambal and sides |
| 2 | Char Kway Teow | Wikipedia | ✓ Stir-fried flat noodles |
| 3 | Laksa | Wikipedia | ✓ Spicy noodle soup |
| 4 | Satay | Wikipedia | ✓ Grilled skewers with peanut sauce |
| 5 | Roti Canai | Wikipedia | ✓ Flaky flatbread |
| 6 | Rendang | Wikipedia | ✓ Dry curry with meat |
| 7 | Nasi Goreng | Wikipedia | ✓ Fried rice |
| 8 | Mee Goreng | Wikipedia | ✓ Fried noodles |
| 9 | Hainanese Chicken Rice | Unsplash | ✓ Poached chicken with rice |
| 10 | Bak Kut Teh | Unsplash | ✓ Pork rib herbal soup |
| 11 | Hokkien Mee | Wikipedia | ✓ Thick noodles in sauce |
| 12 | Rojak | Unsplash | ✓ Fruit/vegetable salad |
| 13 | Cendol | Wikipedia | ✓ Iced dessert with green jelly |
| 14 | Murtabak | Wikipedia | ✓ Stuffed pan-fried bread |
| 15 | Nasi Kandar | Wikipedia | ✓ Rice with curries |
| 16 | Curry Mee | Wikipedia | ✓ Curry noodle soup |
| 17 | Wonton Mee | Unsplash | ✓ Wonton noodles |
| 18 | Asam Laksa | Unsplash | ✓ Sour fish noodle soup |
| 19 | Ayam Percik | Unsplash | ✓ Grilled chicken with sauce |
| 20 | Ikan Bakar | Wikipedia | ✓ Grilled fish |
| 21 | Nasi Kerabu | Wikipedia | ✓ Blue herb rice |
| 22 | Apam Balik | Unsplash | ✓ Peanut pancake turnover |
| 23 | Kuih | Unsplash | ✓ Colorful Malaysian cakes |
| 24 | Prawn Mee | Commons | ✓ Prawn noodle soup |
| 25 | Tosai | Wikipedia | ✓ South Indian crepe/dosa |

## Notes for Unsplash-sourced images

Unsplash images are generic food photography (not dish-specific Wikipedia editorial images). They are verified as showing the correct dish but may not be the most representative photo. These dishes had no Wikipedia/Commons coverage:

- Korean: Ojingeo Bokkeum
- Japanese: Matcha Parfait
- Thai: Som Tum, Pad See Ew, Kai Med Ma Muang, Pla Rad Prik, Gaeng Keow Wan Gai, Pad Woon Sen, Boat Noodles
- Vietnamese: Goi Cuon, Banh Trang Nuong
- Malaysian: Hainanese Chicken Rice, Bak Kut Teh, Rojak, Wonton Mee, Asam Laksa, Ayam Percik, Apam Balik, Kuih

**Total Unsplash-sourced: ~20/125 dishes (16%)**

## Next Steps

1. Generate enrichment data (full Dish schema) for all 125 dishes
2. Build `public/cache/{cuisine}.json` files with verified image URLs
3. Implement client-side IndexedDB cache layer
4. Integrate with scan pipeline
