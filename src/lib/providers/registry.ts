import { Phase1Provider, EnrichmentProvider } from './types'
import { cloudVisionGroqProvider } from './cloud-vision-groq'
import { gptVisionProvider } from './gpt-vision'
import { geminiFlashProvider } from './gemini-flash'
import { groqEnrichmentProvider } from './groq-enrichment'
import { gptEnrichmentProvider } from './gpt-enrichment'

const phase1Providers: Record<string, Phase1Provider> = {
  'cloud-vision-groq': cloudVisionGroqProvider,
  'gpt-vision': gptVisionProvider,
  'gemini': geminiFlashProvider,
}

const enrichmentProviders: Record<string, EnrichmentProvider> = {
  'groq': groqEnrichmentProvider,
  'gpt': gptEnrichmentProvider,
}

export function getPhase1Provider(): Phase1Provider {
  const name = process.env.SCAN_PHASE1_PROVIDER || 'gemini'
  const provider = phase1Providers[name]
  if (!provider) {
    console.warn(`[providers] Unknown phase1 provider "${name}", falling back to cloud-vision-groq`)
    return cloudVisionGroqProvider
  }
  return provider
}

export function getEnrichmentProvider(): EnrichmentProvider {
  const name = process.env.SCAN_ENRICHMENT_PROVIDER || 'groq'
  const provider = enrichmentProviders[name]
  if (!provider) {
    console.warn(`[providers] Unknown enrichment provider "${name}", falling back to groq`)
    return groqEnrichmentProvider
  }
  return provider
}

export function isLazyEnrichment(): boolean {
  return process.env.SCAN_LAZY_ENRICHMENT !== 'false'
}
