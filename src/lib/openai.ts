import { Dish } from './types'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

async function callOpenAI(
  messages: Array<{ role: string; content: unknown }>,
  model = 'gpt-4o',
  jsonMode = false,
) {
  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: 4096,
    temperature: 0.3,
  }
  if (jsonMode) {
    body.response_format = { type: 'json_object' }
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI API error: ${res.status} ${err}`)
  }

  const data = await res.json()
  return data.choices[0].message.content
}

export async function extractMenuItems(imageBase64: string): Promise<string> {
  const content = await callOpenAI([
    {
      role: 'system',
      content: `You are a menu OCR expert. Extract all menu items from the image. For each item, extract:
- The dish name in the original language
- The price (if visible)
- Any description text

Return as JSON: {"items": [{"name_local": "...", "price": "...", "description_local": "..."}]}
If you can't read the menu or it's not a menu image, return {"error": "Could not read menu"}.`,
    },
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: imageBase64, detail: 'high' },
        },
        { type: 'text', text: 'Extract all menu items from this image.' },
      ],
    },
  ], 'gpt-4o', true)

  return content
}

export async function enrichDishes(menuItemsJson: string, preferencesJson: string): Promise<Dish[]> {
  const content = await callOpenAI([
    {
      role: 'system',
      content: `You are a food expert specializing in Southeast and East Asian cuisine, helping Indian travelers understand foreign menus.

Given extracted menu items (in original language), translate and enrich each dish. Return JSON with this structure:

{"dishes": [
  {
    "id": "dish-1",
    "nameEnglish": "English name",
    "nameLocal": "Original script name",
    "description": "Short 1-2 sentence English description",
    "country": "Country of origin (Vietnam/Thailand/Korea/Japan/Indonesia)",
    "price": "Price as shown on menu",
    "dietaryType": "veg" or "non-veg" or "jain-safe",
    "allergens": ["list of common allergens present"],
    "ingredients": [
      {"name": "ingredient name", "category": "protein" or "vegetable" or "sauce" or "carb" or "dairy" or "spice" or "other", "isUnfamiliar": true or false, "explanation": "simple explanation if unfamiliar"}
    ],
    "nutrition": {"protein": 10, "carbs": 30, "fat": 8, "fiber": 3, "kcal": 350},
    "explanation": "Conversational explanation of the dish written for an Indian traveler who has never seen it",
    "culturalTerms": [{"term": "local term", "explanation": "simple English explanation"}],
    "rankScore": 15
  }
]}

Important:
- Use sequential IDs like "dish-1", "dish-2", etc.
- Be accurate about dietary classification (veg means absolutely no meat/eggs)
- Flag common allergens: egg, soy, sesame, peanut, shellfish, gluten, dairy
- Mark ingredients as "isUnfamiliar" if an average Indian traveler wouldn't know them
- Write explanations in a friendly, conversational tone
- Estimate nutrition approximately per serving`,
    },
    {
      role: 'user',
      content: `Menu items:\n${menuItemsJson}\n\nUser preferences:\n${preferencesJson}\n\nTranslate, enrich, and return as JSON.`,
    },
  ], 'gpt-4o', true)

  try {
    const parsed = JSON.parse(content)
    return parsed.dishes || (Array.isArray(parsed) ? parsed : [parsed])
  } catch {
    // Fallback: try to extract JSON from response
    const arrayMatch = content.match(/\[[\s\S]*\]/)
    if (arrayMatch) return JSON.parse(arrayMatch[0])
    throw new Error('Failed to parse dish data from AI response')
  }
}
