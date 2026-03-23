import { PrismaService } from '../prisma.service'

interface CreateAITaskInput {
  id: string
  userId: string
  deckId?: string
  deckVersionId?: string
  taskType: string
  status: string
  inputJson?: Record<string, unknown>
  outputJson?: Record<string, unknown>
}

export class AITasksRepository {
  constructor(private readonly prisma: PrismaService | any) {}

  createTask(data: CreateAITaskInput) {
    return this.prisma.aITask.create({
      data: {
        ...data,
        inputJson: data.inputJson ?? {},
        outputJson: data.outputJson ?? {},
      },
    })
  }

  updateTaskProgress(id: string, progress: Record<string, unknown>, status = 'running') {
    return this.prisma.aITask.update({
      where: { id },
      data: {
        status,
        outputJson: {
          progress,
        },
      },
    })
  }

  completeTask(id: string, output: Record<string, unknown>, status = 'succeeded') {
    return this.prisma.aITask.update({
      where: { id },
      data: {
        status,
        outputJson: output,
      },
    })
  }

  failTask(id: string, error: { message: string; code?: string }, status = 'failed') {
    return this.prisma.aITask.update({
      where: { id },
      data: {
        status,
        errorCode: error.code,
        errorMessage: error.message,
      },
    })
  }
}
