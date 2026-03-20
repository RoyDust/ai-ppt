import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore } from '@/store/main'
import message from '@/utils/message'
import { useAIDeckStore } from '../stores/aiDeck'
import { useAITasksStore } from '../stores/aiTasks'
import useAIDeckLoader from './useAIDeckLoader'
import { acceptDeckRender, getAITask, planDeck, renderDeck } from '../services/aiDeck'
import { normalizeDeckPlanInput, type DeckPlanInput } from '../types/deck'
import type { DeckPlanResponse } from '../types/deck'
import { pollAITaskUntilSettled } from '../utils/taskPolling'

export type AIDeckGenerationStep = 'setup' | 'outline' | 'generating'

export default () => {
  const aiDeckStore = useAIDeckStore()
  const aiTasksStore = useAITasksStore()
  const mainStore = useMainStore()
  const { loadSlidesIntoEditor } = useAIDeckLoader()
  const step = ref<AIDeckGenerationStep>('setup')
  const topic = ref('')
  const goalPageCount = ref(10)
  const language = ref('zh-CN')

  const { editableDeck, plannedPageCount } = storeToRefs(aiDeckStore)
  const { lastPolledAt, planningState, renderState } = storeToRefs(aiTasksStore)
  const outlineSlides = computed(() => editableDeck.value?.slides ?? [])
  const isPlanning = computed(() => planningState.value === 'loading')
  const isRendering = computed(() => renderState.value === 'loading')
  const loadingText = computed(() => {
    if (isPlanning.value) return '正在生成大纲，请稍候...'
    if (isRendering.value) return '正在创建 PPT，请稍候...'
    return ''
  })

  const formatPollTime = (date = new Date()) => {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
  }

  const createPlan = async (input: DeckPlanInput) => {
    const normalized = normalizeDeckPlanInput(input)
    if (!normalized.ok) {
      const text = normalized.errors.topic || normalized.errors.researchBrief || 'AI 大纲生成失败，请重试'
      aiTasksStore.setPlanningState('error')
      aiTasksStore.setRenderError(text)
      message.error(text)
      return null
    }

    const payload = normalized.payload
    aiTasksStore.setPlanningState('loading')
    aiTasksStore.setRenderError('')
    topic.value = payload.topic
    goalPageCount.value = payload.goalPageCount
    language.value = payload.language

    try {
      const requestPlan = async (attempt: number): Promise<DeckPlanResponse> => {
        try {
          return await planDeck(payload)
        }
        catch (error) {
          if (attempt === 0) {
            message.warning('首次规划失败，正在自动重试...')
            return requestPlan(1)
          }
          throw error
        }
      }

      const plan = await requestPlan(0)
      aiDeckStore.setPlan(plan)
      aiTasksStore.setPlanningState('success')
      step.value = 'outline'
      return plan
    }
    catch (error) {
      aiTasksStore.setPlanningState('error')
      const text = error instanceof Error ? error.message : 'AI 大纲生成失败，请重试'
      message.error(text)
      return null
    }
  }

  const renderPlannedDeck = async () => {
    const currentDeck = editableDeck.value
    if (!currentDeck) return null

    aiTasksStore.setRenderState('loading')
    aiTasksStore.setRenderError('')
    aiTasksStore.setLastPolledAt('')
    step.value = 'generating'
    try {
      const task = await renderDeck({
        deck: currentDeck,
        deckId: currentDeck.id,
        topic: currentDeck.topic || topic.value,
        goalPageCount: currentDeck.goalPageCount || plannedPageCount.value || goalPageCount.value,
        language: currentDeck.language || language.value,
        overwrite: true,
      })
      aiTasksStore.setActiveTaskId(task.id)

      const currentTask = await pollAITaskUntilSettled(getAITask, task.id, {
        intervalMs: 1000,
        onPoll: () => aiTasksStore.setLastPolledAt(formatPollTime()),
      })

      if (currentTask.status === 'succeeded' && currentTask.output) {
        aiTasksStore.setRenderState('success')
        aiDeckStore.setRenderedDeck(currentTask.output.deck)
        const accepted = await acceptDeckRender({
          deckId: currentTask.output.deck.id,
          createdBy: 'system',
          sourceTaskId: currentTask.id,
        })
        mainStore.setCurrentDeckContext(accepted.deckId || currentTask.output.deck.id, accepted.versionId)
        loadSlidesIntoEditor(accepted.slides, true)
        mainStore.setAIPPTDialogState(false)
        step.value = 'outline'
      }
      else if (currentTask.status === 'failed') {
        aiTasksStore.setRenderState('error')
        aiTasksStore.setRenderError(currentTask.error || 'AI 制作失败，请重试')
        message.error(currentTask.error || 'AI 制作失败，请重试')
        step.value = 'outline'
      }

      return currentTask
    }
    catch (error) {
      aiTasksStore.setRenderState('error')
      const text = error instanceof Error ? error.message : 'AI 制作失败，请重试'
      aiTasksStore.setRenderError(text)
      message.error(text)
      step.value = 'outline'
      return null
    }
  }

  const resetToSetup = () => {
    step.value = 'setup'
    aiTasksStore.setPlanningState('idle')
    aiTasksStore.setRenderState('idle')
    aiTasksStore.setRenderError('')
    aiTasksStore.setLastPolledAt('')
  }

  const updateOutlineSummary = (value: string) => aiDeckStore.updateOutlineSummary(value)
  const updateSlideTitle = (slideId: string, value: string) => aiDeckStore.updateSlideTitle(slideId, value)
  const updateSlideSummary = (slideId: string, value: string) => aiDeckStore.updateSlideSummary(slideId, value)
  const updateSlideBullets = (slideId: string, value: string) => {
    const bullets = value
      .split('\n')
      .map(item => item.trim())
      .filter(Boolean)
    aiDeckStore.updateSlideBullets(slideId, bullets)
  }

  return {
    step,
    topic,
    goalPageCount,
    language,
    editableDeck,
    lastPolledAt,
    planningState,
    renderState,
    isPlanning,
    isRendering,
    loadingText,
    outlineSlides,
    plannedPageCount,
    createPlan,
    renderPlannedDeck,
    resetToSetup,
    updateOutlineSummary,
    updateSlideTitle,
    updateSlideSummary,
    updateSlideBullets,
  }
}
