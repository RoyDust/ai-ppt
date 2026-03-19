import { defineStore } from 'pinia'

export type AIPlanningState = 'idle' | 'loading' | 'success' | 'error'
export type AIRenderState = 'idle' | 'loading' | 'success' | 'error'

interface AITasksState {
  planningState: AIPlanningState
  renderState: AIRenderState
  renderError: string
  activeTaskId: string
  lastPolledAt: string
}

export const useAITasksStore = defineStore('aiTasks', {
  state: (): AITasksState => ({
    planningState: 'idle',
    renderState: 'idle',
    renderError: '',
    activeTaskId: '',
    lastPolledAt: '',
  }),

  actions: {
    setPlanningState(state: AIPlanningState) {
      this.planningState = state
    },

    setRenderState(state: AIRenderState) {
      this.renderState = state
    },

    setRenderError(error: string) {
      this.renderError = error
    },

    setLastPolledAt(value: string) {
      this.lastPolledAt = value
    },

    setActiveTaskId(taskId: string) {
      this.activeTaskId = taskId
    },
  },
})
