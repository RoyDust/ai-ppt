import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAIDeckStore } from '../stores/aiDeck'
import { useAITasksStore } from '../stores/aiTasks'
import useAIDeckLoader from './useAIDeckLoader'
import { getAITask, planDeck, renderDeck } from '../services/aiDeck'
import type { DeckPlanInput } from '../types/deck'

export type AIDeckGenerationStep = 'setup' | 'outline' | 'generating'

export default () => {
  const aiDeckStore = useAIDeckStore()
  const aiTasksStore = useAITasksStore()
  const { loadSlidesIntoEditor } = useAIDeckLoader()
  const step = ref<AIDeckGenerationStep>('setup')
  const topic = ref('')
  const goalPageCount = ref(10)
  const language = ref('zh-CN')

  const { plannedSlides, plannedPageCount } = storeToRefs(aiDeckStore)
  const outlineSlides = computed(() => plannedSlides.value)

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

    let currentTask = await getAITask(task.id)
    if (currentTask.status === 'queued') {
      currentTask = await getAITask(task.id)
    }

    if (currentTask.status === 'succeeded' && currentTask.output) {
      aiDeckStore.setRenderedDeck(currentTask.output.deck)
      loadSlidesIntoEditor(currentTask.output.slides, true)
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
