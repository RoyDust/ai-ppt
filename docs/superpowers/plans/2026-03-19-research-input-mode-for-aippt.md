# Research Input Mode For AIPPT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a structured “research project input mode” to AIPPT so complex research briefs can be normalized into a controlled slide plan and rendered through `MASTER_TEMPLATE_AI` without overloading the cover page or free-form slide generation.

**Architecture:** Extend the existing AIPPT planning flow instead of creating a second modal. Frontend setup gains an input-mode switch and structured research fields. Backend planning gains a parser/normalizer/planner pipeline that converts complex research input into a normalized deck contract before the LLM and template renderer consume it. `MASTER_TEMPLATE_AI` keeps strict template mappings, especially for cover and structured pages such as table, compare, toc, and summary.

**Tech Stack:** Vue 3, TypeScript, Pinia, NestJS, Vitest, existing AIPPT planner/render pipeline

---

### Task 1: Define the complex-input contract end to end

**Files:**
- Modify: `src/ai/types/deck.ts`
- Modify: `server/apps/api/src/modules/ai/dto/deck-plan.dto.ts`
- Modify: `server/apps/api/src/modules/ai/dto/deck-render.dto.ts`
- Modify: `server/libs/ai-schema/src/ai-deck.ts`
- Test: `tests/unit/ai/useAIDeckGeneration.test.ts`
- Test: `server/tests/api/ai.controller.test.ts`

- [ ] **Step 1: Add a failing frontend test or fixture update for richer plan input**

Update `tests/unit/ai/useAIDeckGeneration.test.ts` to expect `createPlan()` to support an input mode and optional structured research payload.

Expected: RED because the current plan input only carries `topic`, `goalPageCount`, and `language`.

- [ ] **Step 2: Define shared frontend payload types**

Update `src/ai/types/deck.ts` with:

```ts
type AIPPTInputMode = 'simple' | 'research'

interface ResearchProjectInput {
  projectBackground: string[]
  projectObjectives: string[]
  sampleDesign: { ... }
  researchFramework: Array<{ ... }>
}
```

Expected: the frontend can represent both simple topic mode and structured research mode without overloading `topic`.

- [ ] **Step 3: Extend backend DTOs to accept the richer payload**

Update:
- `server/apps/api/src/modules/ai/dto/deck-plan.dto.ts`
- `server/apps/api/src/modules/ai/dto/deck-render.dto.ts`

Expected: API accepts `inputMode`, optional `researchInput`, and any new normalized metadata needed for later render.

- [ ] **Step 4: Extend shared AI deck schema where planning metadata must persist**

Update `server/libs/ai-schema/src/ai-deck.ts` so persisted deck data can carry the normalized research metadata needed by later render and editing.

- [ ] **Step 5: Run targeted tests**

Run:
- `npx vitest run tests/unit/ai/useAIDeckGeneration.test.ts`
- `cd server && npx vitest run tests/api/ai.controller.test.ts`

Expected: GREEN

- [ ] **Step 6: Commit**

```bash
git add src/ai/types/deck.ts server/apps/api/src/modules/ai/dto/deck-plan.dto.ts server/apps/api/src/modules/ai/dto/deck-render.dto.ts server/libs/ai-schema/src/ai-deck.ts tests/unit/ai/useAIDeckGeneration.test.ts server/tests/api/ai.controller.test.ts
git commit -m "feat: add research input contract for ai ppt"
```

### Task 2: Add structured research input mode to the existing AIPPT setup UI

**Files:**
- Modify: `src/ai/components/AIDeckSetupForm.vue`
- Modify: `src/ai/hooks/useAIDeckGeneration.ts`
- Modify: `src/views/Editor/AIPPTDialog.vue`
- Test: `tests/unit/ai/useAIDeckGeneration.test.ts`

- [ ] **Step 1: Add a failing test for research-mode submission payload**

Extend `tests/unit/ai/useAIDeckGeneration.test.ts` or add a focused setup-form payload test fixture so research-mode submission includes structured data instead of only free text.

Expected: RED because current setup form has only a topic input and simple controls.

- [ ] **Step 2: Add an input-mode switch to the setup form**

Update `src/ai/components/AIDeckSetupForm.vue` to support:
- `simple` mode
- `research` mode

Research mode should include structured sections such as:
- project background
- project objectives
- sample design
- research framework

Expected: the UI stays inside the existing AIPPT modal and does not introduce a second modal or divergent flow.

