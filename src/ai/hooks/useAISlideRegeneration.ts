import { ref } from 'vue'
import { regenerateSlide } from '../services/aiDeck'
import type { SlideRegenerationInput } from '../types/regeneration'
import type { AISlide } from '../types/slide'

export default () => {
  const previewSlide = ref<AISlide | null>(null)

  const regenerateCurrentSlide = async (input: SlideRegenerationInput) => {
    const result = await regenerateSlide(input)
    previewSlide.value = result.slide
    return result
  }

  const clearPreview = () => {
    previewSlide.value = null
  }

  return {
    previewSlide,
    regenerateCurrentSlide,
    clearPreview,
  }
}
