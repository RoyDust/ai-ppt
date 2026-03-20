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
        findUnique: async ({ where }: any) => decks.get(where.id) ?? null,
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
        findUnique: async ({ where }: any) => versions.find(item => item.id === where.id) ?? null,
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
    expect(regenerationVersion.parentVersionId).toBe(renderVersion.id)
    expect(versions[1]?.parentVersionId).toBe(renderVersion.id)
    expect(decks.get('deck_1').currentVersionId).toBe(regenerationVersion.id)
  })

  it('reads the current version from deck.currentVersionId instead of deckVersion.isCurrent', async () => {
    const decks = new Map<string, any>()
    const versions: any[] = []

    const prisma = {
      deck: {
        create: async ({ data }: any) => {
          const created = {
            status: 'draft',
            language: 'zh-CN',
            actualPageCount: null,
            thumbnailUrl: null,
            currentVersionId: null,
            updatedAt: new Date('2026-03-20T09:00:00.000Z'),
            ...data,
          }
          decks.set(data.id, created)
          return created
        },
        update: async ({ where, data }: any) => {
          const current = decks.get(where.id)
          const updated = { ...current, ...data }
          decks.set(where.id, updated)
          return updated
        },
        findMany: async () => Array.from(decks.values()),
        findUnique: async ({ where }: any) => decks.get(where.id) ?? null,
      },
      deckVersion: {
        create: async ({ data }: any) => {
          const created = {
            ...data,
            id: data.id ?? `version_${versions.length + 1}`,
            createdAt: new Date(`2026-03-20T09:00:0${versions.length}.000Z`),
          }
          versions.push(created)
          return created
        },
        count: async ({ where }: any) => versions.filter(item => item.deckId === where.deckId).length,
        findUnique: async ({ where }: any) => versions.find(item => item.id === where.id) ?? null,
      },
    }

    const decksRepository = new DecksRepository(prisma as any)
    const deckVersionsRepository = new DeckVersionsRepository(prisma as any)
    const service = new AiService({ enqueue: async () => ({}) } as any, undefined, deckVersionsRepository, decksRepository)

    await decksRepository.create({
      id: 'deck_1',
      projectId: 'project_1',
      userId: 'user_1',
      title: '职业规划',
    })

    const originalVersion = await prisma.deckVersion.create({
      data: {
        deckId: 'deck_1',
        versionNo: 1,
        sourceType: 'deck_render',
        createdBy: 'user_1',
        titleSnapshot: '旧版本',
        actualPageCount: 8,
        pptistSlidesJson: [{ id: 'slide_old' }],
        aiDeckJson: {},
        outlineJson: [],
        styleFingerprintJson: {},
        isCurrent: true,
      },
    })

    const latestVersion = await service.acceptDeckRender({
      deckId: 'deck_1',
      createdBy: 'user_1',
      sourceTaskId: 'task_render_latest',
      pptistSlidesJson: [{ id: 'slide_latest' }],
      aiDeckJson: {
        topic: '职业规划',
        goalPageCount: 10,
        actualPageCount: 10,
        slides: [],
      } as any,
    })

    const deck = await service.getDeck('deck_1')
    const currentVersion = deck.currentVersion

    if (!currentVersion) {
      throw new Error('expected currentVersion to be present')
    }

    expect(originalVersion.isCurrent).toBe(true)
    expect(decks.get('deck_1').currentVersionId).toBe(latestVersion.id)
    expect(deck.currentVersionId).toBe(latestVersion.id)
    expect(currentVersion.id).toBe(latestVersion.id)
    expect(currentVersion.versionNo).toBe(2)
    expect(currentVersion.pptistSlidesJson).toEqual([{ id: 'slide_latest' }])
  })

  it('lists decks with scope filtering and a capped result size', async () => {
    const decks = new Map<string, any>()

    const prisma = {
      deck: {
        create: async ({ data }: any) => {
          const created = {
            status: 'draft',
            language: 'zh-CN',
            actualPageCount: null,
            thumbnailUrl: null,
            currentVersionId: null,
            updatedAt: new Date(data.updatedAt ?? '2026-03-20T09:00:00.000Z'),
            ...data,
          }
          decks.set(data.id, created)
          return created
        },
        findMany: async ({ where, orderBy, take, select }: any) => {
          let items = Array.from(decks.values())
          if (where?.userId) {
            items = items.filter(item => item.userId === where.userId)
          }
          if (where?.projectId) {
            items = items.filter(item => item.projectId === where.projectId)
          }
          if (orderBy?.updatedAt === 'desc') {
            items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
          }
          return items.slice(0, take).map((item) => {
            const picked: Record<string, unknown> = {}
            Object.keys(select).forEach((key) => {
              if (select[key]) picked[key] = item[key]
            })
            return picked
          })
        },
      },
    }

    const decksRepository = new DecksRepository(prisma as any)

    await Promise.all([
      decksRepository.create({ id: 'deck_1', userId: 'user_1', projectId: 'project_1', title: 'Deck 1' }),
      decksRepository.create({ id: 'deck_2', userId: 'user_1', projectId: 'project_1', title: 'Deck 2' }),
      decksRepository.create({ id: 'deck_3', userId: 'user_1', projectId: 'project_2', title: 'Deck 3' }),
      decksRepository.create({ id: 'deck_4', userId: 'user_2', projectId: 'project_1', title: 'Deck 4' }),
    ])

    decks.set('deck_1', { ...decks.get('deck_1'), updatedAt: new Date('2026-03-20T09:00:01.000Z') })
    decks.set('deck_2', { ...decks.get('deck_2'), updatedAt: new Date('2026-03-20T09:00:02.000Z') })
    decks.set('deck_3', { ...decks.get('deck_3'), updatedAt: new Date('2026-03-20T09:00:03.000Z') })
    decks.set('deck_4', { ...decks.get('deck_4'), updatedAt: new Date('2026-03-20T09:00:04.000Z') })

    const scoped = await decksRepository.listDeckSummaries({
      userId: 'user_1',
      projectId: 'project_1',
      limit: 1,
    })

    expect(scoped).toEqual([
      expect.objectContaining({
        id: 'deck_2',
        title: 'Deck 2',
      }),
    ])
  })

  it('rejects slide acceptance when parent version belongs to another deck', async () => {
    const decks = new Map<string, any>()
    const versions: any[] = []

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
        findUnique: async ({ where }: any) => versions.find(item => item.id === where.id) ?? null,
      },
    }

    const decksRepository = new DecksRepository(prisma as any)
    const deckVersionsRepository = new DeckVersionsRepository(prisma as any)
    const service = new AiService({ enqueue: async () => ({}) } as any, undefined, deckVersionsRepository, decksRepository)

    await decksRepository.create({
      id: 'deck_1',
      projectId: 'project_1',
      userId: 'user_1',
      title: '职业规划',
    })
    await decksRepository.create({
      id: 'deck_2',
      projectId: 'project_1',
      userId: 'user_1',
      title: '其他项目',
    })

    const otherDeckVersion = await deckVersionsRepository.createVersion({
      deckId: 'deck_2',
      createdBy: 'user_1',
      sourceType: 'deck_render',
      sourceTaskId: 'task_other',
      pptistSlidesJson: [{ id: 'slide_other' }],
      aiDeckJson: {},
    })

    await expect(service.acceptSlideRegeneration({
      deckId: 'deck_1',
      createdBy: 'user_1',
      sourceTaskId: 'task_regen',
      parentVersionId: otherDeckVersion.id,
      pptistSlidesJson: [{ id: 'slide_2' }],
    })).rejects.toMatchObject({
      name: 'NotFoundException',
      message: `Parent version ${otherDeckVersion.id} not found for deck deck_1`,
    })

    expect(versions).toHaveLength(1)
    expect(decks.get('deck_1').currentVersionId ?? null).toBeNull()
  })
})
