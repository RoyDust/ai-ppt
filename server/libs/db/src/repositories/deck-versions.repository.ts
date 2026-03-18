import { PrismaService } from '../prisma.service'

interface CreateDeckVersionInput {
  deckId: string
  createdBy: string
  sourceType: string
  sourceTaskId?: string
  parentVersionId?: string
  pptistSlidesJson: unknown[]
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
        outlineJson: [],
        aiDeckJson: {},
        styleFingerprintJson: {},
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
