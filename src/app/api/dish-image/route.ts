import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/dish-image?q=Korean+bibimbap+rice+bowl
 *
 * Finds a dish photo using Wikipedia's curated article images (pageimages API).
 * Strategy: opensearch to find article → get lead image. Falls back to Commons search.
 * Returns { imageUrl: string } or { imageUrl: null }.
 */
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')
  if (!query) {
    return NextResponse.json({ imageUrl: null }, { status: 400 })
  }

  try {
    // Strategy 1: Wikipedia article lead image (best quality, curated)
    const wikiUrl = await getWikipediaArticleImage(query)
    if (wikiUrl) {
      return NextResponse.json({ imageUrl: wikiUrl })
    }

    // Strategy 2: Wikimedia Commons search (broader but lower quality)
    const commonsUrl = await searchCommonsDirectly(query)
    if (commonsUrl) {
      return NextResponse.json({ imageUrl: commonsUrl })
    }

    // Strategy 3: Unsplash fallback (needs API key)
    const unsplashUrl = await searchUnsplash(query)
    if (unsplashUrl) {
      return NextResponse.json({ imageUrl: unsplashUrl })
    }

    return NextResponse.json({ imageUrl: null })
  } catch (err) {
    console.error('[dish-image] Error:', err)
    return NextResponse.json({ imageUrl: null })
  }
}

const HEADERS = { 'User-Agent': 'PlateExpectations/1.0 (menu-translator-app)' }

/**
 * Best approach: find the Wikipedia article for the dish, get its lead image.
 * These are editorially curated and almost always show the actual dish.
 */
async function getWikipediaArticleImage(query: string): Promise<string | null> {
  // Strip common prefixes that prevent article matching
  const dishName = query
    .replace(/^(Korean|Thai|Vietnamese|Japanese|Indonesian)\s+/i, '')
    .replace(/\s+(food|dish|meal|recipe|soup|noodle|noodles|rice|bowl|pancake|stir.fried|fried|steamed|cold|spicy)\s*$/gi, '')
    .trim()

  // Try multiple search variants
  const variants = [
    dishName,
    query, // original query as fallback
    dishName.replace(/\s+/g, '-'), // hyphenated form (e.g. "Gyeran-jjim")
    `${dishName} food`, // disambiguate from non-food articles
  ]

  for (const variant of variants) {
    // Step 1: opensearch to find the correct article title
    const searchParams = new URLSearchParams({
      action: 'opensearch',
      search: variant,
      limit: '5',
      format: 'json',
      origin: '*',
    })

    const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?${searchParams}`, { headers: HEADERS })
    if (!searchRes.ok) continue

    const searchData = await searchRes.json()
    const titles: string[] = searchData[1] || []
    if (titles.length === 0) continue

    // Step 2: get pageimages for all found titles at once
    const imgParams = new URLSearchParams({
      action: 'query',
      format: 'json',
      titles: titles.slice(0, 3).join('|'),
      prop: 'pageimages',
      pithumbsize: '400',
      origin: '*',
    })

    const imgRes = await fetch(`https://en.wikipedia.org/w/api.php?${imgParams}`, { headers: HEADERS })
    if (!imgRes.ok) continue

    const imgData = await imgRes.json()
    const pages = imgData.query?.pages
    if (!pages) continue

    // Return first article that has a thumbnail
    for (const page of Object.values(pages) as any[]) { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (page.thumbnail?.source) {
        return page.thumbnail.source
      }
    }
  }

  return null
}

const BAD_PATTERNS = /logo|flag|map|icon|stamp|newspaper|portrait|sign|banner|diagram|coat.of.arms/i

async function searchCommonsDirectly(query: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    list: 'search',
    srsearch: query,
    srnamespace: '6',
    srlimit: '5',
    origin: '*',
  })

  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: HEADERS })
  if (!res.ok) return null

  const data = await res.json()
  const results = data.query?.search
  if (!results?.length) return null

  for (const result of results) {
    if (BAD_PATTERNS.test(result.title)) continue

    const thumbUrl = await getCommonsThumbUrl(result.title)
    if (thumbUrl) return thumbUrl
  }

  return null
}

async function getCommonsThumbUrl(title: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    titles: title,
    prop: 'imageinfo',
    iiprop: 'url',
    iiurlwidth: '400',
    origin: '*',
  })

  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: HEADERS })
  if (!res.ok) return null

  const data = await res.json()
  const pages = data.query?.pages
  if (!pages) return null

  for (const page of Object.values(pages) as any[]) { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (page.imageinfo?.[0]?.thumburl) return page.imageinfo[0].thumburl
  }

  return null
}

async function searchUnsplash(query: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) return null

  const params = new URLSearchParams({
    query: `${query} food`,
    per_page: '1',
    orientation: 'squarish',
  })

  const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
    headers: { Authorization: `Client-ID ${key}` },
  })

  if (!res.ok) return null
  const data = await res.json()
  return data.results?.[0]?.urls?.small || null
}
