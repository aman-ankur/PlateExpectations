#!/usr/bin/env npx tsx
/**
 * Fix ALL image URLs across all 5 cuisine cache files.
 * Uses Wikipedia pageimages API (exact title lookup) to get real thumbnail URLs.
 * Run: npx tsx scripts/cache-gen/fix-all-images.ts
 */
import * as fs from 'fs'
import * as path from 'path'

const CACHE_DIR = path.join(__dirname, '../../public/cache')
const HEADERS = { 'User-Agent': 'PlateExpectations/1.0 (menu translator app; https://github.com)' }

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

// Map of dish nameEnglish → exact Wikipedia article title
// These are manually curated to ensure correct matches
const WIKI_TITLES: Record<string, string> = {
  // Korean
  'Bibimbap': 'Bibimbap',
  'Kimchi Jjigae': 'Kimchi-jjigae',
  'Tteokbokki': 'Tteok-bokki',
  'Samgyeopsal': 'Samgyeopsal',
  'Sundubu Jjigae': 'Sundubu-jjigae',
  'Haemul Pajeon': 'Pajeon',
  'Dakgalbi': 'Dak-galbi',
  'Kalguksu': 'Kalguksu',
  'Jajangmyeon': 'Jajangmyeon',
  'Galbitang': 'Galbitang',
  'Hotteok': 'Hotteok',
  'Sundae': 'Sundae_(Korean_food)',
  'Bossam': 'Bossam_(food)',
  'Naengmyeon': 'Naengmyeon',
  'Samgyetang': 'Samgyetang',
  'Doenjang Jjigae': 'Doenjang-jjigae',
  'Galbi': 'Galbi',
  'Kimchi Bokkeumbap': 'Kimchi_fried_rice',
  'Budae Jjigae': 'Budae-jjigae',
  'Ojingeo Bokkeum': 'Ojingeo-bokkeum',
  'Bulgogi': 'Bulgogi',
  'Japchae': 'Japchae',
  'Mandu': 'Mandu_(food)',
  'Gimbap': 'Gimbap',
  'Gamjatang': 'Gamjatang',

  // Japanese
  'Ramen': 'Ramen',
  'Tonkatsu': 'Tonkatsu',
  'Sushi': 'Sushi',
  'Tempura': 'Tempura',
  'Okonomiyaki': 'Okonomiyaki',
  'Gyudon': 'Gyūdon',
  'Udon': 'Udon',
  'Soba': 'Soba',
  'Yakitori': 'Yakitori',
  'Miso Soup': 'Miso_soup',
  'Katsu Curry': 'Japanese_curry',
  'Takoyaki': 'Takoyaki',
  'Gyoza': 'Gyoza',
  'Sashimi': 'Sashimi',
  'Karaage': 'Karaage',
  'Tamagoyaki': 'Tamagoyaki',
  'Chirashi Don': 'Chirashizushi',
  'Oyakodon': 'Oyakodon',
  'Shabu-Shabu': 'Shabu-shabu',
  'Unagi Don': 'Unadon',
  'Curry Rice': 'Japanese_curry',
  'Onigiri': 'Onigiri',
  'Sukiyaki': 'Sukiyaki',
  'Nikujaga': 'Nikujaga',
  'Edamame': 'Edamame',

  // Thai
  'Pad Thai': 'Pad_thai',
  'Green Curry': 'Green_curry',
  'Tom Yum Goong': 'Tom_yum',
  'Som Tum': 'Som_tam',
  'Massaman Curry': 'Massaman_curry',
  'Tom Kha Gai': 'Tom_kha_kai',
  'Mango Sticky Rice': 'Mango_sticky_rice',
  'Larb': 'Larb',
  'Pad See Ew': 'Phat_si-io',
  'Khao Soi': 'Khao_soi',
  'Satay': 'Satay',
  'Pad Kra Pao': 'Phat_kaphrao',
  'Red Curry': 'Red_curry',
  'Gaeng Som': 'Kaeng_som',
  'Pad Pak Ruam': 'Thai_cuisine',
  'Khao Pad': 'Khao_phat',
  'Tod Mun Pla': 'Tod_mun',
  'Kai Jeow': 'Khai_chiao',
  'Tosai': 'Dosa',
  'Panang Curry': 'Panang_curry',
  'Boat Noodles': 'Boat_noodles',
  'Kai Yang': 'Kai_yang',
  'Khao Niao Mamuang': 'Mango_sticky_rice',
  'Kanom Jeen': 'Khanom_chin',
  'Pla Rad Prik': 'Thai_cuisine',

  // Vietnamese
  'Pho': 'Pho',
  'Banh Mi': 'Bánh_mì',
  'Bun Cha': 'Bún_chả',
  'Fresh Spring Rolls': 'Gỏi_cuốn',
  'Broken Rice': 'Cơm_tấm',
  'Hue Spicy Beef Noodle Soup': 'Bún_bò_Huế',
  'Vietnamese Crepe': 'Bánh_xèo',
  'Cao Lau': 'Cao_lầu',
  'Quang Noodles': 'Mì_Quảng',
  'Crab Noodle Soup': 'Bún_riêu',
  'Shaking Beef': 'Shaking_beef',
  'Turmeric Fish with Dill': 'Chả_cá',
  'Fried Spring Rolls': 'Chả_giò',
  'Sticky Rice': 'Xôi',
  'Southern Noodle Soup': 'Hủ_tiếu',
  'Steamed Rice Rolls': 'Bánh_cuốn',
  'Beef Pho': 'Pho',
  'Chicken Pho': 'Pho',
  'Caramelized Fish in Clay Pot': 'Cá_kho',
  'Grilled Pork Vermicelli': 'Bún_thịt_nướng',
  'Vietnamese Sweet Dessert Soup': 'Chè',
  'Steamed Bun': 'Bánh_bao',
  'Vietnamese Beef Stew': 'Bò_kho',
  'Sweet and Sour Fish Soup': 'Canh_chua',
  'Com Tam': 'Cơm_tấm',
  'Mi Quang': 'Mì_Quảng',
  'Bo Luc Lac': 'Shaking_beef',
  'Cha Ca': 'Chả_cá',
  'Ca Kho To': 'Cá_kho',
  'Nem Ran': 'Chả_giò',
  'Hu Tieu': 'Hủ_tiếu',
  'Banh Cuon': 'Bánh_cuốn',
  'Che': 'Chè',
  'Banh Bao': 'Bánh_bao',
  'Bo Kho': 'Bò_kho',
  'Pho Bo': 'Pho',
  'Pho Ga': 'Pho',

  // Malaysian
  'Nasi Lemak': 'Nasi_lemak',
  'Char Kway Teow': 'Char_kway_teow',
  'Laksa': 'Laksa',
  'Satay': 'Satay',
  'Roti Canai': 'Roti_canai',
  'Rendang': 'Rendang',
  'Nasi Goreng': 'Nasi_goreng',
  'Mee Goreng': 'Mee_goreng',
  'Hokkien Mee': 'Hokkien_mee',
  'Cendol': 'Cendol',
  'Murtabak': 'Murtabak',
  'Nasi Kandar': 'Nasi_kandar',
  'Ikan Bakar': 'Ikan_bakar',
  'Curry Mee': 'Curry_mee',
  'Nasi Kerabu': 'Nasi_kerabu',
  'Tosai': 'Dosa',
  'Prawn Mee': 'Prawn_mee',
  'Ayam Goreng': 'Ayam_goreng',
  'Kuih': 'Kuih',
  'Apam Balik': 'Apam_balik',
  'Otak-Otak': 'Otak-otak',
  'Rojak': 'Rojak',
  'Wonton Mee': 'Wonton_noodles',
  'Hainanese Chicken Rice': 'Hainanese_chicken_rice',
  'Teh Tarik': 'Teh_tarik',
}

