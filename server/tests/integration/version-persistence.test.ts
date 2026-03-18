import { describe, expect, it, vi } from 'vitest'

vi.mock('@nestjs/common', () => ({
  Injectable: () => () => undefined,
  Optional: () => () => undefined,
}))

import { AiService } from '../../apps/api/src/modules/ai/ai.service'
import { DecksRepository } from '../../libs/db/src/repositories/decks.repository'
import { DeckVersionsRepository } from '../../libs/db/src/repositories/deck-versions.repository'
import { AITasksRepository } from '../../libs/db/src/repositories/ai-tasks.repository'

describe('version persistence', () => {
  it('persists ai tasks and deck versions for accepted results', async () => {
    const decks = new Map<string, any>()
    const versions: any[] = []
    const tasks: any[] = []

    const prisma = {
      deck: {
        create: async ({ data }: any) => {
          decks.set(data.id, { ...data })
          return data
        },
        update: async ({ where, data }: any) => {
          const current = decks.get(where.id)
          const updated = { ...current, ...data }
          decks.set(where.id, updated)
          return updated
        },
      },
      deckVersion: {
        create: async ({ data }: any) => {
          const created = { ...data, id: data.id ?? `version_${versions.length + 1}` }
          versions.push(created)
          return created
        },
        count: async ({ where }: any) => versions.filter(item => item.deckId === where.deckId).length,
      },
      aITask: {
        create: async ({ data }: any) => {
          tasks.push(data)
          return data
        },
      },
    }

    const decksRepository = new DecksRepository(prisma as any)
    const deckVersionsRepository = new DeckVersionsRepository(prisma as any)
    const aiTasksRepository = new AITasksRepository(prisma as any)
    const service = new AiService({ enqueue: async () => ({}) } as any, aiTasksRepository, deckVersionsRepository, decksRepository)

    await decksRepository.create({
      id: 'deck_1',
      projectId: 'project_1',
      userId: 'user_1',
      title: '职业规划',
    })

    await service.recordAITask({
      id: 'task_render',
      userId: 'user_1',
      deckId: 'deck_1',
      taskType: 'deck_render',
      status: 'succeeded',
    })

    const renderVersion = await service.acceptDeckRender({
      deckId: 'deck_1',
      createdBy: 'user_1',
      sourceTaskId: 'task_render',
      pptistSlidesJson: [{ id: 'slide_1' }],
    })

    await service.recordAITask({
      id: 'task_regen',
      userId: 'user_1',
      deckId: 'deck_1',
      taskType: 'slide_regenerate',
      status: 'succeeded',
      deckVersionId: renderVersion.id,
    })

    const regenerationVersion = await service.acceptSlideRegeneration({
      deckId: 'deck_1',
      createdBy: 'user_1',
      sourceTaskId: 'task_regen',
      parentVersionId: renderVersion.id,
      pptistSlidesJson: [{ id: 'slide_2' }],
    })

    expect(tasks).toHaveLength(2)
    expect(versions).toHaveLength(2)
    expect(regenerationVersion.sourceType).toBe('slide_regenerate')
    expect(decks.get('deck_1').currentVersionId).toBe(regenerationVersion.id)
  })
})
