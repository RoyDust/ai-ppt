import type { AITaskResponse } from '../types/deck'

interface PollOptions {
  intervalMs?: number
  timeoutMs?: number
  onPoll?: (task: AITaskResponse) => void
}

const delay = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms))

export const pollAITaskUntilSettled = async (
  getTask: (taskId: string) => Promise<AITaskResponse>,
  taskId: string,
  options: PollOptions = {},
) => {
  const intervalMs = options.intervalMs ?? 1000
  const timeoutMs = options.timeoutMs ?? 1000 * 60 * 5
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    const task = await getTask(taskId)
    options.onPoll?.(task)
    if (task.status !== 'queued' && task.status !== 'running') return task
    await delay(intervalMs)
  }

  return {
    id: taskId,
    status: 'failed' as const,
    error: 'AI 制作超时，请重试',
  }
}
