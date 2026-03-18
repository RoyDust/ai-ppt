# AI PPT v1 Design

## Background

This project is based on PPTist, which already provides a mature web slide editor, presenter, and export pipeline. PPTist also contains a basic AI PPT flow, but the current implementation is intentionally limited and is centered around a fixed template-replacement model.

The goal of this design is to define a stronger AI PPT v1 built on top of PPTist without changing PPTist's role as the editing and export foundation.

The product direction for v1 is:

- Generate a full PPT from natural language.
- Accept a user-provided target page count.
- Allow the final result to float slightly around that target for content completeness.
- Support single-slide regeneration after the deck has been generated.
- Keep the generated output fully editable inside PPTist and exportable through the existing PPTist pipeline.

## Product Goals

### Primary goals

- Turn natural language input into an editable PPT deck.
- Let users provide a target page count.
- Keep actual page count close to the target, with controlled flexibility.
- Support single-slide regeneration without regenerating the whole deck.
- Preserve visual consistency across the full deck and regenerated slides.

### Success criteria for v1

- A user can enter topic, target page count, language, and optional tone or usage context.
- The system generates a full deck that can be loaded into the PPTist editor without manual repair.
- The actual page count is typically within `target - 1` to `target + 2`.
- A user can regenerate a single slide from the editor.
- Regenerated slides can be previewed before replacing the current slide.
- All generated slides remain editable and exportable using the existing PPTist editor and export features.

### Non-goals for v1

- No template management platform.
- No multi-user collaboration workflow.
- No fully free-form AI layout generation directly at the element-coordinate level.
- No attempt to make PPTX import/export perfectly Office-compatible.
- No agentic multi-turn research workflow with web search and source attribution.

## Product Scope

### Included in v1

- Full-deck generation from a natural language prompt.
- Outline planning before final deck generation.
- Page count control with bounded flexibility.
- Slide-level regeneration with deck context.
- Rendering from AI schema into PPTist slides.
- Editor integration for preview, replacement, and continued editing.

### Deferred to later phases

- Advanced template library management.
- Fine-grained image generation and search pipeline.
- Chart-heavy and domain-specific slide families.
- Multi-version deck comparison.
- Persistent design system and brand kit management.

## Design Principles

- AI decides semantics, not raw element coordinates.
- Rendering decides layout realization inside PPTist.
- PPTist remains the editor, renderer host, and export engine.
- Single-slide regeneration must be slide-scoped, not a disguised full-deck rerun.
- The system must degrade gracefully when the generated content exceeds layout capacity.
- Schema stability matters more than prompt cleverness.

## Concrete Technical Decisions

The following decisions were confirmed after the initial design discussion and should be treated as part of the v1 architecture baseline.

### Frontend

- The product remains a single frontend application built on top of the existing PPTist app.
- There is no separate generation site and no editor-shell split for v1.
- The existing PPTist editor remains the editing core.
- AI workflows are added as a separate application layer inside the current frontend, not mixed into the editor core state model.

### Backend

- The backend should use `Node.js + TypeScript + NestJS`.
- The backend should start as a NestJS monorepo with an `api` app and a `worker` app.
- Persistent storage should use `PostgreSQL`.
- Queueing and long-running task orchestration should use `Redis + BullMQ`.
- v1 file storage should use local filesystem storage first.
- Object storage such as `S3 / OSS / COS` is deferred until later phases.

### AI Provider

- The first provider integration for v1 should be `OpenAI`.
- The codebase should still keep a provider abstraction so additional providers can be added later without rewriting orchestration logic.

### Image Strategy

- v1 should not depend on real image search or image generation.
- v1 deck generation should support `no-image` output or template-native placeholder imagery only.
- Real image search / generation is deferred to a later phase.

### Data Model

- The database should follow a versioned business model.
- `decks` stores the current working record.
- `deck_versions` stores historical snapshots for generation, regeneration, import, and manual-save checkpoints.
- `ai_tasks` stores all AI process records.
- Complex generated structures should be stored in `jsonb` fields instead of being aggressively normalized in v1.

## Proposed Architecture

The system is divided into three layers.

### 1. AI Orchestrator

This service interprets user intent and generates structured deck semantics. It is responsible for:

- Parsing the user prompt into normalized generation parameters.
- Planning the outline and page allocation.
- Expanding the outline into slide-level semantic content.
- Regenerating one slide using surrounding deck context.

