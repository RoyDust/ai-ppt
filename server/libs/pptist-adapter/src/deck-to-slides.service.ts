import type { AIDeck } from '../../ai-schema/src/ai-deck'
import { SlideToPPTistService } from './slide-to-pptist.service'

export class DeckToSlidesService {
  constructor(private readonly slideToPPTistService = new SlideToPPTistService()) {}

  convert(deck: AIDeck) {
    return deck.slides.map(slide => this.slideToPPTistService.convert(slide, deck))
  }
}
