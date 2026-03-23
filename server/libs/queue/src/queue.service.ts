import { Injectable } from '@nestjs/common'

export interface QueueRunnerContext {
  jobId: string
  updateProgress: (progress: Record<string, unknown>) => void
}

export interface QueueJob<TPayload> {
  id: string
  type: string
  payload: TPayload
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'partial_success'
  progress?: Record<string, unknown>
  output?: unknown
  error?: string
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

  enqueueAsync<TPayload>(
    type: string,
    payload: TPayload,
    runner: (context: QueueRunnerContext) => Promise<unknown>,
  ): QueueJob<TPayload> {
    const job: QueueJob<TPayload> = {
      id: `${type}_${Date.now()}`,
      type,
      payload,
      status: 'queued',
    }
    this.jobs.set(job.id, job)

    queueMicrotask(async () => {
      try {
        this.jobs.set(job.id, {
          ...job,
          status: 'running',
        })

        const output = await runner({
          jobId: job.id,
          updateProgress: (progress) => {
            const current = this.jobs.get(job.id) as QueueJob<TPayload> | undefined
            this.jobs.set(job.id, {
              ...(current ?? job),
              status: 'running',
              progress,
            })
          },
        })

        const status = this.resolveAsyncStatus(output)
        this.jobs.set(job.id, {
          ...(this.jobs.get(job.id) as QueueJob<TPayload> | undefined ?? job),
          status,
          output,
        })
      }
      catch (error) {
        this.jobs.set(job.id, {
          ...(this.jobs.get(job.id) as QueueJob<TPayload> | undefined ?? job),
          status: 'failed',
          error: error instanceof Error ? error.message : 'AI render failed',
        })
      }
    })

    return job
  }

  getJob(id: string) {
    return this.jobs.get(id) ?? null
  }

  async retryJob(id: string, runner: (context: QueueRunnerContext) => Promise<unknown>) {
    const existing = this.jobs.get(id)
    if (!existing) return null

    this.jobs.set(id, {
      ...existing,
      status: 'running',
      error: undefined,
    })

    try {
      const output = await runner({
        jobId: id,
        updateProgress: (progress) => {
          const current = this.jobs.get(id) as QueueJob<unknown> | undefined
          this.jobs.set(id, {
            ...(current ?? existing),
            status: 'running',
            progress,
          })
        },
      })

      const status = this.resolveAsyncStatus(output)
      const updated = {
        ...(this.jobs.get(id) as QueueJob<unknown> | undefined ?? existing),
        status,
        output,
      }
      this.jobs.set(id, updated)
      return updated
    }
    catch (error) {
      const updated = {
        ...(this.jobs.get(id) as QueueJob<unknown> | undefined ?? existing),
        status: 'failed' as const,
        error: error instanceof Error ? error.message : 'AI render failed',
      }
      this.jobs.set(id, updated)
      return updated
    }
  }

  private resolveAsyncStatus(output: unknown): QueueJob<unknown>['status'] {
    if (output && typeof output === 'object') {
      const record = output as Record<string, unknown>
      if (record.status === 'partial_success' || record.partialSuccess === true) {
        return 'partial_success'
      }
    }

    return 'succeeded'
  }
}