This layer does not emit PPTist-native slide JSON.

### 2. Deck Schema Layer

This is the contract between AI generation and PPTist rendering. It must be independent from the current minimal `src/types/AIPPT.ts` definitions.

Responsibilities:

- Define stable deck and slide semantics.
- Represent page intent, content density, and layout hints.
- Carry regeneration context and style fingerprints.
- Shield the editor from model-specific output variation.

This is the core anti-corruption layer of the system.

### 3. PPTist Renderer Adapter

This layer converts `AIDeck` and `AISlide` into PPTist-compatible `slides` data structures.

Responsibilities:

- Choose a compatible template or slide skeleton.
- Fill text and image placeholders.
- Trim or degrade content when capacity is exceeded.
- Emit valid PPTist slide data that can be edited, presented, and exported.

This layer is deterministic and should not rely on LLM calls for normal rendering.

## Frontend Architecture

The frontend should be treated as a single Vue application with two internal zones:

- `Editor Core`
- `AI Application Layer`

`Editor Core` is the existing PPTist editor and should continue to own:

- Live slide editing
- Canvas and element interactions
- Thumbnails
- Toolbar state
- Presentation mode
- Export

`AI Application Layer` should own:

- Full-deck generation flow
- Outline review flow
- Single-slide regeneration flow
- AI task states
- Preview and confirmation flows
- Communication with backend AI endpoints

The frontend should also introduce an explicit `AI Schema / Adapter Layer` so that backend responses never enter `slidesStore` directly.

Recommended frontend structure:

```text
src/
  ai/
    types/
    services/
    stores/
    hooks/
    utils/
    adapters/
    components/
```

Recommended frontend state split:

- `slidesStore` and existing editor stores continue to own editor runtime state.
- New AI stores own planning, rendering, regeneration, preview, and task states.
- Derived context such as neighbor summaries and style fingerprints should be computed, not permanently stored in editor state.

This design keeps the editor stable while allowing AI workflows to evolve independently.

## Backend Architecture

The backend should not be a thin prompt proxy. It should be a layered AI orchestration system.

Recommended backend structure:

```text
server/
  apps/
    api/
    worker/
  libs/
    ai-schema/
    ai-orchestrator/
    pptist-adapter/
    db/
    queue/
    storage/
```

`apps/api` is responsible for:

- Input validation
- Authentication if needed later
- Creating and querying tasks
- Returning deck and version metadata

`apps/worker` is responsible for:

- Deck rendering jobs
- Slide regeneration jobs
- Export jobs

Core backend libraries:

- `ai-schema`: shared semantic contract
- `ai-orchestrator`: prompt orchestration, page planning, slide generation
- `pptist-adapter`: deterministic mapping into PPTist-compatible slide data
- `db`: PostgreSQL access
- `queue`: BullMQ orchestration
- `storage`: local filesystem storage for v1, object storage integration later

Recommended v1 backend endpoints:

- `POST /ai/deck/plan`
- `POST /ai/deck/render`
- `POST /ai/slide/regenerate`
- `GET /ai/tasks/:id`

The backend must validate model output before returning anything to the frontend or persisting it.

For provider selection:

- `OpenAI` is the first concrete provider for v1.
- The backend should still expose a provider interface so future providers can be added.

## Persistence Model

The persistence model for v1 should be version-oriented.

Core entities:

- `users`
- `projects`
- `decks`
- `deck_versions`
- `ai_tasks`
- `exports`

Key rules:

- `decks` stores the current working metadata.
- `deck_versions` stores snapshots such as AI generation results, slide regeneration results, import results, and manual-save checkpoints.
- `ai_tasks` stores planning, rendering, regeneration, and future export task records.
- Complex structures such as `outline_json`, `ai_deck_json`, `pptist_slides_json`, and `style_fingerprint_json` should stay in `jsonb` during v1.

This model is important because both full-deck generation and single-slide regeneration naturally create new versions.

## Role of PPTist in the final product

PPTist is intentionally not treated as the AI generation engine. In this project it serves as:

- The editing base.
- The rendering host for final slide data.
- The presentation runtime.
- The export engine for PPTX, PDF, image, and JSON outputs.

The main product differentiation should come from:

- Better semantic schema.
- Better page planning.
- Better slide regeneration.
- Better template-to-content fitting.

## Functional Flow

### Full-deck generation flow

