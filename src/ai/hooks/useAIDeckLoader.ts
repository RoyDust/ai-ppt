import useAddSlidesOrElements from '@/hooks/useAddSlidesOrElements'
import useSlideHandler from '@/hooks/useSlideHandler'
import type { Slide } from '@/types/slides'
import { useMainStore, useSlidesStore, useSnapshotStore } from '@/store'

export default () => {
  const { loadSlidesFromData } = useAddSlidesOrElements()
  const { replaceSlidesFromData } = useSlideHandler()
  const mainStore = useMainStore()
  const slidesStore = useSlidesStore()
  const snapshotStore = useSnapshotStore()

  const loadSlidesIntoEditor = (slides: Slide[], overwrite = false) => {
    if (overwrite) {
      replaceSlidesFromData(slides)
      return
    }

    loadSlidesFromData(slides, false)
  }

  const openDeckIntoEditor = async ({
    slides,
    deckId = '',
    versionId = '',
    title = '',
  }: {
    slides: Slide[]
    deckId?: string
    versionId?: string
    title?: string
  }) => {
    mainStore.resetEditorTransientState()
    mainStore.setCurrentDeckContext(deckId, versionId)
    mainStore.setAppView('editor')
    slidesStore.updateSlideIndex(0)
    slidesStore.setSlides(slides)
    slidesStore.setTitle(title)
    await snapshotStore.resetSnapshotDatabase(slides)
  }

  return {
    loadSlidesIntoEditor,
    openDeckIntoEditor,
  }
}
