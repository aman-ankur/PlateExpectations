#!/usr/bin/env npx tsx
/**
 * Patch all cache JSON files with corrected image URLs.
 * Run: npx tsx scripts/cache-gen/patch-images.ts
 */
import * as fs from 'fs'
import * as path from 'path'

const CACHE_DIR = path.join(__dirname, '../../public/cache')

// All verified image URL fixes, organized by cuisine
const FIXES: Record<string, Record<string, { url: string; source: string }>> = {
  korean: {
    'Bulgogi': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Bulgogi_2.jpg/500px-Bulgogi_2.jpg', source: 'wikipedia' },
    'Japchae': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Polish_Korean_Cuisine_and_Culture_Exchanges_Gradmother%E2%80%99s_Recipes_05.jpg/500px-Polish_Korean_Cuisine_and_Culture_Exchanges_Gradmother%E2%80%99s_Recipes_05.jpg', source: 'wikipedia' },
    'Mandu': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/%EB%A7%8C%EB%91%90.jpg/500px-%EB%A7%8C%EB%91%90.jpg', source: 'wikipedia' },
    'Gimbap': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Gimbap_%28pixabay%29.jpg/500px-Gimbap_%28pixabay%29.jpg', source: 'wikipedia' },
    'Gamjatang': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Korean.food-Gamjatang-01.jpg/500px-Korean.food-Gamjatang-01.jpg', source: 'commons' },
  },
  japanese: {
    'Gyudon': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Gyuu-don_001.jpg/500px-Gyuu-don_001.jpg', source: 'wikipedia' },
    'Gyoza': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Missgyoza_production_gyoza_dumpling_Manufacturer.jpg/500px-Missgyoza_production_gyoza_dumpling_Manufacturer.jpg', source: 'commons' },
    'Sashimi': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Sashimi_of_S%C3%A3o_Paulo.jpg/500px-Sashimi_of_S%C3%A3o_Paulo.jpg', source: 'commons' },
    'Karaage': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Chicken_karaage_003.jpg/500px-Chicken_karaage_003.jpg', source: 'wikipedia' },
    // Tamagoyaki — no good image found, leave empty
  },
  thai: {
    'Khao Pad': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Koh_Mak%2C_Thailand%2C_Fried_rice_with_seafood%2C_Thai_fried_rice.jpg/500px-Koh_Mak%2C_Thailand%2C_Fried_rice_with_seafood%2C_Thai_fried_rice.jpg', source: 'wikipedia' },
    'Pad Kra Pao': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Basil_fried_crispy_pork_with_rice_-_Chiang_Mai_-_2017-07-11_%28002%29.jpg/500px-Basil_fried_crispy_pork_with_rice_-_Chiang_Mai_-_2017-07-11_%28002%29.jpg', source: 'wikipedia' },
    'Red Curry': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Kaeng_phet_mu.jpg/500px-Kaeng_phet_mu.jpg', source: 'wikipedia' },
    'Gaeng Som': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Kaeng_som-marum63.JPG/500px-Kaeng_som-marum63.JPG', source: 'wikipedia' },
    'Pad Pak Ruam': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Making_Stir-Fry_%283286445383%29.jpg/500px-Making_Stir-Fry_%283286445383%29.jpg', source: 'commons' },
    'Tosai': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Dosa-chutney-sambhar.jpg/500px-Dosa-chutney-sambhar.jpg', source: 'commons' },
    // Tod Mun Pla — no good image found
    // Kai Jeow — omelette-adjacent but not exact, leave empty
  },
  vietnamese: {
    'Pho': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Ph%E1%BB%9F_b%C3%B2_%2839425047901%29.jpg/500px-Ph%E1%BB%9F_b%C3%B2_%2839425047901%29.jpg', source: 'wikipedia' },
    'Com Tam': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/C%C6%A1m_T%E1%BA%A5m%2C_Da_Nang%2C_Vietnam.jpg/500px-C%C6%A1m_T%E1%BA%A5m%2C_Da_Nang%2C_Vietnam.jpg', source: 'wikipedia' },
    'Mi Quang': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/M%C3%AC_Qu%E1%BA%A3ng%2C_Da_Nang%2C_Vietnam.jpg/500px-M%C3%AC_Qu%E1%BA%A3ng%2C_Da_Nang%2C_Vietnam.jpg', source: 'wikipedia' },
    'Bo Luc Lac': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Product_Shots_of_Food-Bo_Luc_Lac.jpg/500px-Product_Shots_of_Food-Bo_Luc_Lac.jpg', source: 'wikipedia' },
    'Cha Ca': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Cha_ca_La_Vong.jpg/500px-Cha_ca_La_Vong.jpg', source: 'commons' },
    'Ca Kho To': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/C%C3%A1_kho_t%E1%BB%99.JPG/500px-C%C3%A1_kho_t%E1%BB%99.JPG', source: 'commons' },
    'Nem Ran': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Tu_binh.JPG/500px-Tu_binh.JPG', source: 'commons' }, // Vietnamese food platter with spring rolls
    'Hu Tieu': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Hu_Tieu_Nam_Vang.jpg/500px-Hu_Tieu_Nam_Vang.jpg', source: 'wikipedia' },
    'Banh Cuon': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/B%C3%A1nh_cu%E1%BB%91n_Thanh_Tr%C3%AC.jpg/500px-B%C3%A1nh_cu%E1%BB%91n_Thanh_Tr%C3%AC.jpg', source: 'commons' },
    'Che': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Ch%C3%A8_xo%C3%A0i.jpg/500px-Ch%C3%A8_xo%C3%A0i.jpg', source: 'wikipedia' },
    'Banh Bao': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Banhbao.jpg/500px-Banhbao.jpg', source: 'wikipedia' },
    'Bo Kho': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Kho.jpg/500px-Kho.jpg', source: 'wikipedia' },
    // Pho Bo and Pho Ga use the same Pho image
    'Pho Bo': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Ph%E1%BB%9F_b%C3%B2_%2839425047901%29.jpg/500px-Ph%E1%BB%9F_b%C3%B2_%2839425047901%29.jpg', source: 'wikipedia' },
    'Pho Ga': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Ph%E1%BB%9F_b%C3%B2_%2839425047901%29.jpg/500px-Ph%E1%BB%9F_b%C3%B2_%2839425047901%29.jpg', source: 'wikipedia' },
  },
  malaysian: {
    'Mee Goreng': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Kampung_Bukit_Jagong%2C_Pendang_20240917_172701.jpg/500px-Kampung_Bukit_Jagong%2C_Pendang_20240917_172701.jpg', source: 'wikipedia' },
    'Cendol': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Kampung_Paya_Jaras_Tengah%2C_Selangor_20250112_111330.jpg/500px-Kampung_Paya_Jaras_Tengah%2C_Selangor_20250112_111330.jpg', source: 'wikipedia' },
    'Murtabak': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Murtabak.jpg/500px-Murtabak.jpg', source: 'wikipedia' },
    'Curry Mee': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Malaysian_noodles-Curry_Mee-01.jpg/500px-Malaysian_noodles-Curry_Mee-01.jpg', source: 'commons' },
    'Nasi Kerabu': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Nasi_kerabu.jpg/500px-Nasi_kerabu.jpg', source: 'wikipedia' },
    'Tosai': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Dosa-chutney-sambhar.jpg/500px-Dosa-chutney-sambhar.jpg', source: 'commons' },
  },
}

