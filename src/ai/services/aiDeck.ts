import request from '@/services/axios'
import type { AITaskResponse, DeckAcceptResponse, DeckPlanInput, DeckPlanResponse, DeckRenderInput, DeckRenderResponse } from '../types/deck'
import type { SlideRegenerationInput, SlideRegenerationResponse } from '../types/regeneration'

export const planDeck = async (payload: DeckPlanInput): Promise<DeckPlanResponse> =>
  request.post('/api/ai/deck/plan', payload) as Promise<DeckPlanResponse>

export const renderDeck = async (payload: DeckRenderInput): Promise<DeckRenderResponse> =>
  request.post('/api/ai/deck/render', payload) as Promise<DeckRenderResponse>

export const acceptDeckRender = async (payload: {
  deckId: string
  createdBy: string
  sourceTaskId: string
  pptistSlidesJson: unknown[]
  aiDeckJson: unknown
}): Promise<DeckAcceptResponse> =>
  request.post('/api/ai/deck/accept', payload) as Promise<DeckAcceptResponse>

export const regenerateSlide = async (payload: SlideRegenerationInput): Promise<SlideRegenerationResponse> =>
  request.post('/api/ai/slide/regenerate', payload) as Promise<SlideRegenerationResponse>

export const getAITask = async (id: string) =>
  request.get(`/api/ai/tasks/${id}`) as Promise<AITaskResponse>
