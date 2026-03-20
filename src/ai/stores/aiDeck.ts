import { defineStore } from 'pinia'
import type { AIDeck, DeckPlanResponse } from '../types/deck'
import type { AISlide, AISlidePlanningDraft } from '../types/slide'

const hydratePlanningDraft = (slide: AISlide): AISlidePlanningDraft => ({
  pageGoal: slide.planningDraft?.pageGoal || slide.summary || slide.title || '',
  coreMessage: slide.planningDraft?.coreMessage || slide.title || slide.summary || '',
  audienceTakeaway: slide.planningDraft?.audienceTakeaway || slide.summary || slide.title || '',
  supportingPoints: slide.planningDraft?.supportingPoints || slide.bullets || [],
  evidenceHints: slide.planningDraft?.evidenceHints || [],
  narrativeFlow: slide.planningDraft?.narrativeFlow || slide.summary || slide.title || '',
  recommendedLayout: slide.planningDraft?.recommendedLayout || String(slide.metadata?.layoutTemplate || ''),
  visualDirection: slide.planningDraft?.visualDirection || '',
  designNotes: slide.planningDraft?.designNotes || [],
  forbiddenContent: slide.planningDraft?.forbiddenContent || [],
  sourceAnchors: slide.planningDraft?.sourceAnchors || [],
})

const hydrateDeckPlanningDrafts = (deck: AIDeck): AIDeck => ({
  ...deck,
  slides: deck.slides.map(slide => ({
    ...slide,
    planningDraft: hydratePlanningDraft(slide),
  })),
})

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
    ensurePlanningDraft(slide: AISlide) {
      if (!slide.planningDraft) {
        slide.planningDraft = {}
      }
      return slide.planningDraft
    },

    setPlan(plan: DeckPlanResponse) {
      this.plannedDeck = hydrateDeckPlanningDrafts(plan.deck)
      this.editableDeck = JSON.parse(JSON.stringify(this.plannedDeck)) as AIDeck
      this.plannedSlides = this.plannedDeck.slides
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

    updateSlidePlanningDraftField(
      slideId: string,
      field: keyof Pick<AISlidePlanningDraft, 'pageGoal' | 'coreMessage' | 'audienceTakeaway' | 'narrativeFlow' | 'recommendedLayout' | 'visualDirection'>,
      value: string,
    ) {
      const slide = this.editableDeck?.slides.find(item => item.id === slideId)
      if (!slide) return
      this.ensurePlanningDraft(slide)[field] = value
    },

    updateSlidePlanningDraftList(
      slideId: string,
      field: keyof Pick<AISlidePlanningDraft, 'supportingPoints' | 'evidenceHints' | 'designNotes' | 'forbiddenContent' | 'sourceAnchors'>,
      value: string[],
    ) {
      const slide = this.editableDeck?.slides.find(item => item.id === slideId)
      if (!slide) return
      this.ensurePlanningDraft(slide)[field] = value
    },

    setRenderedDeck(deck: AIDeck | null) {
      this.renderedDeck = deck
    },
  },
})
