import type { AIDeck } from '../../../../../../libs/ai-schema/src/ai-deck'

export class DeckAcceptDto {
  deckId!: string
  createdBy!: string
  sourceTaskId!: string
  pptistSlidesJson?: unknown[]
  aiDeckJson?: AIDeck
}