1. User enters topic, target page count, language, and optional usage context.
2. Frontend sends normalized input to the AI planning endpoint.
3. AI Orchestrator creates an outline plan.
4. Frontend shows the outline for confirmation or editing.
5. Frontend submits the approved outline for deck rendering.
6. AI Orchestrator expands the outline into `AIDeck`.
7. Renderer Adapter converts `AIDeck` into PPTist slide data.
8. PPTist loads generated slides into the editor.
9. User continues manual editing and exports through existing PPTist functionality.

### Single-slide regeneration flow

1. User triggers regeneration from the current slide.
2. Frontend collects deck context, neighbor summaries, slide constraints, and style fingerprint.
3. Frontend sends regeneration request to the slide regeneration endpoint.
4. AI Orchestrator returns a new `AISlide`.
5. Renderer Adapter converts the new `AISlide` into a PPTist slide.
6. Frontend shows a preview of the regenerated result.
7. User chooses whether to replace the current slide or insert the regenerated slide after it.

## Page Count Strategy

The product requirement is that users provide a target page count, but the system may float around it slightly to preserve coherence.

### Rule

- User input defines `goalPageCount`.
- The planning step targets that count.
- Final output should usually stay within `goal - 1` to `goal + 2`.
- If a draft exceeds that range, the system should run deterministic compression or merging before rendering.

### Reasoning

Strict equality often harms content quality. Some topics need one more content slide or a lighter agenda. Controlled flexibility produces better results while still respecting user intent.

### Compression strategies

- Merge similar content slides.
- Reduce the number of section transitions.
- Compress overly verbose bullet groups.
- Remove optional summary slides first.

## Deck Schema

The initial schema should remain intentionally compact.

### AIDeck

Suggested fields:

```ts
type AIDeck = {
  id: string
  topic: string
  goalPageCount: number
  actualPageCount: number
  language: string
  audience?: string
  tone?: string
  purpose?: string
  globalStyleHints?: GlobalStyleHints
  outlineSummary: string
  slides: AISlide[]
}
```

### AISlide

Suggested fields:

```ts
type AISlide = {
  id: string
  kind: SlideKind
  title?: string
  subtitle?: string
  bullets?: string[]
  sections?: SlideSection[]
  speakerNote?: string
  imagePrompt?: string
  layoutHint?: LayoutHint
  importance?: "high" | "medium" | "low"
  regeneratable: boolean
  sourceContext?: string
}
```

### Supporting types

```ts
type SlideKind =
  | "cover"
  | "agenda"
  | "section"
  | "content"
  | "summary"
  | "ending"

type LayoutHint =
  | "hero"
  | "list"
  | "two-column"
  | "image-left"
  | "image-right"
  | "comparison"
  | "timeline"

type SlideSection = {
  title?: string
  body?: string
  bullets?: string[]
}

type GlobalStyleHints = {
  visualTone?: string
  density?: "light" | "medium" | "dense"
  preferredLayouts?: LayoutHint[]
}
```

### RegenerationContext

```ts
type RegenerationContext = {
  deckTopic: string
  deckOutlineSummary: string
  prevSlideSummary?: string
  nextSlideSummary?: string
  currentSlideGoal: string
  currentSlideKind: SlideKind
  currentLayoutHint?: LayoutHint
  mode: "content-only" | "content-and-layout"
  styleFingerprint: StyleFingerprint
}
```

### StyleFingerprint

`styleFingerprint` is not user-facing. It exists to preserve deck coherence during slide regeneration.

Suggested fields:

```ts
type StyleFingerprint = {
  templateFamilyId: string
  themeTokenId?: string
  density?: "light" | "medium" | "dense"
  titleStyle?: string
  bodyStyle?: string
  primaryColor?: string
  accentColor?: string
}
```

## Why a separate schema is required

Directly asking the model to output PPTist-native JSON is not recommended.

Problems with direct native output:

- Layout coordinates are brittle and error-prone.
- Validation failures become common.
- Single-slide regeneration becomes difficult to constrain.
- Style consistency becomes unstable.
- Model output becomes tightly coupled to editor internals.

The separate schema keeps model output semantic and stable while keeping rendering deterministic.

## API Design

v1 should expose three dedicated endpoints. These should not reuse the current thin AI endpoint semantics from `src/services/index.ts`.

### `POST /ai/deck/plan`

Purpose:

- Parse user intent.
- Generate a deck outline.
- Estimate actual page count.

Request:

