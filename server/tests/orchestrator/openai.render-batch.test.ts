import { describe, expect, it, vi } from 'vitest'

import { OpenAIProvider } from '../../libs/ai-orchestrator/src/providers/openai.provider'

describe('OpenAIProvider.renderDeckBatch', () => {
  it('sends shared context and only batch slides to the model', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"slides":[{"id":"s1","kind":"content","title":"Rendered","bullets":[]}]}' } }],
      }),
    }))

    const provider = new OpenAIProvider({ apiKey: 'test', fetchImpl: fetchImpl as any })
    await provider.renderDeckBatch({
      sharedContext: { topic: 'Topic', language: 'zh-CN', outlineSummary: 'Summary', goalPageCount: 12, actualPageCount: 12, batchIndex: 0 },
      batchIndex: 0,
      batchCount: 2,
      slides: [{ id: 's1', kind: 'content', title: 'Raw', bullets: [] }] as any,
    })

    const request = (fetchImpl as any).mock.calls[0]?.[1] as { body: string } | undefined
    const body = JSON.parse(request?.body ?? '{}')
    const userMessage = body.messages[2].content as string
    expect(userMessage).toContain('"slides"')
    expect(userMessage).not.toContain('"actualPageCount":12')
  })
})
