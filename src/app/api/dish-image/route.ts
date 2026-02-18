import { NextRequest, NextResponse } from 'next/server'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

/**
 * GET /api/dish-image?q=볶음밥&fallback=Korean+fried+rice&dishName=Fried+Rice
 *
 * Finds up to 3 dish photos with Vision-validated candidates:
 * 1. Collect candidates from Wikipedia/Commons/Unsplash
 * 2. Filter by filename heuristics (free)
 * 3. High-confidence food filenames accepted without Vision
 * 4. Remaining candidates Vision-validated in parallel
 * Returns { imageUrl, imageUrls[], generated[] }
 */
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')
  const fallback = req.nextUrl.searchParams.get('fallback')
  const dishName = req.nextUrl.searchParams.get('dishName')
  const description = req.nextUrl.searchParams.get('description')
  if (!query) {
    return NextResponse.json({ imageUrl: null }, { status: 400 })
  }

  // Build cascade of queries to try
  const queries = [query]
  if (fallback && fallback !== query) {
    queries.push(fallback)
    const simplified = fallback.replace(/^(Korean|Thai|Vietnamese|Japanese|Indonesian|Chinese|Indian|Mexican)\s+/i, '').trim()
    if (simplified !== fallback && simplified.length > 2) {
      queries.push(simplified)
    }
  }

  console.log(`[dish-image] Searching for: q="${query}" fallback="${fallback || ''}" (${queries.length} queries)`)

  try {
    // Collect candidates from all sources
    const candidates: { imageUrl: string; source: string }[] = []
    const highConfidence: string[] = []

    // Strategy 1: Wikipedia article lead images
    for (const q of queries) {
      const result = await getWikipediaArticleImage(q)
      if (result) {
        const check = classifyCandidate(result.imageUrl)
        if (check === 'reject') {
          console.log(`[dish-image]   Wikipedia rejected for "${q}" (filename)`)
          continue
        }
        if (check === 'high') {
          console.log(`[dish-image] ✓ Wikipedia high-confidence hit for "${q}" → ${result.imageUrl.slice(0, 80)}...`)
          if (!highConfidence.includes(result.imageUrl)) highConfidence.push(result.imageUrl)
          continue
        }
        candidates.push({ imageUrl: result.imageUrl, source: `Wikipedia:${q}` })
      } else {
        console.log(`[dish-image]   Wikipedia miss for "${q}"`)
      }
    }

    // Strategy 2: Wikimedia Commons search
    // High-confidence filenames are spot-checked with Vision using the fallback (clean English name)
    const commonsHighConfidence: string[] = []
    for (const q of queries) {
      const urls = await searchCommonsDirectly(q)
      for (const url of urls) {
        const check = classifyCandidate(url)
        if (check === 'reject') continue
        if (check === 'high') {
          if (!commonsHighConfidence.includes(url)) commonsHighConfidence.push(url)
          continue
        }
        candidates.push({ imageUrl: url, source: `Commons:${q}` })
      }
      if (urls.length === 0) console.log(`[dish-image]   Commons miss for "${q}"`)
    }

    // Spot-check first Commons high-confidence hit with Vision using the fallback name
    if (commonsHighConfidence.length > 0) {
      const visionName = fallback || dishName || query
      if (OPENAI_API_KEY) {
        const spotCheck = await validateWithVision(commonsHighConfidence[0], visionName)
        if (spotCheck) {
          console.log(`[dish-image] ✓ Commons high-confidence verified (${commonsHighConfidence.length} images) for "${visionName}"`)
          highConfidence.push(...commonsHighConfidence.filter(u => !highConfidence.includes(u)))
        } else {
          console.log(`[dish-image]   Commons high-confidence spot-check FAILED for "${visionName}", sending to Vision`)
          candidates.push(...commonsHighConfidence.map(u => ({ imageUrl: u, source: 'Commons:high-rejected' })))
        }
      } else {
        highConfidence.push(...commonsHighConfidence.filter(u => !highConfidence.includes(u)))
      }
    }

    // Strategy 3: Unsplash
    for (const q of queries) {
      const unsplashUrl = await searchUnsplash(q)
      if (unsplashUrl) {
        const check = classifyCandidate(unsplashUrl)
        if (check === 'reject') continue
        // Unsplash never gets high-confidence (generic food photos)
        candidates.push({ imageUrl: unsplashUrl, source: `Unsplash:${q}` })
      } else {
        console.log(`[dish-image]   Unsplash miss for "${q}"`)
      }
    }

    // Collect validated images — start with high-confidence ones
    const imageUrls: string[] = [...highConfidence.slice(0, 3)]

    // Vision-validate remaining candidates to fill up to 3
    if (imageUrls.length < 3 && candidates.length > 0 && OPENAI_API_KEY) {
      // Deduplicate against already-collected URLs
      const candidateUrls = candidates.map(c => c.imageUrl).filter(u => !imageUrls.includes(u))
      if (candidateUrls.length > 0) {
        console.log(`[dish-image] Vision-validating ${candidateUrls.length} candidates for "${dishName || query}"`)
        const validated = await validateCandidatesParallel(candidateUrls, dishName || query, 3 - imageUrls.length)
        for (const url of validated) {
          const source = candidates.find(c => c.imageUrl === url)?.source || 'unknown'
          console.log(`[dish-image] ✓ Vision accepted (${source}) → ${url.slice(0, 80)}...`)
        }
        imageUrls.push(...validated)
        if (validated.length === 0) {
          console.log(`[dish-image]   All ${candidateUrls.length} candidates rejected by Vision`)
        }
      }
    }

    // Secondary search if < 3 images and dishName available
    if (imageUrls.length < 3 && dishName) {
      const secondaryQuery = `${dishName} food dish`
      console.log(`[dish-image] Secondary search: "${secondaryQuery}"`)
      const secondaryResult = await getWikipediaArticleImage(secondaryQuery)
      if (secondaryResult && !imageUrls.includes(secondaryResult.imageUrl)) {
        const check = classifyCandidate(secondaryResult.imageUrl)
        if (check === 'high') {
          imageUrls.push(secondaryResult.imageUrl)
        } else if (check === 'check' && OPENAI_API_KEY) {
          const validated = await validateCandidatesParallel([secondaryResult.imageUrl], dishName, 1)
          imageUrls.push(...validated)
        }
      }
    }

    if (imageUrls.length > 0) {
      console.log(`[dish-image] ✓ Found ${imageUrls.length} images for "${query}"`)
      return NextResponse.json({
        imageUrl: imageUrls[0],
        imageUrls,
        generated: imageUrls.map(() => false),
      })
    }

    // DALL-E fallback when no real photos found
    if (dishName && OPENAI_API_KEY) {
      console.log(`[dish-image] Generating with DALL-E for "${dishName}"`)
      const generated = await generateWithDalle(dishName, description || '')
      if (generated) {
        console.log(`[dish-image] ✓ DALL-E generated for "${dishName}"`)
        return NextResponse.json({
          imageUrl: generated,
          imageUrls: [generated],
          generated: [true],
        })
      }
    }

    console.log(`[dish-image] ✗ No image found for "${query}"`)
    return NextResponse.json({ imageUrl: null, imageUrls: [], generated: [] })
  } catch (err) {
    console.error('[dish-image] Error:', err)
    return NextResponse.json({ imageUrl: null, imageUrls: [], generated: [] })
  }
}

