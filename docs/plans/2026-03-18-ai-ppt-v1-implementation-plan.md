# AI PPT v1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an AI PPT v1 flow on top of PPTist that supports full-deck generation with target page count guidance and single-slide regeneration while keeping the output editable and exportable.

**Architecture:** Introduce a new semantic `AIDeck` schema between AI responses and PPTist slide JSON, then rework the existing AI dialog to use a plan-render pipeline and a separate slide-regeneration workflow. Keep PPTist as the editor and export engine, and keep rendering deterministic with template-family-based adapters instead of asking the model to emit native PPTist slide structures.

**Tech Stack:** Vue 3, TypeScript, Pinia, Vite, Vitest, existing PPTist slide schema, `fetch`/`axios`, existing template-mapping logic from `src/hooks/useAIPPT.ts`

---

### Task 1: Add Minimal Test Infrastructure

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `tests/unit/ai/smoke.test.ts`

**Step 1: Write the failing smoke test**

```ts
import { describe, expect, it } from 'vitest'

describe('ai test harness', () => {
  it('runs a basic unit test', () => {
    expect(true).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/ai/smoke.test.ts`

Expected: FAIL with `Cannot find package 'vitest'` or missing test configuration.

**Step 3: Write minimal implementation**

Update `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "jsdom": "^26.0.0",
    "vitest": "^3.2.4"
  }
}
```

Update `vite.config.ts`:

```ts
export default defineConfig({
  // existing config...
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
})
```

**Step 4: Install dependencies**

Run: `npm install`

Expected: `vitest` and `jsdom` are added to `node_modules` and lockfile is updated.

**Step 5: Run test to verify it passes**

Run: `npm run test -- tests/unit/ai/smoke.test.ts`

Expected: PASS.

**Step 6: Commit**

```bash
git add package.json package-lock.json vite.config.ts tests/unit/ai/smoke.test.ts
git commit -m "test: add minimal vitest harness for ai work"
```

### Task 2: Define the Shared AI Deck Schema and Validators

**Files:**
- Create: `src/types/aiDeck.ts`
- Create: `src/utils/aiDeck/guards.ts`
- Create: `tests/unit/ai/guards.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { isAIDeck, isAISlide } from '@/utils/aiDeck/guards'

describe('ai deck guards', () => {
  it('accepts a minimal valid content slide', () => {
    expect(isAISlide({
      id: 'slide_1',
      kind: 'content',
      title: '职业规划的重要性',
      bullets: ['帮助建立目标感'],
      regeneratable: true,
    })).toBe(true)
  })

  it('rejects slides without kind', () => {
    expect(isAISlide({
      id: 'slide_2',
      title: 'bad',
      regeneratable: true,
    })).toBe(false)
  })

  it('accepts a minimal valid deck', () => {
    expect(isAIDeck({
      id: 'deck_1',
      topic: '大学生职业生涯规划',
      goalPageCount: 10,
      actualPageCount: 11,
      language: 'zh-CN',
      outlineSummary: '围绕职业认知展开',
      slides: [],
    })).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/ai/guards.test.ts`

Expected: FAIL with module-not-found errors for `@/utils/aiDeck/guards`.

**Step 3: Write minimal implementation**

Create `src/types/aiDeck.ts`:

```ts
export type SlideKind =
  | 'cover'
  | 'agenda'
  | 'section'
  | 'content'
  | 'summary'
  | 'ending'

export type LayoutHint =
  | 'hero'
  | 'list'
  | 'two-column'
  | 'image-left'
  | 'image-right'
  | 'comparison'
  | 'timeline'

export interface StyleFingerprint {
  templateFamilyId: string
  themeTokenId?: string
  density?: 'light' | 'medium' | 'dense'
  titleStyle?: string
  bodyStyle?: string
  primaryColor?: string
  accentColor?: string
}

export interface SlideSection {
  title?: string
  body?: string
  bullets?: string[]
}

export interface AISlide {
  id: string
  kind: SlideKind
  title?: string
  subtitle?: string
  bullets?: string[]
  sections?: SlideSection[]
  speakerNote?: string
  imagePrompt?: string
  layoutHint?: LayoutHint
  importance?: 'high' | 'medium' | 'low'
  regeneratable: boolean
  sourceContext?: string
}

export interface AIDeck {
  id: string
  topic: string
  goalPageCount: number
  actualPageCount: number
  language: string
  audience?: string
  tone?: string
  purpose?: string
  outlineSummary: string
  slides: AISlide[]
}
```

