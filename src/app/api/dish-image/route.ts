import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/dish-image?q=Korean+bibimbap+rice+bowl
 *
 * Searches for a dish photo: Wikimedia Commons first, Unsplash fallback.
 * Returns { imageUrl: string } or { imageUrl: null }.
 */
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')
  if (!query) {
    return NextResponse.json({ imageUrl: null }, { status: 400 })
  }

  try {
    // Try Wikimedia Commons direct search (free, unlimited, best for food photos)
    const commonsUrl = await searchCommonsDirectly(query)
    if (commonsUrl) {
      return NextResponse.json({ imageUrl: commonsUrl })
    }

    // Try Wikipedia article images
    const wikiUrl = await searchWikipediaImages(query)
    if (wikiUrl) {
      return NextResponse.json({ imageUrl: wikiUrl })
    }

    // Fallback: Unsplash (50 req/hr free tier)
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

  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': 'PlateExpectations/1.0 (menu-translator-app)' },
  })

  if (!res.ok) return null
  const data = await res.json()
  const results = data.query?.search
  if (!results?.length) return null

  // Try multiple results to find a food-related image, skip bad matches
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

  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': 'PlateExpectations/1.0 (menu-translator-app)' },
  })

  if (!res.ok) return null
  const data = await res.json()
  const pages = data.query?.pages
  if (!pages) return null

  for (const page of Object.values(pages) as any[]) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const info = page.imageinfo?.[0]
    if (info?.thumburl) return info.thumburl
  }

  return null
}

async function searchWikipediaImages(query: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'images',
    titles: query,
    gimlimit: '5',
    prop: 'imageinfo',
    iiprop: 'url|mime',
    iiurlwidth: '400',
    origin: '*',
  })

  const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': 'PlateExpectations/1.0 (menu-translator-app)' },
  })

  if (!res.ok) return null
  const data = await res.json()
  const pages = data.query?.pages
  if (!pages) return null

  for (const page of Object.values(pages) as any[]) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const info = page.imageinfo?.[0]
    if (info?.mime?.startsWith('image/') && info.thumburl && !BAD_PATTERNS.test(page.title || '')) {
      return info.thumburl
    }
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
