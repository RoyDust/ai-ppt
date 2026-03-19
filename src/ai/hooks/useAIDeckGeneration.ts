import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore } from '@/store/main'
import { useAIDeckStore } from '../stores/aiDeck'
import { useAITasksStore } from '../stores/aiTasks'
import useAIDeckLoader from './useAIDeckLoader'
import { acceptDeckRender, getAITask, planDeck, renderDeck } from '../services/aiDeck'
import type { DeckPlanInput } from '../types/deck'

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

  const { plannedSlides, plannedPageCount } = storeToRefs(aiDeckStore)
  const outlineSlides = computed(() => plannedSlides.value)

  const waitForTaskCompletion = async (taskId: string) => {
    let attempts = 0
    while (attempts < 40) {
      const task = await getAITask(taskId)
      if (task.status !== 'queued') return task
      attempts++
      await new Promise(resolve => window.setTimeout(resolve, 300))
    }
    return getAITask(taskId)
  }

  const createPlan = async (input: DeckPlanInput) => {
    aiTasksStore.setPlanningState('loading')
    topic.value = input.topic
    goalPageCount.value = input.goalPageCount
    language.value = input.language

    const plan = await planDeck(input)
    aiDeckStore.setPlan(plan)
    aiTasksStore.setPlanningState('success')
    step.value = 'outline'
    return plan
  }

  const renderPlannedDeck = async () => {
    step.value = 'generating'
    const task = await renderDeck({
      topic: topic.value,
      goalPageCount: plannedPageCount.value || goalPageCount.value,
      language: language.value,
      overwrite: true,
    })
    aiTasksStore.setActiveTaskId(task.id)

    const currentTask = await waitForTaskCompletion(task.id)

    if (currentTask.status === 'succeeded' && currentTask.output) {
      aiDeckStore.setRenderedDeck(currentTask.output.deck)
      const accepted = await acceptDeckRender({
        deckId: currentTask.output.deck.id,
        createdBy: 'system',
        sourceTaskId: currentTask.id,
        pptistSlidesJson: currentTask.output.slides,
        aiDeckJson: currentTask.output.deck,
      })
      loadSlidesIntoEditor(accepted.slides, true)
      mainStore.setAIPPTDialogState(false)
      step.value = 'outline'
    }

    return currentTask
  }

  const resetToSetup = () => {
    step.value = 'setup'
    aiTasksStore.setPlanningState('idle')
  }

  return {
    step,
    topic,
    goalPageCount,
    language,
    outlineSlides,
    plannedPageCount,
    createPlan,
    renderPlannedDeck,
    resetToSetup,
  }
}
