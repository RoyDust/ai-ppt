import type { AIDeck } from '../../../ai-schema/src/ai-deck'
import type { SlideRegenerationContext } from '../../../ai-schema/src/regeneration-context'
import type {
  DeckPlanRequest,
  DeckPlanResult,
  LLMProvider,
  SlideRegenerationResult,
} from './llm-provider.interface'

export interface OpenAIProviderOptions {
  apiKey?: string
  baseURL?: string
  model?: string
}

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai'
  readonly model: string

  constructor(private readonly options: OpenAIProviderOptions = {}) {
    this.model = options.model ?? 'gpt-4.1-mini'
  }

  async planDeck(input: DeckPlanRequest): Promise<DeckPlanResult> {
    const deck: AIDeck = {
      id: 'draft_deck',
      topic: input.topic,
      goalPageCount: input.goalPageCount,
      actualPageCount: input.goalPageCount,
      language: input.language,
      outlineSummary: '',
      slides: [],
    }

    return { deck }
  }

  async regenerateSlide(_input: SlideRegenerationContext): Promise<SlideRegenerationResult> {
    return { slide: {} }
  }
}