```json
{
  "topic": "大学生职业生涯规划",
  "goalPageCount": 10,
  "language": "zh-CN",
  "audience": "大学生",
  "purpose": "课堂汇报",
  "tone": "正式"
}
```

Response:

```json
{
  "goalPageCount": 10,
  "plannedPageCount": 11,
  "outlineSummary": "围绕职业认知、规划方法、执行路径展开",
  "slides": [
    { "kind": "cover", "title": "大学生职业生涯规划" },
    { "kind": "agenda", "title": "目录" },
    { "kind": "content", "title": "职业规划的重要性" }
  ]
}
```

### `POST /ai/deck/render`

Purpose:

- Expand approved outline into `AIDeck`.

Request:

```json
{
  "topic": "大学生职业生涯规划",
  "goalPageCount": 10,
  "language": "zh-CN",
  "outline": [
    { "kind": "cover", "title": "大学生职业生涯规划" },
    { "kind": "agenda", "title": "目录" },
    { "kind": "content", "title": "职业规划的重要性" }
  ],
  "styleHints": {
    "visualTone": "professional",
    "density": "medium"
  }
}
```

Response:

```json
{
  "deck": {
    "id": "deck_xxx",
    "topic": "大学生职业生涯规划",
    "goalPageCount": 10,
    "actualPageCount": 11,
    "language": "zh-CN",
    "outlineSummary": "围绕职业认知、规划方法、执行路径展开",
    "slides": []
  }
}
```

### `POST /ai/slide/regenerate`

Purpose:

- Regenerate one slide within deck context.

Request:

```json
{
  "deckId": "deck_xxx",
  "slideId": "slide_05",
  "instructions": "更偏数据化表达，减少空话",
  "context": {
    "deckTopic": "大学生职业生涯规划",
    "deckOutlineSummary": "围绕职业认知、规划方法、执行路径展开",
    "prevSlideSummary": "上一页介绍职业规划的重要性",
    "nextSlideSummary": "下一页介绍常见职业路径选择",
    "currentSlideGoal": "说明影响职业选择的关键因素",
    "currentSlideKind": "content",
    "currentLayoutHint": "two-column",
    "mode": "content-and-layout",
    "styleFingerprint": {
      "templateFamilyId": "business_v1",
      "density": "medium",
      "primaryColor": "#1F4E79",
      "accentColor": "#E67E22"
    }
  }
}
```

### `GET /ai/tasks/:id`

Purpose:

- Query long-running task state for render, regeneration, or future export jobs.

Response:

```json
{
  "id": "task_xxx",
  "taskType": "deck_render",
  "status": "running",
  "deckId": "deck_xxx"
}
```

Response:

```json
{
  "slide": {
    "id": "slide_05_regen",
    "kind": "content",
    "title": "影响职业选择的关键因素",
    "bullets": [
      "个人兴趣与长期投入意愿",
      "能力结构与岗位匹配度",
      "行业发展空间与稳定性"
    ],
    "layoutHint": "comparison",
    "regeneratable": true
  }
}
```

## Full-deck Generation Strategy

The generation pipeline should be split into four stages.

### Stage 1. Intent parsing

The system extracts:

- Topic.
- Goal page count.
- Language.
- Audience.
- Purpose.
- Tone or stylistic preference.

This stage should normalize missing values using reasonable defaults.

### Stage 2. Outline planning

The system determines:

- The actual target page distribution.
- Slide kinds.
- Section sequence.
- The rough message carried by each page.

This stage is critical for page count control. It should happen before detailed content generation.

### Stage 3. Slide expansion

The system expands each planned page into `AISlide`.

The output includes:

- Page title.
- Supporting bullets or sections.
- Layout hint.
- Optional placeholder-image intent, not real image generation in v1.
- Local source context.

### Stage 4. Rendering to PPTist

The adapter chooses a compatible layout skeleton, applies template mapping, and emits PPTist slide JSON.

This stage should not call the model again unless a catastrophic validation failure occurs.

## Slide Regeneration Strategy

Single-slide regeneration is a core v1 differentiator and should be implemented as a first-class workflow.

### Modes

v1 should support two user-facing modes.

- `content-only`
- `content-and-layout`

`content-only`:

- Keep current template, placeholder positions, and visual shell.
- Replace textual content only.
- This is the most stable mode and should be the default.

`content-and-layout`:

