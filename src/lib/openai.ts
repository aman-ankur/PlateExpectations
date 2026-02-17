import { Dish } from './types'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

async function callOpenAI(messages: Array<{ role: string; content: unknown }>, model = 'gpt-4o') {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 4096,
      temperature: 0.3,
    }),
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

Return as JSON array: [{"name_local": "...", "price": "...", "description_local": "..."}]
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
  ], 'gpt-4o')

  return content
}

export async function enrichDishes(menuItemsJson: string, preferencesJson: string): Promise<Dish[]> {
  const content = await callOpenAI([
    {
      role: 'system',
      content: `You are a food expert specializing in Southeast and East Asian cuisine, helping Indian travelers understand foreign menus.

Given extracted menu items (in original language), translate and enrich each dish. Return a JSON array of dishes with this exact structure for each:

{
  "id": "unique-id",
  "nameEnglish": "English name",
  "nameLocal": "Original script name",
  "description": "Short 1-2 sentence English description",
  "country": "Country of origin (Vietnam/Thailand/Korea/Japan/Indonesia)",
  "price": "Price as shown on menu",
  "dietaryType": "veg" | "non-veg" | "jain-safe",
  "allergens": ["list of common allergens present"],
  "ingredients": [
    {"name": "ingredient name", "category": "protein|vegetable|sauce|carb|dairy|spice|other", "isUnfamiliar": true/false, "explanation": "simple explanation if unfamiliar"}
  ],
  "nutrition": {"protein": grams, "carbs": grams, "fat": grams, "fiber": grams, "kcal": number},
  "explanation": "Conversational explanation of the dish written for an Indian traveler who has never seen it",
  "culturalTerms": [{"term": "local term", "explanation": "simple English explanation"}],
  "rankScore": 0-30 popularity/recommendation score
}

Important:
- Be accurate about dietary classification (veg means absolutely no meat/eggs)
- Flag common allergens: egg, soy, sesame, peanut, shellfish, gluten, dairy
- Mark ingredients as "isUnfamiliar" if an average Indian traveler wouldn't know them
- Write explanations in a friendly, conversational tone
- Estimate nutrition approximately per serving`,
    },
    {
      role: 'user',
      content: `Menu items:\n${menuItemsJson}\n\nUser preferences:\n${preferencesJson}\n\nTranslate, enrich, and return the full dish data as JSON array.`,
    },
  ])

  // Parse the JSON from GPT response
  const jsonMatch = content.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('Failed to parse dish data from AI response')

  return JSON.parse(jsonMatch[0])
}
