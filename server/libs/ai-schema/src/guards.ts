import type { AIDeck } from './ai-deck'

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const isAIDeck = (value: unknown): value is AIDeck => {
  if (!isObject(value)) return false

  return (
    typeof value.id === 'string' &&
    typeof value.topic === 'string' &&
    typeof value.goalPageCount === 'number' &&
    typeof value.actualPageCount === 'number' &&
    typeof value.language === 'string' &&
    typeof value.outlineSummary === 'string' &&
    Array.isArray(value.slides)
  )
}