- Keep deck-level style coherence.
- Allow switching to another compatible layout within the same template family.
- This mode is useful when the current page structure is weak but the overall deck style should remain consistent.

### Deferred mode

- `full-slide-reset`

This mode can be kept as an internal capability later, but should not be exposed in v1 because it risks breaking deck consistency.

### Required context for regeneration

The model must receive:

- Deck-level topic and purpose.
- Outline-level summary.
- Previous slide summary.
- Next slide summary.
- Current slide goal.
- Current slide kind and layout constraints.
- Style fingerprint.
- Optional user instructions for the regeneration attempt.

Without this context, regenerated slides will tend to repeat nearby content or drift away from the deck narrative.

### Regeneration output path

Regeneration should always follow this path:

`deck context -> AISlide -> renderer adapter -> PPTist slide`

It should not directly attempt:

`current PPTist slide JSON -> model rewrite -> mutated PPTist JSON`

That direct mutation approach is fragile and will accumulate rendering defects.

## Rendering Strategy

The renderer adapter is responsible for converting semantic slides into valid PPTist slide structures.

### Responsibilities

- Match `SlideKind` and `LayoutHint` to a compatible template.
- Fill text placeholders.
- Place images if available.
- Apply style fingerprint hints.
- Validate PPTist slide integrity before insertion.

### Deterministic degradation rules

When content exceeds template capacity, the renderer should degrade locally before asking the model to rerun.

Examples:

- Trim six bullets to four.
- Collapse secondary bullets into a summary line.
- Downgrade two-column content to a single-column layout.
- Remove optional subtitle fields.
- Use text-only rendering if no image is available.

These rules reduce latency and keep rendering behavior stable.

## Template Strategy for v1

Template management is not a product focus in v1, but a small stable template family is still required.

Recommended v1 support:

- One or two curated template families.
- Support for `cover`, `agenda`, `content`, and `ending` first.
- Add `section` and `summary` after the pipeline is stable.
- Support decks that are fully text-driven or use template-native placeholder imagery only.

The template family should expose enough variants to support:

- Hero cover.
- Agenda list.
- Standard content list.
- Two-column content.
- Image-left and image-right content.
- Closing page.

The product should not expose a full template management interface yet.

## Frontend Integration

The current entry point is [src/views/Editor/AIPPTDialog.vue](/Users/roydust/Work/PPTist/src/views/Editor/AIPPTDialog.vue). That flow should be reworked rather than incrementally patched forever.

### Full-deck generation UI

Recommended steps:

1. Input form
   - Topic
   - Target page count
   - Language
   - Optional audience, purpose, and tone
2. Outline preview
   - Editable outline list
   - Planned page count preview
3. Generation confirmation
4. Load rendered slides into the editor

### Single-slide regeneration UI

Recommended entry points:

- Current slide toolbar.
- Thumbnail right-click menu.

Recommended controls:

- Regeneration mode: content only or content plus layout.
- Extra instruction text.
- Keep existing image or allow re-selection later.

The regenerated slide should be previewed before mutation.

### Replace safety rule

Do not overwrite the current slide immediately.

The user should choose between:

- Replace current slide.
- Insert after current slide.

This is safer and improves trust in the regeneration workflow.

### Frontend module boundary rule

AI responses should always flow through:

`service client -> schema guard -> adapter -> editor loader`

They should never flow directly:

`service client -> slidesStore`

## State Management

AI generation state should be separated from the editor's normal editing state.

Recommended reason:

- Full-deck generation is asynchronous.
- Slide regeneration is asynchronous.
- Both flows may need cancellation, retry, and progress indicators.
- These states should not pollute normal slide editing state inside the existing slide store.

Recommended additions:

- A dedicated AI task store.
- A dedicated AI deck workflow store.
- Task state for planning, rendering, regeneration, preview, failure, and retry.
- References between generated `AIDeck` entities and rendered PPTist slides.

## Validation and Error Handling

### Validation layers

1. Schema validation on AI responses.
2. Renderer validation before PPTist insertion.
3. UI guard rails before replacing live slides.
4. Backend persistence validation before writing version snapshots.

### Common failure modes

- Output page count outside the allowed range.
- Missing mandatory fields for a slide kind.
- Too much content for the selected template.
- Renderer unable to map a slide kind to a valid PPTist template.
- Regeneration returning a slide that duplicates nearby content.

### Recovery strategies