const HEADERS = { 'User-Agent': 'PlateExpectations/1.0 (menu-translator-app)' }

// --- Filename-based classification (free, no API call) ---

const REJECT_FILENAME = /portrait|headshot|logo|flag|map|statue|monument|building|skyline|album|screenshot|coat.of.arms|diagram|newspaper|sign|banner|field|hybrid|paddy|harvest|farm|cultivation|compilation|tray|pdf|document|concert|crowd|people|band|music|stadium|event|audience|singer|performer/i
const FOOD_FILENAME = /food|dish|cuisine|plate|bowl|soup|noodle|cook|restaurant|meal|stew|curry|grill|fry|roast|bake|sushi|kimchi|dumpling|bibimbap|jjigae|bulgogi|galbi|tteok|banchan|samgyeopsal|japchae|bokk|ramen|udon|sashimi|tempura|tofu|rice_cake/i

function classifyCandidate(imageUrl: string): 'reject' | 'high' | 'check' {
  const filename = decodeURIComponent(imageUrl.split('/').pop() || '').toLowerCase()
  if (REJECT_FILENAME.test(filename)) return 'reject'
  if (FOOD_FILENAME.test(filename)) return 'high'
  return 'check'
}

// --- Vision validation (parallel) ---

async function validateWithVision(imageUrl: string, dishName: string): Promise<boolean> {
  if (!OPENAI_API_KEY) return false

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 3,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
              { type: 'text', text: `Is this a photo of the food/dish "${dishName}"? If this is not food at all, answer NO. Answer only YES or NO.` },
            ],
          },
        ],
      }),
    })

    if (!res.ok) {
      console.error('[dish-image] Vision API error:', res.status)
      return false // Fail closed
    }

    const data = await res.json()
    const answer = (data.choices?.[0]?.message?.content || '').trim().toUpperCase()
    console.log(`[dish-image] Vision: "${answer}" for "${dishName}" (${imageUrl.slice(0, 60)}...)`)
    return answer.startsWith('YES')
  } catch (err) {
    console.error('[dish-image] Vision validation error:', err)
    return false // Fail closed
  }
}

