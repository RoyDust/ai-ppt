import { defineStore } from 'pinia'
import type { AIDeck, DeckPlanResponse } from '../types/deck'
import type { AISlide } from '../types/slide'

interface AIDeckState {
  plannedSlides: AISlide[]
  plannedPageCount: number
  renderedDeck: AIDeck | null
}

export const useAIDeckStore = defineStore('aiDeck', {
  state: (): AIDeckState => ({
    plannedSlides: [],
    plannedPageCount: 0,
    renderedDeck: null,
  }),

  actions: {
    setPlan(plan: DeckPlanResponse) {
      this.plannedSlides = plan.slides
      this.plannedPageCount = plan.plannedPageCount
    },

    setRenderedDeck(deck: AIDeck | null) {
      this.renderedDeck = deck
    },
  },
})
