import type { AIDeck } from '../../../../../../libs/ai-schema/src/ai-deck'

export class SlideAcceptDto {
  deckId!: string
  createdBy!: string
  sourceTaskId!: string
  parentVersionId!: string
  pptistSlidesJson!: unknown[]
  aiDeckJson?: AIDeck
}
