import type { LLMProvider } from '../providers/llm-provider.interface'

export class DeckPlannerService {
  constructor(private readonly provider: LLMProvider) {}

  planDeck(topic: string, goalPageCount: number, language: string) {
    return this.provider.planDeck({ topic, goalPageCount, language })
  }
}