- [ ] **Step 3: Add lightweight front-end structuring helpers**

Inside `src/ai/components/AIDeckSetupForm.vue` or a nearby helper file, convert long text / pasted JSON into structured arrays and text blocks suitable for the backend contract.

Expected: frontend sends predictable structured data, not one giant raw blob.

- [ ] **Step 4: Update the AIPPT generation hook**

Modify `src/ai/hooks/useAIDeckGeneration.ts` so `createPlan()` stores and submits `inputMode` plus the structured research payload.

- [ ] **Step 5: Keep the dialog shell compact for research mode**

Adjust `src/views/Editor/AIPPTDialog.vue` only as needed so the header and side rail remain compact and do not crowd the larger research form.

- [ ] **Step 6: Run targeted frontend tests**

Run:
- `npx vitest run tests/unit/ai/useAIDeckGeneration.test.ts`
- `npm run type-check`

Expected: GREEN

- [ ] **Step 7: Commit**

```bash
git add src/ai/components/AIDeckSetupForm.vue src/ai/hooks/useAIDeckGeneration.ts src/views/Editor/AIPPTDialog.vue tests/unit/ai/useAIDeckGeneration.test.ts
git commit -m "feat: add research mode to ai ppt setup"
```

### Task 3: Build the backend parser and normalizer for research briefs

**Files:**
- Create: `server/libs/ai-orchestrator/src/parser/research-input.parser.ts`
- Create: `server/libs/ai-orchestrator/src/planner/research-deck.normalizer.ts`
- Modify: `server/libs/ai-orchestrator/src/providers/llm-provider.interface.ts`
- Modify: `server/libs/ai-orchestrator/src/providers/openai.provider.ts`
- Test: `server/tests/orchestrator/openai.provider.test.ts`
- Test: `server/tests/orchestrator/research-input.parser.test.ts`

- [ ] **Step 1: Add failing parser tests**

Create `server/tests/orchestrator/research-input.parser.test.ts` covering:
- raw text section splitting
- structured JSON preservation
- duplicate / overly long sentence cleanup

Expected: RED because no parser exists yet.

- [ ] **Step 2: Implement the raw-input parser**

Create `server/libs/ai-orchestrator/src/parser/research-input.parser.ts` that turns raw research-form input into a first structured object.

- [ ] **Step 3: Implement the deck normalizer**

Create `server/libs/ai-orchestrator/src/planner/research-deck.normalizer.ts` that produces a PPT-oriented intermediate model:
- cover
- executive summary
- methodology
- audience design
- quota tables
- framework modules
- business value

- [ ] **Step 4: Teach the provider planning path about research mode**

Modify:
- `server/libs/ai-orchestrator/src/providers/llm-provider.interface.ts`
- `server/libs/ai-orchestrator/src/providers/openai.provider.ts`

Expected: plan-time prompting receives normalized research structure instead of a single free-form topic string when `inputMode === 'research'`.

- [ ] **Step 5: Run targeted server tests**

Run:
- `cd server && npx vitest run tests/orchestrator/research-input.parser.test.ts tests/orchestrator/openai.provider.test.ts`

Expected: GREEN

- [ ] **Step 6: Commit**

```bash
git add server/libs/ai-orchestrator/src/parser/research-input.parser.ts server/libs/ai-orchestrator/src/planner/research-deck.normalizer.ts server/libs/ai-orchestrator/src/providers/llm-provider.interface.ts server/libs/ai-orchestrator/src/providers/openai.provider.ts server/tests/orchestrator/research-input.parser.test.ts server/tests/orchestrator/openai.provider.test.ts
git commit -m "feat: normalize research briefs for ai planning"
```

### Task 4: Add a slide planner that maps normalized research content to MASTER_TEMPLATE_AI page types

**Files:**
- Create: `server/libs/ai-orchestrator/src/planner/research-slide-planner.ts`
- Modify: `server/libs/ai-orchestrator/src/providers/openai.provider.ts`
- Modify: `server/libs/ai-schema/src/ai-slide.ts`
- Test: `server/tests/orchestrator/research-slide-planner.test.ts`
- Test: `server/tests/orchestrator/openai.provider.test.ts`

- [ ] **Step 1: Add failing slide-planner tests**

Create `server/tests/orchestrator/research-slide-planner.test.ts` to assert:
- cover gets only title/subtitle/signature
- quota information maps to `master_table`
- framework overview maps to `master_toc` or `master_grid`
- compare-style phase pages map to `master_compare`

