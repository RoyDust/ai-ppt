import { describe, expect, it, vi } from 'vitest'

vi.mock('@nestjs/common', () => ({
  Injectable: () => () => undefined,
  Optional: () => () => undefined,
  NotFoundException: class NotFoundException extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'NotFoundException'
    }
  },
}))

describe('AiService.renderDeck task tracking', () => {
  it('returns the parent task id and stores progress metadata', async () => {
    const { AiService } = await import('../../apps/api/src/modules/ai/ai.service')
    const aiTasksRepository = {
      createTask: vi.fn(async (input) => input),
      updateTaskProgress: vi.fn(async (_id: string, _progress: Record<string, unknown>, _status?: string) => undefined),
      completeTask: vi.fn(async (_id: string, _output: Record<string, unknown>, _status?: string) => undefined),
      failTask: vi.fn(async (_id: string, _error: { message: string; code?: string }, _status?: string) => undefined),
    }
    const renderer = {
      render: vi.fn(async () => ({
        deck: {
          id: 'deck_1',
          topic: 'Topic',
          goalPageCount: 4,
          actualPageCount: 4,
          language: 'zh-CN',
          outlineSummary: 'Summary',
          slides: [],
        },
        slides: [],
      })),
    }
    const queueService = {
      enqueueAsync: vi.fn(async (_type: string, _payload: unknown, runner: (ctx: any) => Promise<unknown>) => {
        await runner({
          jobId: 'task_parent_1',
          updateProgress: (progress: Record<string, unknown>) => aiTasksRepository.updateTaskProgress('task_parent_1', progress, 'running'),
        })

        return {
          id: 'task_parent_1',
          type: 'deck_render',
          status: 'queued',
        }
      }),
      getJob: vi.fn(),
    }

    const service = new AiService(
      queueService as any,
      aiTasksRepository as any,
      undefined,
      undefined,
      undefined,
      renderer as any,
      undefined,
    )

    const task = await service.renderDeck({
      deck: {
        id: 'deck_1',
        topic: 'Topic',
        goalPageCount: 4,
        actualPageCount: 4,
        language: 'zh-CN',
        outlineSummary: 'Summary',
        slides: [],
      } as any,
      overwrite: true,
    } as any)

    expect(task).toEqual({
      id: 'task_parent_1',
      type: 'deck_render',
      status: 'queued',
    })
    expect(aiTasksRepository.createTask).toHaveBeenCalledWith(expect.objectContaining({
      id: 'task_parent_1',
      taskType: 'deck_render',
      status: 'queued',
    }))
    expect(aiTasksRepository.updateTaskProgress).toHaveBeenCalledWith(
      'task_parent_1',
      expect.objectContaining({ totalBatches: 1 }),
      'running',
    )
  })
})
