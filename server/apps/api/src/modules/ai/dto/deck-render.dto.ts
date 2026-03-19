import type { AIDeck } from '../../../../../../libs/ai-schema/src/ai-deck'

export class DeckRenderDto {
  deckId?: string
  outlineId?: string
  overwrite?: boolean
  topic?: string
  goalPageCount?: number
  language?: string
  deck?: AIDeck
}
