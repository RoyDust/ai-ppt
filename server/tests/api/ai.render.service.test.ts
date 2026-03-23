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
        partialSuccess: false,
        progress: {
          totalBatches: 1,
          completedBatches: 1,
          failedBatches: 0,
          retryingBatches: 0,
          batches: [],
        },
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

  it('does not persist deckId on ai task rows before the deck record exists', async () => {
    const { AiService } = await import('../../apps/api/src/modules/ai/ai.service')
    const aiTasksRepository = {
      createTask: vi.fn(async (input) => input),
      updateTaskProgress: vi.fn(async () => undefined),
      completeTask: vi.fn(async () => undefined),
      failTask: vi.fn(async () => undefined),
    }
    const renderer = {
      render: vi.fn(async () => ({
        deck: {
          id: 'deck_runtime_1',
          topic: 'Topic',
          goalPageCount: 4,
          actualPageCount: 4,
          language: 'zh-CN',
          outlineSummary: 'Summary',
          slides: [],
        },
        slides: [],
        partialSuccess: false,
        progress: {
          totalBatches: 1,
          completedBatches: 1,
          failedBatches: 0,
          retryingBatches: 0,
          batches: [],
        },
      })),
    }
    const queueService = {
      enqueueAsync: vi.fn(async () => ({
        id: 'task_parent_2',
        type: 'deck_render',
        status: 'queued',
      })),
      getJob: vi.fn(),
    }
    const decksRepository = {
      findDeckSummaryById: vi.fn(async () => null),
    }

    const service = new AiService(
      queueService as any,
      aiTasksRepository as any,
      undefined,
      decksRepository as any,
      undefined,
      renderer as any,
      undefined,
    )

    await service.renderDeck({
      deck: {
        id: 'deck_runtime_1',
        topic: 'Topic',
        goalPageCount: 4,
        actualPageCount: 4,
        language: 'zh-CN',
        outlineSummary: 'Summary',
        slides: [],
      } as any,
      overwrite: true,
    } as any)

    expect(aiTasksRepository.createTask).toHaveBeenCalledWith(expect.objectContaining({
      id: 'task_parent_2',
      deckId: undefined,
      taskType: 'deck_render',
    }))
  })

  it('retries only failed batches for a partial-success render task', async () => {
    const { AiService } = await import('../../apps/api/src/modules/ai/ai.service')
    const retryFailedBatches = vi.fn(async () => ({
      partialSuccess: false,
      deck: {
        id: 'deck_3',
        topic: 'Topic',
        goalPageCount: 4,
        actualPageCount: 4,
        language: 'zh-CN',
        outlineSummary: 'Summary',
        slides: [],
      },
      slides: [],
      progress: {
        totalBatches: 2,
        completedBatches: 2,
        failedBatches: 0,
        retryingBatches: 0,
        batches: [
          { batchIndex: 0, status: 'succeeded' },
          { batchIndex: 1, status: 'succeeded' },
        ],
      },
    }))
    const queueService = {
      retryJob: vi.fn(async (_jobId: string, runner: (ctx: any) => Promise<unknown>) => {
        const output = await runner({
          jobId: 'task_parent_3',
          updateProgress: vi.fn(),
        })
        return {
          id: 'task_parent_3',
          type: 'deck_render',
          status: 'running',
          output: {
            progress: {
              totalBatches: 2,
              completedBatches: 1,
              failedBatches: 1,
              retryingBatches: 0,
              batches: [
                { batchIndex: 0, status: 'succeeded', renderedSlides: [{ id: 's1' }] },
                { batchIndex: 1, status: 'failed', canRetry: true },
              ],
            },
          },
          payload: {
            deck: {
              id: 'deck_3',
              topic: 'Topic',
              goalPageCount: 4,
              actualPageCount: 4,
              language: 'zh-CN',
              outlineSummary: 'Summary',
              slides: [],
            },
          },
        }
      }),
      getJob: vi.fn(() => ({
        id: 'task_parent_3',
        type: 'deck_render',
        status: 'partial_success',
        payload: {
          deck: {
            id: 'deck_3',
            topic: 'Topic',
            goalPageCount: 4,
            actualPageCount: 4,
            language: 'zh-CN',
            outlineSummary: 'Summary',
            slides: [],
          },
        },
        output: {
          progress: {
            totalBatches: 2,
            completedBatches: 1,
            failedBatches: 1,
            retryingBatches: 0,
            batches: [
              { batchIndex: 0, status: 'succeeded', renderedSlides: [{ id: 's1' }] },
              { batchIndex: 1, status: 'failed', canRetry: true },
            ],
          },
        },
      })),
    }
    const aiTasksRepository = {
      updateTaskProgress: vi.fn(async () => undefined),
      completeTask: vi.fn(async () => undefined),
      failTask: vi.fn(async () => undefined),
    }

    const service = new AiService(
      queueService as any,
      aiTasksRepository as any,
      undefined,
      undefined,
      undefined,
      { retryFailedBatches } as any,
      undefined,
    )

    const task = await service.retryFailedRenderBatches('task_parent_3')

    expect(retryFailedBatches).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'deck_3' }),
      expect.objectContaining({
        retryBatchIndexes: [1],
        previousProgress: expect.objectContaining({
          failedBatches: 1,
        }),
      }),
    )
    expect(task).toEqual({
      id: 'task_parent_3',
      type: 'deck_render',
      status: 'running',
    })
  })
})