- [ ] **Step 2: Implement the slide planner**

Create `server/libs/ai-orchestrator/src/planner/research-slide-planner.ts` that turns normalized research content into slide intents with explicit `layoutTemplate` assignments.

- [ ] **Step 3: Extend slide schema fields where planner output needs them**

Modify `server/libs/ai-schema/src/ai-slide.ts` only as needed for explicit planning metadata that later render consumes.

- [ ] **Step 4: Integrate planner output into provider planning**

Update `server/libs/ai-orchestrator/src/providers/openai.provider.ts` so research-mode planning:
- uses normalized sections
- chooses template-safe page types
- prevents oversized free-form text from reaching strict layouts

- [ ] **Step 5: Run targeted tests**

Run:
- `cd server && npx vitest run tests/orchestrator/research-slide-planner.test.ts tests/orchestrator/openai.provider.test.ts`

Expected: GREEN

- [ ] **Step 6: Commit**

```bash
git add server/libs/ai-orchestrator/src/planner/research-slide-planner.ts server/libs/ai-orchestrator/src/providers/openai.provider.ts server/libs/ai-schema/src/ai-slide.ts server/tests/orchestrator/research-slide-planner.test.ts server/tests/orchestrator/openai.provider.test.ts
git commit -m "feat: map research briefs to template-safe slide plans"
```

### Task 5: Enforce strict MASTER_TEMPLATE_AI mapping for structured research pages

**Files:**
- Modify: `server/libs/pptist-adapter/src/templates/master-template-ai.ts`
- Modify: `server/libs/pptist-adapter/src/slide-to-pptist.service.ts`
- Test: `server/tests/pptist-adapter/slide-to-pptist.service.test.ts`

- [ ] **Step 1: Add failing renderer tests for structured research pages**

Extend `server/tests/pptist-adapter/slide-to-pptist.service.test.ts` to verify:
- cover refuses overflow content blocks
- table pages consume normalized rows only
- compare pages stay at exactly two panels
- toc/grid pages cap item counts to template-safe limits

- [ ] **Step 2: Tighten template contracts**

Modify `server/libs/pptist-adapter/src/templates/master-template-ai.ts` so each strict layout consumes only the allowed fields for its template family.

- [ ] **Step 3: Keep slide conversion strict**

Update `server/libs/pptist-adapter/src/slide-to-pptist.service.ts` only if needed so it fails early or falls back safely when research-mode slide data violates template expectations.

- [ ] **Step 4: Run targeted renderer tests**

Run:
- `cd server && npx vitest run tests/pptist-adapter/slide-to-pptist.service.test.ts`

Expected: GREEN

- [ ] **Step 5: Commit**

```bash
git add server/libs/pptist-adapter/src/templates/master-template-ai.ts server/libs/pptist-adapter/src/slide-to-pptist.service.ts server/tests/pptist-adapter/slide-to-pptist.service.test.ts
git commit -m "fix: enforce master template contracts for research decks"
```

### Task 6: Verify the full planning-to-render flow for research mode

**Files:**
- Modify: none unless fixes are required

- [ ] **Step 1: Run focused frontend and backend test suites**

Run:
- `npx vitest run tests/unit/ai/useAIDeckGeneration.test.ts tests/unit/ai/dialogStepMeta.test.ts`
- `cd server && npx vitest run tests/api/ai.controller.test.ts tests/orchestrator/openai.provider.test.ts tests/orchestrator/research-input.parser.test.ts tests/orchestrator/research-slide-planner.test.ts tests/pptist-adapter/slide-to-pptist.service.test.ts`

Expected: GREEN

- [ ] **Step 2: Run full static verification**

Run: `npm run type-check`
Expected: GREEN

- [ ] **Step 3: Manually verify the AIPPT modal in research mode**

Check:
- research-mode fields fit inside the existing modal
- setup can submit structured research content
- outline remains editable and not overcrowded
- generated cover page follows `MASTER_TEMPLATE_AI` cover structure
- table / compare / toc pages remain template-safe

- [ ] **Step 4: Document verification gaps**

Expected: explicitly note any remaining gaps such as lack of browser-driven visual snapshot coverage for the generated deck.

- [ ] **Step 5: Commit**

```bash
git add <only files changed during verification fixes>
git commit -m "chore: verify research input mode for ai ppt"
```
