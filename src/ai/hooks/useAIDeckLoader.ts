import useAddSlidesOrElements from '@/hooks/useAddSlidesOrElements'
import useSlideHandler from '@/hooks/useSlideHandler'
import type { Slide } from '@/types/slides'

export default () => {
  const { loadSlidesFromData } = useAddSlidesOrElements()
  const { replaceSlidesFromData } = useSlideHandler()

  const loadSlidesIntoEditor = (slides: Slide[], overwrite = false) => {
    if (overwrite) {
      replaceSlidesFromData(slides)
      return
    }

    loadSlidesFromData(slides, false)
  }

  return {
    loadSlidesIntoEditor,
  }
}
