# Parallel Batched AI PPT Render Design

## Background

The current AI PPT `render` flow sends the full confirmed planning deck to the model in a single request. As deck size and slide text grow, this creates an unstable failure mode: context windows overflow, request payloads become too large, timeouts increase, and a single failed request forces the whole render to fail.

The system already distinguishes between `plan` and `render`, which is the right seam for solving this. The issue is not that render is AI-based; the issue is that render currently treats the whole deck as one atomic model call.

## Goals

- Replace single-request deck render with batched render execution.
- Execute multiple render batches in parallel under server-side orchestration.
- Keep the user-facing trigger model unchanged: one render action starts one deck render job.
- Preserve successful batches when some batches fail.
- Automatically retry failed batches with narrower scope or lower load.
- Merge successful batch outputs back into one final deck and one final PPTist slide list.
- Improve stability for long decks without weakening the second-pass AI render quality.

## Non-Goals

- Do not redesign the frontend flow into an explicit multi-job workspace.
- Do not expose every sub-batch as a first-class user task in the initial version.
- Do not replace the existing provider or queue stack.
- Do not solve all possible model rate limiting and resilience concerns across the entire AI subsystem.
- Do not change the `planDeck` behavior in this work.

## User-Approved Direction

The approved direction is:

- Render the deck in multiple sub-batches instead of one full-deck request.
- Run sub-batches in parallel.
- Adjust concurrency dynamically based on deck size and batch count.
- Preserve successful sub-batches when others fail.
- Automatically retry or re-run only the failed sub-batches.

## Design Summary

Introduce a parent render orchestration layer in the backend:

1. Split the confirmed planning deck into render batches.
2. Create one parent render task for the whole deck.
3. Execute child batches in parallel with dynamic concurrency limits.
4. Track per-batch status, attempts, and output.
5. Retry failed batches with degraded input scope.
6. Merge completed batch outputs into one final deck.
7. Convert the merged deck into PPTist slides and publish one final parent task result.

The frontend still initiates a single render and polls a single task id, but the backend no longer depends on one large model request succeeding.

## Why This Approach

This is the best fit for the current product and codebase because it keeps the visible user flow stable while moving the instability boundary inward to the orchestration layer. It also gives the system a natural place to add progress tracking, retries, rate-limit handling, and future partial rerender capabilities.

Compared with making every batch a user-visible task, this design avoids a larger frontend redesign. Compared with serial batching, it improves throughput without giving up failure isolation.

## Architecture

### Parent Task Model

The render API continues to create one top-level `deck_render` task. Internally that task owns a collection of batch execution records.

The parent task is responsible for:

- storing the original render request
- recording total batch count and completed batch count
- exposing aggregate status and progress
- aggregating batch outputs into one final deck result

The parent task becomes the only task the frontend needs to poll in the first version.

### Batch Unit

Each batch should represent a contiguous page slice of the deck. The initial batcher should favor stable, predictable boundaries over clever semantic regrouping.

Recommended initial batch shape:

- 2 to 4 slides per batch
- preserve original slide order
- preserve original slide ids and page numbers

Each batch carries:

- `batchId`
- `parentTaskId`
- `startPage`
- `endPage`
- `attempt`
- `status`
- `slides`
- `sharedContext`
- optional `error`
- optional normalized `outputSlides`

### Shared Context

Each batch should receive only the minimum global context needed for coherent rendering:

- `topic`
- `outlineSummary`
- `templateId`
- `designSystem`
- `themeName`
- `contentBlueprint`
- deck-level design requirements summary
- nearby slide title summary for continuity

Do not send the entire original deck as repeated batch context. That would duplicate the current payload problem.

### Provider Contract

The provider should gain a batch-oriented render path instead of requiring a full-deck render request every time.

Recommended contract:

- `renderDeckBatch(input)`

The input should include:

- `sharedContext`
- `batchSlides`
- `batchIndex`
- `batchCount`
- optional `previousBatchSummary`
- optional `nextBatchSummary`

The output should include:

- rendered slides for that batch only

The existing full-deck `renderDeck` path can remain as a compatibility wrapper initially, but the orchestrator should use the batch path.

### Dynamic Concurrency

Concurrency should scale with deck size and total batch count, but remain capped to protect provider limits.

Recommended initial policy:

- 1 batch: concurrency `1`
- 2-3 batches: concurrency `2`
- 4-6 batches: concurrency `3`
- 7+ batches: concurrency `4`

Additional runtime rules:

- hard cap concurrency at `4`
- if rate limits or timeouts increase, reduce concurrency for retries
- retries should not immediately relaunch at the original maximum pressure

This favors predictable stability over chasing peak throughput.

### Retry and Recovery

Failures should be isolated to the batch level.

