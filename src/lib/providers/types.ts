import { Dish, RawDish } from '../types'

export interface Phase1Provider {
  name: string
  extractDishes(imageBase64: string, signal?: AbortSignal): Promise<RawDish[]>
}

/** Tier 2 partial result — only the detail fields fetched on-demand */
export interface DishDetail {
  id: string
  ingredients: Dish['ingredients']
  nutrition: Dish['nutrition']
  explanation: string
  culturalTerms: Dish['culturalTerms']
}

export interface EnrichmentProvider {
  name: string
  /** Full enrichment — all fields (legacy behavior) */
  enrichBatch(dishes: RawDish[], prefsDescription: string, signal?: AbortSignal): Promise<Dish[]>
  /** Tier 1 — card-level fields only (fast) */
  enrichBatchCard(dishes: RawDish[], prefsDescription: string, signal?: AbortSignal): Promise<Dish[]>
  /** Tier 2 — detail fields only (on-demand) */
  enrichBatchDetail(dishes: Array<{ id: string; nameEnglish: string; nameLocal: string; brief: string; country: string }>, prefsDescription: string, signal?: AbortSignal): Promise<DishDetail[]>
}
