import { ref } from 'vue'
import { useMainStore, useSlidesStore, useSnapshotStore } from '@/store'
import { renderAISlideToPPTistSlide } from '@/ai/adapters/renderSlide'
import { useAIDeckStore } from '@/ai/stores/aiDeck'
import { acceptSlideRegeneration, renderSlide } from '../services/aiDeck'
import type { SlideAcceptResponse, SlideRegenerationInput } from '../types/regeneration'
import type { AISlide } from '../types/slide'

const readPlainText = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent?.replace(/\s+/g, ' ').trim() || ''
}

const buildCurrentPptSlideSummary = (slide: ReturnType<typeof useSlidesStore>['currentSlide']) => {
  if (!slide) return undefined

  const textElements = slide.elements
    .filter((element): element is any => (
      element.type === 'text'
      || (element.type === 'shape' && !!element.text)
    ))
    .map((element) => {
      const textType = element.type === 'text' ? element.textType : element.text?.type
      const html = element.type === 'text' ? element.content : element.text?.content || ''
      return {
        textType,
        text: readPlainText(html),
        left: element.left,
        top: element.top,
        width: element.width,
        height: element.height,
      }
    })
    .filter(item => item.text)

  const title = textElements.find(item => item.textType === 'title')?.text
  const summary = textElements.filter(item => item.textType === 'content').map(item => item.text)
  const bullets = textElements.filter(item => item.textType === 'item').map(item => item.text)

  return {
    title,
    summary,
    bullets,
    textElements,
  }
}

export default () => {
  const previewSlide = ref<AISlide | null>(null)
  const lastInput = ref<SlideRegenerationInput | null>(null)
  const mainStore = useMainStore()
  const slidesStore = useSlidesStore()
  const snapshotStore = useSnapshotStore()
  const aiDeckStore = useAIDeckStore()

  const regenerateCurrentSlide = async (input: SlideRegenerationInput) => {
    const renderedDeck = aiDeckStore.renderedDeck
    const slideIndex = renderedDeck?.slides.findIndex(slide => slide.id === input.slideId) ?? -1
    const currentSlide = slideIndex >= 0 ? renderedDeck?.slides[slideIndex] : undefined
    const previousSlide = slideIndex > 0 ? renderedDeck?.slides[slideIndex - 1] : undefined
    const nextSlide = renderedDeck && slideIndex >= 0 && slideIndex < renderedDeck.slides.length - 1
      ? renderedDeck.slides[slideIndex + 1]
      : undefined
    const payload: SlideRegenerationInput = {
      ...input,
      topic: input.topic ?? renderedDeck?.topic,
      language: input.language ?? renderedDeck?.language,
      templateId: input.templateId ?? renderedDeck?.templateId,
      designSystem: input.designSystem ?? renderedDeck?.designSystem,
      goalPageCount: input.goalPageCount ?? renderedDeck?.goalPageCount,
      outlineSummary: input.outlineSummary ?? renderedDeck?.outlineSummary,
      regenerateMode: input.regenerateMode ?? 'content_and_layout',
      currentPptSlideSummary: input.currentPptSlideSummary ?? buildCurrentPptSlideSummary(slidesStore.currentSlide),
      currentSlide: input.currentSlide ?? currentSlide,
      previousSlide: input.previousSlide ?? previousSlide,
      nextSlide: input.nextSlide ?? nextSlide,
      deckOutline: input.deckOutline ?? renderedDeck?.slides.map(slide => ({
        id: slide.id,
        kind: slide.kind,
        title: slide.title,
      })),
    }
    lastInput.value = payload
    const result = await renderSlide(payload)
    previewSlide.value = result.slide
    return result
  }

  const acceptPreviewReplaceCurrent = async (): Promise<SlideAcceptResponse | null> => {
    const preview = previewSlide.value
    const currentSlide = slidesStore.currentSlide
    const currentDeckId = mainStore.currentDeckId
    const currentVersionId = mainStore.currentVersionId

    if (!preview || !currentSlide || !currentDeckId || !currentVersionId) {
      return null
    }

    const replacementSlide = renderAISlideToPPTistSlide(preview, currentSlide)
    const nextSlides = slidesStore.slides.map((slide, index) =>
      index === slidesStore.slideIndex ? replacementSlide : slide,
    )

    const renderedDeck = aiDeckStore.renderedDeck
    const nextDeck = renderedDeck
      ? {
          ...renderedDeck,
          slides: renderedDeck.slides.map((slide) =>
            slide.id === (lastInput.value?.slideId || currentSlide.id) ? preview : slide,
          ),
        }
      : undefined

    const accepted = await acceptSlideRegeneration({
      deckId: currentDeckId,
      createdBy: 'system',
      sourceTaskId: preview.id,
      parentVersionId: currentVersionId,
      pptistSlidesJson: nextSlides,
      aiDeckJson: nextDeck,
    })

    slidesStore.setSlides(accepted.slides)
    slidesStore.updateSlideIndex(Math.min(slidesStore.slideIndex, accepted.slides.length - 1))
    mainStore.setCurrentDeckContext(currentDeckId, accepted.versionId)
    if (nextDeck) {
      aiDeckStore.setRenderedDeck(nextDeck)
    }
    await snapshotStore.addSnapshot()
    clearPreview()

    return accepted
  }

  const clearPreview = () => {
    previewSlide.value = null
    lastInput.value = null
  }

  return {
    previewSlide,
    regenerateCurrentSlide,
    acceptPreviewReplaceCurrent,
    clearPreview,
  }
}
