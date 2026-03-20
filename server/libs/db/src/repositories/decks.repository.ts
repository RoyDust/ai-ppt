import { PrismaService } from '../prisma.service'

interface CreateDeckInput {
  id: string
  projectId: string
  userId: string
  title: string
}

interface DeckListScope {
  userId?: string
  projectId?: string
  limit?: number
}

const DEFAULT_DECK_LIST_LIMIT = 50

export class DecksRepository {
  constructor(private readonly prisma: PrismaService | any) {}

  async findDefaultProjectIdByUserId(userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })

    return project?.id ?? null
  }

  listDeckSummaries(scope: DeckListScope = {}) {
    const where = {
      ...(scope.userId ? { userId: scope.userId } : {}),
      ...(scope.projectId ? { projectId: scope.projectId } : {}),
    }

    return this.prisma.deck.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: scope.limit ?? DEFAULT_DECK_LIST_LIMIT,
      select: {
        id: true,
        title: true,
        status: true,
        thumbnailUrl: true,
        updatedAt: true,
        actualPageCount: true,
        currentVersionId: true,
      },
    })
  }

  findDeckSummaryById(deckId: string) {
    return this.prisma.deck.findUnique({
      where: { id: deckId },
      select: {
        id: true,
        title: true,
        status: true,
        thumbnailUrl: true,
        updatedAt: true,
        actualPageCount: true,
        currentVersionId: true,
      },
    })
  }

  create(data: CreateDeckInput) {
    return this.prisma.deck.create({
      data: {
        ...data,
        language: 'zh-CN',
        status: 'draft',
      },
    })
  }

  updateCurrentVersion(deckId: string, currentVersionId: string) {
    return this.prisma.deck.update({
      where: { id: deckId },
      data: { currentVersionId },
    })
  }
}