Create `src/utils/aiDeck/guards.ts`:

```ts
import type { AIDeck, AISlide, SlideKind } from '@/types/aiDeck'

const slideKinds: SlideKind[] = ['cover', 'agenda', 'section', 'content', 'summary', 'ending']

export const isAISlide = (value: unknown): value is AISlide => {
  if (!value || typeof value !== 'object') return false
  const slide = value as Record<string, unknown>
  return typeof slide.id === 'string' &&
    typeof slide.regeneratable === 'boolean' &&
    typeof slide.kind === 'string' &&
    slideKinds.includes(slide.kind as SlideKind)
}

export const isAIDeck = (value: unknown): value is AIDeck => {
  if (!value || typeof value !== 'object') return false
  const deck = value as Record<string, unknown>
  return typeof deck.id === 'string' &&
    typeof deck.topic === 'string' &&
    typeof deck.goalPageCount === 'number' &&
    typeof deck.actualPageCount === 'number' &&
    typeof deck.language === 'string' &&
    typeof deck.outlineSummary === 'string' &&
    Array.isArray(deck.slides)
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/ai/guards.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/types/aiDeck.ts src/utils/aiDeck/guards.ts tests/unit/ai/guards.test.ts
git commit -m "feat: add ai deck schema and validators"
```

### Task 3: Add Pure Request Builders for Planning and Regeneration

**Files:**
- Create: `src/utils/aiDeck/requests.ts`
- Create: `tests/unit/ai/requests.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { buildDeckPlanPayload, buildSlideRegenerationPayload } from '@/utils/aiDeck/requests'

describe('ai deck request builders', () => {
  it('normalizes the goal page count for planning', () => {
    expect(buildDeckPlanPayload({
      topic: '大学生职业生涯规划',
      goalPageCount: 0,
      language: 'zh-CN',
    }).goalPageCount).toBe(1)
  })

  it('includes slide mode and style fingerprint in regeneration requests', () => {
    const payload = buildSlideRegenerationPayload({
      deckId: 'deck_1',
      slideId: 'slide_1',
      instructions: '更简洁',
      context: {
        deckTopic: '大学生职业生涯规划',
        deckOutlineSummary: '围绕职业认知展开',
        currentSlideGoal: '解释职业规划的重要性',
        currentSlideKind: 'content',
        mode: 'content-only',
        styleFingerprint: { templateFamilyId: 'business_v1' },
      },
    })

    expect(payload.context.mode).toBe('content-only')
    expect(payload.context.styleFingerprint.templateFamilyId).toBe('business_v1')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/ai/requests.test.ts`

Expected: FAIL with module-not-found errors.

**Step 3: Write minimal implementation**

Create `src/utils/aiDeck/requests.ts`:

```ts
import type { SlideKind, StyleFingerprint } from '@/types/aiDeck'

export interface DeckPlanForm {
  topic: string
  goalPageCount: number
  language: string
  audience?: string
  purpose?: string
  tone?: string
}

export interface SlideRegenerationPayload {
  deckId: string
  slideId: string
  instructions?: string
  context: {
    deckTopic: string
    deckOutlineSummary: string
    prevSlideSummary?: string
    nextSlideSummary?: string
    currentSlideGoal: string
    currentSlideKind: SlideKind
    currentLayoutHint?: string
    mode: 'content-only' | 'content-and-layout'
    styleFingerprint: StyleFingerprint
  }
}

export const buildDeckPlanPayload = (form: DeckPlanForm) => ({
  ...form,
  goalPageCount: Math.max(1, Math.floor(form.goalPageCount || 1)),
})

export const buildSlideRegenerationPayload = (payload: SlideRegenerationPayload) => payload
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/ai/requests.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/utils/aiDeck/requests.ts tests/unit/ai/requests.test.ts
git commit -m "feat: add ai deck request builders"
```

### Task 4: Add Dedicated AI Service Client

