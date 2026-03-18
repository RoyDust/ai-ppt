import { Injectable } from '@nestjs/common'

export interface QueueJob<TPayload> {
  id: string
  type: string
  payload: TPayload
  status: 'queued' | 'succeeded' | 'failed'
  output?: unknown
}

@Injectable()
export class QueueService {
  private readonly jobs = new Map<string, QueueJob<unknown>>()

  enqueue<TPayload>(type: string, payload: TPayload, output?: unknown): QueueJob<TPayload> {
    const job: QueueJob<TPayload> = {
      id: `${type}_${Date.now()}`,
      type,
      payload,
      status: 'queued',
    }
    this.jobs.set(job.id, job)

    queueMicrotask(() => {
      this.jobs.set(job.id, {
        ...job,
        status: 'succeeded',
        output,
      })
    })

    return job
  }

  getJob(id: string) {
    return this.jobs.get(id) ?? null
  }
}
