import type { AIDeck } from '../../ai-schema/src/ai-deck'

export class DeckToSlidesService {
  convert(deck: AIDeck) {
    return deck.slides
  }
}
