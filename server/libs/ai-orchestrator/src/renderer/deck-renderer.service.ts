import type { AIDeck } from '../../../ai-schema/src/ai-deck'

export class DeckRendererService {
  render(deck: AIDeck) {
    return { deck }
  }
}