**Files:**
- Create: `src/services/aiDeck.ts`
- Modify: `src/services/index.ts`
- Create: `tests/unit/ai/service.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/services/fetch', () => ({
  default: vi.fn(() => Promise.resolve({ ok: true })),
}))

describe('ai deck service client', () => {
  it('calls the deck plan endpoint', async () => {
    const { planDeck } = await import('@/services/aiDeck')
    const response = await planDeck({
      topic: '大学生职业生涯规划',
      goalPageCount: 10,
      language: 'zh-CN',
    })

    expect(response).toEqual({ ok: true })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/ai/service.test.ts`

Expected: FAIL because `@/services/aiDeck` does not exist.

**Step 3: Write minimal implementation**

Create `src/services/aiDeck.ts`:

```ts
import fetchRequest from './fetch'
import { SERVER_URL } from './index'

export const planDeck = (body: unknown) => {
  return fetchRequest(`${SERVER_URL}/ai/deck/plan`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export const renderDeck = (body: unknown) => {
  return fetchRequest(`${SERVER_URL}/ai/deck/render`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export const regenerateSlide = (body: unknown) => {
  return fetchRequest(`${SERVER_URL}/ai/slide/regenerate`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
```

Update `src/services/index.ts` to export the new client alongside the old API object:

```ts
export * as aiDeckService from './aiDeck'
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/ai/service.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/services/aiDeck.ts src/services/index.ts tests/unit/ai/service.test.ts
git commit -m "feat: add ai deck service client"
```

### Task 5: Add an AI Task Store for Planning, Rendering, and Preview

**Files:**
- Create: `src/store/aiTasks.ts`
- Modify: `src/store/index.ts`
- Modify: `src/store/main.ts`
- Create: `tests/unit/ai/aiTasks.store.test.ts`

**Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAITasksStore } from '@/store/aiTasks'

