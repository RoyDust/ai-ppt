import type { AIDeck } from '../../../ai-schema/src/ai-deck'
import type { LLMProvider } from '../providers/llm-provider.interface'
import { DeckToSlidesService } from '../../../pptist-adapter/src/deck-to-slides.service'

export class DeckRendererService {
  constructor(
    private readonly provider?: LLMProvider,
    private readonly deckToSlidesService = new DeckToSlidesService(),
  ) {}

  async render(deck: AIDeck) {
    const finalDeck = this.provider ? (await this.provider.renderDeck({ deck })).deck : deck
    return {
      deck: finalDeck,
      slides: this.deckToSlidesService.convert(finalDeck),
    }
  }
}
