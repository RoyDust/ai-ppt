import type { AIDeck } from '../../../ai-schema/src/ai-deck'
import { DeckToSlidesService } from '../../../pptist-adapter/src/deck-to-slides.service'

export class DeckRendererService {
  constructor(private readonly deckToSlidesService = new DeckToSlidesService()) {}

  render(deck: AIDeck) {
    return {
      deck,
      slides: this.deckToSlidesService.convert(deck),
    }
  }
}
