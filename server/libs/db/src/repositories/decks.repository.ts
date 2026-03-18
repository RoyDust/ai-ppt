import { PrismaService } from '../prisma.service'

interface CreateDeckInput {
  id: string
  projectId: string
  userId: string
  title: string
}

export class DecksRepository {
  constructor(private readonly prisma: PrismaService | any) {}

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