- Fallback compression if page count is too high.
- Fallback slide kind if the requested layout is unavailable.
- Local truncation for overlong content.
- Preview-first slide replacement.
- Preserve original slide on regeneration failure.

## Testing Strategy

Testing must cover the schema and renderer boundaries, not only UI behavior.

### Unit tests

- Schema validation.
- Outline planner output normalization.
- Page count compression logic.
- Slide regeneration context construction.
- `AIDeck -> PPTist` rendering transforms.

### Integration tests

- Full-deck generation happy path.
- Outline confirmation to slide loading.
- Single-slide regeneration preview and replacement flow.
- Renderer degradation on overlong content.
- API-to-worker task flow for deck render jobs.
- Deck version creation after full-deck generation and slide regeneration.

### Manual acceptance tests

- Different topics across business, education, and general-purpose cases.
- Multiple target page counts such as 6, 10, and 15.
- Regeneration of cover-adjacent slides and mid-deck content slides.
- Export after generation and after regeneration.
- Re-open a deck and verify the current version pointer is correct.

## Observability

This product will be difficult to tune without metrics and structured logs.

Recommended telemetry:

- User prompt length.
- Goal page count.
- Planned page count.
- Final rendered page count.
- Slide kind distribution.
- Render degradation counts.
- Regeneration request count.
- Regeneration success and accept rate.
- Renderer validation failure reasons.
- Version creation count by source type.
- Task durations by `task_type` and model.

These metrics are important for prompt tuning and template tuning.

## Phased Delivery Plan

### Phase 1

- Define and implement `AIDeck` schema.
- Stand up backend foundation with NestJS `api` and `worker`.
- Create PostgreSQL schema for `users`, `projects`, `decks`, `deck_versions`, and `ai_tasks`.
- Implement the first `OpenAI` provider.
- Implement local filesystem storage for generated files and template assets.
- Build deck plan and deck render endpoints.
- Build the frontend AI application layer inside the current single-page PPTist app.
- Support `cover`, `agenda`, `content`, and `ending`.
- Load generated deck into PPTist editor.

### Phase 2

- Add `section` and `summary`.
- Improve page count control.
- Improve deterministic degradation.
- Persist generated snapshots into `deck_versions`.
- Improve placeholder-image handling inside templates.

### Phase 3

- Add single-slide regeneration.
- Support `content-only` and `content-and-layout`.
- Add slide preview before replacement.
- Create new deck versions for accepted slide regenerations.

### Phase 4

- Add real image strategy.
- Add richer layout hints.
- Consider template management workflows later.
- Add export task persistence and object-storage-backed outputs.

## Main Risks

### Risk 1. Page count drift

The system may produce too few or too many slides relative to the target.

Mitigation:

- Treat outline planning as a separate step.
- Apply deterministic compression before render.

### Risk 2. Template capacity mismatch

Generated content may not fit into available layout capacity.

Mitigation:

- Add local trimming and degradation rules in the renderer.
- Keep v1 schema compact.

### Risk 3. Regeneration breaks deck consistency

Single-slide regeneration may create narrative or visual drift.

Mitigation:

- Require neighbor summaries.
- Require style fingerprint.
- Limit v1 to constrained regeneration modes.

### Risk 4. State pollution in the editor

Asynchronous AI workflows may mix badly with normal editor state.

Mitigation:

- Create dedicated AI task state.
- Separate generated semantic entities from rendered slide store data.

## Recommended Initial Implementation Order

1. Define the new shared schema types.
2. Build outline planning endpoint.
3. Build deck rendering endpoint.
4. Implement deterministic renderer adapter.
5. Rework the current AI dialog into a two-step planning and generation flow.
6. Add dedicated AI task state.
7. Add single-slide regeneration with preview.

## Open Questions

These are intentionally deferred but should be revisited before implementation starts:

- Should `outline` be editable as free text, structured list items, or both?
- Should regenerated slides be stored with a trace of the previous version?
- Should deck-level style hints be user-configurable in v1 or inferred only?
- How much template variation is required to avoid repetitive decks at launch?

## Conclusion

The recommended v1 treats PPTist as a strong editing and export foundation while moving AI generation into a new semantic pipeline built around a stable deck schema.

This approach is preferred because it:

- Preserves PPTist's strengths.
- Avoids brittle direct generation of native slide JSON.
- Makes page count control tractable.
- Makes single-slide regeneration coherent and safe.
- Creates a clean foundation for future template and style capabilities.