Retry rules:

- retry failed batches up to `2` additional attempts
- classify retryable failures at least for timeout, 429, 5xx, and model-output-invalid cases
- on retry, shrink batch pressure by degrading input

Retry degradation order:

1. reduce shared context verbosity
2. lower concurrency pressure for remaining work
3. if still failing, split the failed batch into smaller sub-batches

Successful batches must not be rerun unless their output becomes invalid during final merge validation.

### Result Merge

Once all reachable batch work completes, the orchestrator should reconstruct the final deck in original page order.

Merge rules:

- preserve original slide ids and metadata where possible
- replace only the slide content produced by the batch renderer
- ensure final page order matches the planning deck
- normalize the merged deck once after aggregation

Only after merge succeeds should the system convert the final deck into PPTist slides.

## Task States

The current task model only distinguishes `queued`, `succeeded`, and `failed`. Batched render needs richer internal states.

Recommended parent task states:

- `queued`
- `running`
- `partial_success`
- `succeeded`
- `failed`

Recommended batch states:

- `queued`
- `running`
- `retrying`
- `succeeded`
- `failed`

Parent task semantics:

- `succeeded`: every batch finished successfully
- `partial_success`: at least one batch permanently failed, but at least one succeeded and mergeable output exists
- `failed`: no usable render output could be produced

If the existing frontend cannot safely consume `partial_success` immediately, the API may first expose it as `failed` with structured progress metadata, but the backend should still model the distinction internally.

## Data Flow

### Request Path

1. Frontend calls `/api/ai/deck/render`.
2. API creates one parent render task.
3. `DeckRendererService` batches the deck and schedules batch execution.
4. Batch workers call the provider render-batch endpoint.
5. Completed batches update parent progress.
6. Failed batches retry with degraded settings.
7. Final merge produces the output deck and PPTist slides.
8. Parent task exposes the final status and result to polling clients.

### Polling Path

The polling response should eventually include:

- parent status
- total batches
- completed batches
- failed batches
- retrying batches
- optional partial error summary
- final output when available

The first frontend version only needs aggregate progress and terminal state handling.

## Backend Boundaries

### `DeckRendererService`

This becomes the main orchestration layer. It should:

- split decks into batches
- compute concurrency
- schedule parallel execution
- manage retry policy
- merge outputs

It should not own provider prompt details.

### `OpenAIProvider`

This should focus on:

- building the batch render prompt
- sending the request
- validating batch output
- classifying provider failures when possible

It should not own queueing or orchestration policy.

### `QueueService`

This needs to support long-running jobs with progress updates rather than only one microtask completion record. The minimum acceptable version can still stay in-memory, but it must support:

- mutable task progress
- status transitions
- output updates
- error accumulation

### Task Persistence

The repository layer should be extended so task records can persist:

- aggregate progress metadata
- retry counts
- partial outputs
- structured failure summaries

The exact schema can stay minimal in the first pass as long as batch progress is not trapped in process-local memory forever.

## Frontend Impact

The frontend should remain simple in the first version.

Required changes:

- tolerate richer task status
- display progress based on completed batch count
- surface terminal partial failure more clearly

The frontend should not need to reason about each batch individually yet.

## Error Handling

### Retryable Errors

Treat these as retryable by default:

- request timeout
- provider 429
- provider 5xx
- invalid but parseable batch-shaped model output that fails validation

### Non-Retryable Errors

Treat these as non-retryable by default:

- missing API key
- unsupported provider configuration
- unrecoverable request contract bug

### Merge Errors

If merge fails because a batch output is structurally invalid, mark that batch failed and retry it rather than failing the whole parent task immediately.

## Testing Strategy

The implementation should be covered by tests for:

- deck-to-batch splitting
- dynamic concurrency selection
- parallel batch execution ordering
- retry of failed batches
- degraded retry behavior
- final merge preserving original slide order
- parent task progress updates
- partial success handling

Provider tests should verify that batch prompts no longer embed the full original deck payload.

## Risks

- Batch context may become too thin and reduce content continuity.
- Parallelism may trigger provider rate limits if concurrency policy is too aggressive.
- Partial success handling can create ambiguous frontend semantics if not modeled clearly.
- In-memory queue progress will remain fragile until persistence is fully wired.

These are acceptable for this design because the current single-request render path already fails catastrophically on long decks. Batched render reduces blast radius even before every operational concern is fully solved.

## Success Criteria

This design is successful if:

- long decks no longer depend on one full render request
- render completes successfully more often for content-heavy decks
- failed batches are retried without rerunning successful ones
- parent task progress reflects real batch completion
- final deck order stays correct regardless of out-of-order batch completion
- the frontend still uses one render trigger and one polled task