describe('ai task store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('tracks the current deck planning status', () => {
    const store = useAITasksStore()
    store.setPlanningState('loading')
    expect(store.planningState).toBe('loading')
  })

  it('stores a regenerated preview slide without mutating the active deck', () => {
    const store = useAITasksStore()
    store.setSlidePreview({ id: 'preview_1', kind: 'content', regeneratable: true })
    expect(store.slidePreview?.id).toBe('preview_1')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/ai/aiTasks.store.test.ts`

Expected: FAIL with module-not-found errors.

**Step 3: Write minimal implementation**

Create `src/store/aiTasks.ts`:

```ts
import { defineStore } from 'pinia'
import type { AIDeck, AISlide } from '@/types/aiDeck'

type TaskState = 'idle' | 'loading' | 'success' | 'error'

export const useAITasksStore = defineStore('aiTasks', {
  state: () => ({
    planningState: 'idle' as TaskState,
    renderingState: 'idle' as TaskState,
    regenerationState: 'idle' as TaskState,
    plannedDeck: null as AIDeck | null,
    renderedDeck: null as AIDeck | null,
    slidePreview: null as AISlide | null,
    errorMessage: '',
  }),
  actions: {
    setPlanningState(state: TaskState) {
      this.planningState = state
    },
    setRenderingState(state: TaskState) {
      this.renderingState = state
    },
    setRegenerationState(state: TaskState) {
      this.regenerationState = state
    },
    setPlannedDeck(deck: AIDeck | null) {
      this.plannedDeck = deck
    },
    setRenderedDeck(deck: AIDeck | null) {
      this.renderedDeck = deck
    },
    setSlidePreview(slide: AISlide | null) {
      this.slidePreview = slide
    },
    setErrorMessage(message: string) {
      this.errorMessage = message
    },
    reset() {
      this.planningState = 'idle'
      this.renderingState = 'idle'
      this.regenerationState = 'idle'
      this.plannedDeck = null
      this.renderedDeck = null
      this.slidePreview = null
      this.errorMessage = ''
    },
  },
})
```

Update `src/store/index.ts`:

```ts
import { useAITasksStore } from './aiTasks'

export {
  useAITasksStore,
}
```

Update `src/store/main.ts` only if needed for modal visibility, for example:

```ts
showAISlideRegenerateDialog: boolean
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/ai/aiTasks.store.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/store/aiTasks.ts src/store/index.ts src/store/main.ts tests/unit/ai/aiTasks.store.test.ts
git commit -m "feat: add ai task store"
```

### Task 6: Build Pure Outline and Page Count Helpers

**Files:**
- Create: `src/utils/aiDeck/pageCount.ts`
- Create: `src/utils/aiDeck/outline.ts`
- Create: `tests/unit/ai/pageCount.test.ts`
- Create: `tests/unit/ai/outline.test.ts`

**Step 1: Write the failing page-count test**

```ts
import { describe, expect, it } from 'vitest'
import { clampPlannedPageCount } from '@/utils/aiDeck/pageCount'

describe('page count control', () => {
  it('keeps counts within the allowed range', () => {
    expect(clampPlannedPageCount(10, 14)).toBe(12)
    expect(clampPlannedPageCount(10, 7)).toBe(9)
  })
})
```

**Step 2: Write the failing outline helper test**

```ts
import { describe, expect, it } from 'vitest'
import { summarizeNeighborContext } from '@/utils/aiDeck/outline'

describe('outline helpers', () => {
  it('builds previous and next slide summaries', () => {
    const result = summarizeNeighborContext([
      { id: 'a', kind: 'cover', title: '封面', regeneratable: true },
      { id: 'b', kind: 'content', title: '重要性', regeneratable: true },
      { id: 'c', kind: 'content', title: '路径', regeneratable: true },
    ], 1)

    expect(result.prevSlideSummary).toContain('封面')
    expect(result.nextSlideSummary).toContain('路径')
  })
})
```

**Step 3: Run tests to verify they fail**

Run: `npm run test -- tests/unit/ai/pageCount.test.ts tests/unit/ai/outline.test.ts`

Expected: FAIL with module-not-found errors.

**Step 4: Write minimal implementation**

Create `src/utils/aiDeck/pageCount.ts`:

```ts
export const clampPlannedPageCount = (goal: number, actual: number) => {
  const min = Math.max(1, goal - 1)
  const max = goal + 2
  return Math.min(max, Math.max(min, actual))
}
```

Create `src/utils/aiDeck/outline.ts`:

```ts
import type { AISlide } from '@/types/aiDeck'

const summarizeSlide = (slide?: AISlide) => {
  if (!slide) return ''
  return [slide.title, slide.subtitle].filter(Boolean).join(' - ')
}

export const summarizeNeighborContext = (slides: AISlide[], index: number) => ({
  prevSlideSummary: summarizeSlide(slides[index - 1]),
  nextSlideSummary: summarizeSlide(slides[index + 1]),
})
```

**Step 5: Run tests to verify they pass**

Run: `npm run test -- tests/unit/ai/pageCount.test.ts tests/unit/ai/outline.test.ts`

Expected: PASS.

**Step 6: Commit**

```bash
git add src/utils/aiDeck/pageCount.ts src/utils/aiDeck/outline.ts tests/unit/ai/pageCount.test.ts tests/unit/ai/outline.test.ts
git commit -m "feat: add ai deck planning helpers"
```

### Task 7: Build the PPTist Renderer Adapter

**Files:**
- Create: `src/utils/aiDeck/renderDeck.ts`
- Create: `src/utils/aiDeck/renderSlide.ts`
- Modify: `src/hooks/useAIPPT.ts`
- Create: `tests/unit/ai/renderDeck.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import type { AISlide } from '@/types/aiDeck'
import { renderAISlideToPPTistSlide } from '@/utils/aiDeck/renderSlide'

const templateSlide = {
  id: 'template_1',
  elements: [],
  background: { type: 'solid', color: '#ffffff' },
}

describe('renderer adapter', () => {
  it('renders a content slide into a PPTist slide shell', () => {
    const aiSlide: AISlide = {
      id: 'slide_1',
      kind: 'content',
      title: '职业规划的重要性',
      bullets: ['帮助建立目标感'],
      regeneratable: true,
    }

    const rendered = renderAISlideToPPTistSlide(aiSlide, templateSlide as any)
    expect(rendered.id).toBeDefined()
    expect(rendered.background).toEqual(templateSlide.background)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/ai/renderDeck.test.ts`

Expected: FAIL with module-not-found errors.

**Step 3: Write minimal implementation**

Create `src/utils/aiDeck/renderSlide.ts`:

```ts
import { nanoid } from 'nanoid'
import type { AISlide } from '@/types/aiDeck'
import type { Slide } from '@/types/slides'

export const renderAISlideToPPTistSlide = (aiSlide: AISlide, templateSlide: Slide): Slide => {
  return {
    ...structuredClone(templateSlide),
    id: nanoid(10),
    aiMeta: {
      id: aiSlide.id,
      kind: aiSlide.kind,
    } as any,
  }
}
```

Create `src/utils/aiDeck/renderDeck.ts`:

```ts
import type { AIDeck } from '@/types/aiDeck'
import type { Slide } from '@/types/slides'
import { renderAISlideToPPTistSlide } from './renderSlide'

export const renderAIDeckToSlides = (deck: AIDeck, templateSlides: Slide[]) => {
  return deck.slides.map((slide, index) => {
    const template = templateSlides[index] || templateSlides[templateSlides.length - 1]
    return renderAISlideToPPTistSlide(slide, template)
  })
}
```

Modify `src/hooks/useAIPPT.ts` by extracting reusable mapping helpers instead of duplicating template lookup logic in the new adapter.

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/ai/renderDeck.test.ts`

Expected: PASS.

**Step 5: Expand implementation before moving on**

Before the commit, replace the placeholder shell renderer with real template-family matching and text-placeholder filling by reusing logic from `src/hooks/useAIPPT.ts`. Keep the pure adapter in `src/utils/aiDeck/*` and leave `useAIPPT.ts` only as a thin compatibility wrapper until the UI migration is complete.

**Step 6: Commit**

```bash
git add src/utils/aiDeck/renderDeck.ts src/utils/aiDeck/renderSlide.ts src/hooks/useAIPPT.ts tests/unit/ai/renderDeck.test.ts
git commit -m "feat: add ai deck renderer adapter"
```

### Task 8: Rework the AI Dialog Into a Plan-and-Render Flow

**Files:**
- Create: `src/hooks/useAIDeckGeneration.ts`
- Modify: `src/views/Editor/AIPPTDialog.vue`
- Modify: `src/views/Editor/index.vue`
- Modify: `src/views/Mobile/MobilePreview.vue`
- Create: `tests/unit/ai/useAIDeckGeneration.test.ts`

**Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/aiDeck', () => ({
  planDeck: vi.fn(() => Promise.resolve({ slides: [], plannedPageCount: 10 })),
  renderDeck: vi.fn(() => Promise.resolve({ deck: { id: 'deck_1', slides: [] } })),
}))

describe('useAIDeckGeneration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('moves from planning to outline review after a successful plan call', async () => {
    const { default: useAIDeckGeneration } = await import('@/hooks/useAIDeckGeneration')
    const generation = useAIDeckGeneration()
    await generation.createPlan({
      topic: '大学生职业生涯规划',
      goalPageCount: 10,
      language: 'zh-CN',
    })

    expect(generation.step.value).toBe('outline')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/ai/useAIDeckGeneration.test.ts`

Expected: FAIL with module-not-found errors.

**Step 3: Write minimal implementation**

Create `src/hooks/useAIDeckGeneration.ts` with:

```ts
import { ref } from 'vue'
import { useAITasksStore } from '@/store'
import { planDeck, renderDeck } from '@/services/aiDeck'

type Step = 'setup' | 'outline' | 'rendering'

export default () => {
  const aiTasksStore = useAITasksStore()
  const step = ref<Step>('setup')

  const createPlan = async (payload: unknown) => {
    aiTasksStore.setPlanningState('loading')
    const result = await planDeck(payload)
    aiTasksStore.setPlanningState('success')
    aiTasksStore.setPlannedDeck(result as any)
    step.value = 'outline'
  }

  const createDeck = async (payload: unknown) => {
    aiTasksStore.setRenderingState('loading')
    const result = await renderDeck(payload)
    aiTasksStore.setRenderingState('success')
    aiTasksStore.setRenderedDeck((result as any).deck || null)
    step.value = 'rendering'
  }

  return {
    step,
    createPlan,
    createDeck,
  }
}
```

Then rework `src/views/Editor/AIPPTDialog.vue` so the UI becomes:

- Form step for topic and page count.
- Outline review step.
- Final generation step.

The dialog should call the new composable instead of streaming directly from the old AIPPT endpoints.

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/ai/useAIDeckGeneration.test.ts`

Expected: PASS.

**Step 5: Manual verification**

Run: `npm run dev`

Expected: The editor opens, the AI dialog still opens from [src/views/Editor/EditorHeader/index.vue](/Users/roydust/Work/PPTist/src/views/Editor/EditorHeader/index.vue), and the new step flow renders without console errors.

**Step 6: Commit**

```bash
git add src/hooks/useAIDeckGeneration.ts src/views/Editor/AIPPTDialog.vue src/views/Editor/index.vue src/views/Mobile/MobilePreview.vue tests/unit/ai/useAIDeckGeneration.test.ts
git commit -m "feat: rework ai dialog into plan and render flow"
```

### Task 9: Load Rendered Decks Into the Existing Editor

**Files:**
- Create: `src/hooks/useAIDeckLoader.ts`
- Modify: `src/hooks/useAddSlidesOrElements.ts`
- Modify: `src/hooks/useSlideHandler.ts`
- Create: `tests/unit/ai/useAIDeckLoader.test.ts`

**Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSlidesStore } from '@/store'

describe('useAIDeckLoader', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('replaces the empty deck with rendered slides when overwrite is true', async () => {
    const { default: useAIDeckLoader } = await import('@/hooks/useAIDeckLoader')
    const slidesStore = useSlidesStore()
    const loader = useAIDeckLoader()

    loader.loadSlidesIntoEditor([{ id: 'slide_1', elements: [], background: { type: 'solid', color: '#fff' } }] as any, true)
    expect(slidesStore.slides).toHaveLength(1)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/ai/useAIDeckLoader.test.ts`

Expected: FAIL with module-not-found errors.

**Step 3: Write minimal implementation**

Create `src/hooks/useAIDeckLoader.ts`:

```ts
import { useSlidesStore } from '@/store'
import useSlideHandler from './useSlideHandler'
import useAddSlidesOrElements from './useAddSlidesOrElements'
import type { Slide } from '@/types/slides'

export default () => {
  const slidesStore = useSlidesStore()
  const { resetSlides } = useSlideHandler()
  const { addSlidesFromData } = useAddSlidesOrElements()

  const loadSlidesIntoEditor = (slides: Slide[], overwrite: boolean) => {
    if (overwrite) {
      resetSlides()
      slidesStore.setSlides(slides)
      return
    }
    addSlidesFromData(slides)
  }

  return {
    loadSlidesIntoEditor,
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/ai/useAIDeckLoader.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/hooks/useAIDeckLoader.ts src/hooks/useAddSlidesOrElements.ts src/hooks/useSlideHandler.ts tests/unit/ai/useAIDeckLoader.test.ts
git commit -m "feat: add ai deck loader for editor integration"
```

### Task 10: Add Single-Slide Regeneration With Preview

**Files:**
- Create: `src/hooks/useAISlideRegeneration.ts`
- Create: `src/views/Editor/AISlideRegenerateDialog.vue`
- Modify: `src/views/Editor/Thumbnails/index.vue`
- Modify: `src/views/Editor/index.vue`
- Modify: `src/store/main.ts`
- Create: `tests/unit/ai/useAISlideRegeneration.test.ts`

**Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/aiDeck', () => ({
  regenerateSlide: vi.fn(() => Promise.resolve({
    slide: {
      id: 'regen_1',
      kind: 'content',
      title: '影响职业选择的关键因素',
      bullets: ['个人兴趣与岗位匹配'],
      regeneratable: true,
    },
  })),
}))

describe('useAISlideRegeneration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('stores regenerated slide preview instead of replacing immediately', async () => {
    const { default: useAISlideRegeneration } = await import('@/hooks/useAISlideRegeneration')
    const regeneration = useAISlideRegeneration()
    await regeneration.regenerateCurrentSlide({
      deckId: 'deck_1',
      slideId: 'slide_1',
      instructions: '更简洁',
    } as any)

    expect(regeneration.previewSlide.value?.id).toBe('regen_1')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/ai/useAISlideRegeneration.test.ts`

Expected: FAIL with module-not-found errors.

**Step 3: Write minimal implementation**

Create `src/hooks/useAISlideRegeneration.ts`:

```ts
import { computed } from 'vue'
import { useAITasksStore } from '@/store'
import { regenerateSlide } from '@/services/aiDeck'

export default () => {
  const aiTasksStore = useAITasksStore()

  const regenerateCurrentSlide = async (payload: unknown) => {
    aiTasksStore.setRegenerationState('loading')
    const result = await regenerateSlide(payload)
    aiTasksStore.setSlidePreview((result as any).slide || null)
    aiTasksStore.setRegenerationState('success')
  }

  return {
    previewSlide: computed(() => aiTasksStore.slidePreview),
    regenerateCurrentSlide,
  }
}
```

Add a new modal component `src/views/Editor/AISlideRegenerateDialog.vue` to:

- Show mode selector.
- Show optional instruction text.
- Show preview actions.
- Offer `replace current slide` and `insert after current slide`.

Modify `src/views/Editor/Thumbnails/index.vue` to add a context menu item:

```ts
{
  text: '重新生成此页',
  handler: openAISlideRegenerateDialog,
}
```

Modify `src/store/main.ts` to track dialog visibility:

```ts
showAISlideRegenerateDialog: boolean
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/ai/useAISlideRegeneration.test.ts`

Expected: PASS.

**Step 5: Manual verification**

Run: `npm run dev`

Expected:

- Right-clicking a slide thumbnail shows `重新生成此页`.
- Regeneration opens a modal instead of mutating the slide immediately.
- Preview offers `替换当前页` and `插入到下一页`.

**Step 6: Commit**

```bash
git add src/hooks/useAISlideRegeneration.ts src/views/Editor/AISlideRegenerateDialog.vue src/views/Editor/Thumbnails/index.vue src/views/Editor/index.vue src/store/main.ts tests/unit/ai/useAISlideRegeneration.test.ts
git commit -m "feat: add single-slide regeneration preview flow"
```

### Task 11: Add Structured Logging and Basic Failure Telemetry

**Files:**
- Create: `src/utils/aiDeck/logging.ts`
- Modify: `src/hooks/useAIDeckGeneration.ts`
- Modify: `src/hooks/useAISlideRegeneration.ts`
- Create: `tests/unit/ai/logging.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { createAIDeckLogEvent } from '@/utils/aiDeck/logging'

describe('ai logging helpers', () => {
  it('creates a normalized generation event', () => {
    expect(createAIDeckLogEvent('deck_rendered', {
      goalPageCount: 10,
      actualPageCount: 11,
    })).toMatchObject({
      event: 'deck_rendered',
      goalPageCount: 10,
      actualPageCount: 11,
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/ai/logging.test.ts`

Expected: FAIL with module-not-found errors.

**Step 3: Write minimal implementation**

Create `src/utils/aiDeck/logging.ts`:

```ts
export const createAIDeckLogEvent = (event: string, payload: Record<string, unknown>) => ({
  event,
  timestamp: Date.now(),
  ...payload,
})
```

Then call this helper in the generation and regeneration composables before sending logs to the real analytics sink later.

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/ai/logging.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/utils/aiDeck/logging.ts src/hooks/useAIDeckGeneration.ts src/hooks/useAISlideRegeneration.ts tests/unit/ai/logging.test.ts
git commit -m "chore: add ai deck logging helpers"
```

## Verification Checklist Before Merge

- Run: `npm run test`
- Run: `npm run type-check`
- Run: `npm run build`
- Run: `npm run dev`
- Manually verify full-deck generation flow in desktop editor.
- Manually verify single-slide regeneration preview flow.
- Manually verify generated decks can still export through the existing export dialog.

## Notes for the Implementer

- Keep the new schema and helper logic pure wherever possible so most behavior can be tested without mounting the editor.
- Avoid embedding LLM-specific assumptions in Vue components.
- Reuse template-selection logic from `src/hooks/useAIPPT.ts`, but migrate that logic into `src/utils/aiDeck/*` instead of deepening the current monolith.
- Do not directly mutate live PPTist slide JSON with model output during regeneration.
- Keep v1 narrow: do not add full template management or image generation until the schema and regeneration loop are stable.
