import { PrismaService } from '../prisma.service'

interface CreateDeckVersionInput {
  deckId: string
  createdBy: string
  sourceType: string
  sourceTaskId?: string
  parentVersionId?: string
  pptistSlidesJson: unknown[]
  aiDeckJson?: unknown
}

export class DeckVersionsRepository {
  constructor(private readonly prisma: PrismaService | any) {}

  async createVersion(input: CreateDeckVersionInput) {
    const versionNo = await this.getNextVersionNo(input.deckId)
    return this.prisma.deckVersion.create({
      data: {
        deckId: input.deckId,
        versionNo,
        sourceType: input.sourceType,
        sourceTaskId: input.sourceTaskId,
        parentVersionId: input.parentVersionId,
        createdBy: input.createdBy,
        pptistSlidesJson: input.pptistSlidesJson,
        outlineJson: Array.isArray(input.aiDeckJson && (input.aiDeckJson as any).slides) ? (input.aiDeckJson as any).slides : [],
        aiDeckJson: input.aiDeckJson ?? {},
        styleFingerprintJson: {},
        titleSnapshot: typeof (input.aiDeckJson as any)?.topic === 'string' ? (input.aiDeckJson as any).topic : null,
        targetPageCount: typeof (input.aiDeckJson as any)?.goalPageCount === 'number' ? (input.aiDeckJson as any).goalPageCount : null,
        actualPageCount: typeof (input.aiDeckJson as any)?.actualPageCount === 'number' ? (input.aiDeckJson as any).actualPageCount : null,
      },
    })
  }

  private async getNextVersionNo(deckId: string) {
    const existingCount = await this.prisma.deckVersion.count({
      where: { deckId },
    })
    return existingCount + 1
  }
}
