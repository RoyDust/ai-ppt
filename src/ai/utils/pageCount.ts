export const clampAIPageCount = (targetPageCount: number, actualPageCount: number) => {
  const minPageCount = Math.max(1, targetPageCount - 1)
  const maxPageCount = Math.max(minPageCount, targetPageCount + 2)
  return Math.min(maxPageCount, Math.max(minPageCount, actualPageCount))
}
