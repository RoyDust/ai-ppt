const MIN_PAGE_OFFSET = 1
const MAX_PAGE_OFFSET = 2

export const clampPlannedPageCount = (targetPageCount: number, generatedPageCount: number) => {
  const minPageCount = Math.max(1, targetPageCount - MIN_PAGE_OFFSET)
  const maxPageCount = Math.max(minPageCount, targetPageCount + MAX_PAGE_OFFSET)
  return Math.min(maxPageCount, Math.max(minPageCount, generatedPageCount))
}