async function lookupWikipediaImage(title: string): Promise<string | null> {
  const encoded = encodeURIComponent(title)
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&titles=${encoded}&prop=pageimages&pithumbsize=500&origin=*`
  try {
    const res = await fetch(url, { headers: HEADERS })
    const data = await res.json()
    const pages = data?.query?.pages || {}
    for (const page of Object.values(pages) as any[]) {
      if (page.thumbnail?.source) return page.thumbnail.source
    }
    return null
  } catch {
    return null
  }
}

async function main() {
  const cuisines = ['korean', 'japanese', 'thai', 'vietnamese', 'malaysian']

  for (const cuisine of cuisines) {
    const filePath = path.join(CACHE_DIR, `${cuisine}.json`)
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    let fixed = 0, failed = 0, skipped = 0

    for (const dish of data.dishes) {
      const title = WIKI_TITLES[dish.nameEnglish]
      if (!title) {
        // Try nameRomanized
        const altTitle = WIKI_TITLES[dish.nameRomanized]
        if (!altTitle) {
          console.log(`  ? ${cuisine}/${dish.nameEnglish}: no Wikipedia title mapped, skipping`)
          skipped++
          continue
        }
      }

      const wikiTitle = title || WIKI_TITLES[dish.nameRomanized]
      const imageUrl = await lookupWikipediaImage(wikiTitle)

      if (imageUrl) {
        dish.imageUrl = imageUrl
        dish.imageUrls = [imageUrl]
        dish.imageSource = 'wikipedia'
        dish.imageVerified = true
        fixed++
      } else {
        console.log(`  ✗ ${cuisine}/${dish.nameEnglish} (${wikiTitle}): no image found`)
        failed++
      }

      await delay(500) // Rate limit
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    console.log(`✓ ${cuisine}: ${fixed} fixed, ${failed} no image, ${skipped} skipped`)
  }
}

main().catch(console.error)
