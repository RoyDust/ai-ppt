import { defineStore } from 'pinia'

export type AIPlanningState = 'idle' | 'loading' | 'success' | 'error'

interface AITasksState {
  planningState: AIPlanningState
  activeTaskId: string
}

export const useAITasksStore = defineStore('aiTasks', {
  state: (): AITasksState => ({
    planningState: 'idle',
    activeTaskId: '',
  }),

  actions: {
    setPlanningState(state: AIPlanningState) {
      this.planningState = state
    },

    setActiveTaskId(taskId: string) {
      this.activeTaskId = taskId
    },
  },
})
