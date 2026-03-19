import { defineStore } from 'pinia'
import type { AIDeck, DeckPlanResponse } from '../types/deck'
import type { AISlide } from '../types/slide'

interface AIDeckState {
  plannedDeck: AIDeck | null
  editableDeck: AIDeck | null
  plannedSlides: AISlide[]
  plannedPageCount: number
  renderedDeck: AIDeck | null
}

export const useAIDeckStore = defineStore('aiDeck', {
  state: (): AIDeckState => ({
    plannedDeck: null,
    editableDeck: null,
    plannedSlides: [],
    plannedPageCount: 0,
    renderedDeck: null,
  }),

  actions: {
    setPlan(plan: DeckPlanResponse) {
      this.plannedDeck = plan.deck
      this.editableDeck = JSON.parse(JSON.stringify(plan.deck)) as AIDeck
      this.plannedSlides = plan.slides
      this.plannedPageCount = plan.plannedPageCount
    },

    updateOutlineSummary(summary: string) {
      if (!this.editableDeck) return
      this.editableDeck.outlineSummary = summary
    },

    updateSlideTitle(slideId: string, title: string) {
      const slide = this.editableDeck?.slides.find(item => item.id === slideId)
      if (slide) slide.title = title
    },

    updateSlideSummary(slideId: string, summary: string) {
      const slide = this.editableDeck?.slides.find(item => item.id === slideId)
      if (slide) slide.summary = summary
    },

    updateSlideBullets(slideId: string, bullets: string[]) {
      const slide = this.editableDeck?.slides.find(item => item.id === slideId)
      if (slide) slide.bullets = bullets
    },

    setRenderedDeck(deck: AIDeck | null) {
      this.renderedDeck = deck
    },
  },
})