/** Validate candidates in parallel, return ALL validated URLs (up to maxCount) */
async function validateCandidatesParallel(urls: string[], dishName: string, maxCount: number = 3): Promise<string[]> {
  const validated: string[] = []
  // Process in batches of 3
  for (let i = 0; i < urls.length && validated.length < maxCount; i += 3) {
    const batch = urls.slice(i, i + 3)
    const results = await Promise.all(
      batch.map(async (url) => ({ url, valid: await validateWithVision(url, dishName) }))
    )
    for (const r of results) {
      if (r.valid && validated.length < maxCount) validated.push(r.url)
    }
  }
  return validated
}

// --- DALL-E generation ---

async function generateWithDalle(dishName: string, description: string): Promise<string | null> {
  if (!OPENAI_API_KEY) return null

  try {
    const prompt = `A realistic overhead photo of ${dishName}: ${description || dishName}. Food photography, natural lighting, no text or labels.`

    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      }),
    })

    if (!res.ok) {
      console.error('[dish-image] DALL-E error:', await res.text())
      return null
    }

    const data = await res.json()
    return data.data?.[0]?.url || null
  } catch (err) {
    console.error('[dish-image] DALL-E generation error:', err)
    return null
  }
}

// --- Image sources ---

interface WikiResult {
  imageUrl: string
  articleTitle: string
}

async function getWikipediaArticleImage(query: string): Promise<WikiResult | null> {
  const dishName = query
    .replace(/^(Korean|Thai|Vietnamese|Japanese|Indonesian)\s+/i, '')
    .replace(/\s+(food|dish|meal|recipe|soup|noodle|noodles|rice|bowl|pancake|stir.fried|fried|steamed|cold|spicy)\s*$/gi, '')
    .trim()

  // Add tone-stripped variant for Vietnamese/diacritical names
  const noTones = dishName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')

  const variants = [
    dishName,
    query,
    ...(noTones !== dishName ? [noTones] : []),
    dishName.replace(/\s+/g, '-'),
    `${dishName} food`,
  ]

  for (const variant of variants) {
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

    for (const page of Object.values(pages) as any[]) { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (page.thumbnail?.source) {
        return { imageUrl: page.thumbnail.source, articleTitle: page.title || variant }
      }
    }
  }

  return null
}

const BAD_PATTERNS = /logo|flag|map|icon|stamp|newspaper|portrait|sign|banner|diagram|coat.of.arms/i

/** Returns up to 5 candidate URLs from Commons (no validation) */
async function searchCommonsDirectly(query: string): Promise<string[]> {
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
  if (!res.ok) return []

  const data = await res.json()
  const results = data.query?.search
  if (!results?.length) return []

  const urls: string[] = []
  for (const result of results) {
    if (BAD_PATTERNS.test(result.title)) continue
    const thumbUrl = await getCommonsThumbUrl(result.title)
    if (thumbUrl) urls.push(thumbUrl)
  }
  return urls
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
