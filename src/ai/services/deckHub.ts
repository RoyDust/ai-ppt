import axios from '@/services/axios'
import message from '@/utils/message'
import type { Slide } from '@/types/slides'

export interface DeckHubDeckSummary {
  id: string
  title: string
  status: string
  updatedAt: string
  actualPageCount: number | null
  currentVersionId?: string
}

export interface DeckHubDeckVersionDetail {
  id: string
  versionNo?: number
  pptistSlidesJson: Slide[]
}

export interface DeckHubDeckDetail {
  id: string
  title: string
  currentVersion?: DeckHubDeckVersionDetail | null
}

export const listDecks = async (): Promise<DeckHubDeckSummary[]> => {
  try {
    return await axios.get('/api/ai/decks')
  }
  catch {
    return []
  }
}

export const getDeckDetail = async (deckId: string): Promise<DeckHubDeckDetail> => {
  try {
    return await axios.get(`/api/ai/decks/${deckId}`)
  }
  catch (error) {
    const text = error instanceof Error ? error.message : '演示文稿详情加载失败，请稍后重试'
    message.error(text)
    throw error
  }
}
