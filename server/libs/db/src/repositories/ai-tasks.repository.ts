import { PrismaService } from '../prisma.service'

interface CreateAITaskInput {
  id: string
  userId: string
  deckId?: string
  deckVersionId?: string
  taskType: string
  status: string
}

export class AITasksRepository {
  constructor(private readonly prisma: PrismaService | any) {}

  createTask(data: CreateAITaskInput) {
    return this.prisma.aITask.create({
      data: {
        ...data,
        inputJson: {},
        outputJson: {},
      },
    })
  }
}
