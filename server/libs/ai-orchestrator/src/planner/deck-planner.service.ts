import type { DeckPlanRequest, LLMProvider } from '../providers/llm-provider.interface'

export class DeckPlannerService {
  constructor(private readonly provider: LLMProvider) {}

  planDeck(input: DeckPlanRequest) {
    return this.provider.planDeck(input)
  }
}