function patchCuisine(cuisine: string) {
  const filePath = path.join(CACHE_DIR, `${cuisine}.json`)
  if (!fs.existsSync(filePath)) {
    console.log(`⚠ ${cuisine}.json not found, skipping`)
    return
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  const fixes = FIXES[cuisine] || {}
  let patched = 0

  for (const dish of data.dishes) {
    const fix = fixes[dish.nameEnglish]
    if (fix) {
      dish.imageUrl = fix.url
      dish.imageUrls = [fix.url]
      dish.imageSource = fix.source
      dish.imageVerified = true
      patched++
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  console.log(`✓ ${cuisine}: patched ${patched} dishes`)
}

// Count dishes with and without images
function countImages(cuisine: string) {
  const filePath = path.join(CACHE_DIR, `${cuisine}.json`)
  if (!fs.existsSync(filePath)) return
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  const withImg = data.dishes.filter((d: any) => d.imageUrl).length
  const without = data.dishes.filter((d: any) => !d.imageUrl).map((d: any) => d.nameEnglish)
  console.log(`  ${cuisine}: ${withImg}/25 have images${without.length > 0 ? ` | missing: ${without.join(', ')}` : ''}`)
}

console.log('=== Patching cache files with corrected image URLs ===\n')
for (const cuisine of Object.keys(FIXES)) {
  patchCuisine(cuisine)
}

console.log('\n=== Image coverage after patching ===')
for (const cuisine of ['korean', 'japanese', 'thai', 'vietnamese', 'malaysian']) {
  countImages(cuisine)
}
