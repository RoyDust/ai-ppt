# AI PPT 后端架构设计

## 目标

基于 PPTist 二开一个 AI PPT 产品时，后端的职责不是直接生成 PPTist 原生页面 JSON，而是负责：

- 理解用户输入
- 规划整份 PPT 的结构和页数
- 生成单页或整份的语义化内容
- 将语义结构交给适配层映射成 PPTist 可编辑数据
- 管理生成任务、版本、模板资源和导出结果

PPTist 前端继续承担编辑、放映、导出能力，后端承担 AI 编排、任务处理和持久化。

## 推荐技术栈

- `Node.js + TypeScript`
- `NestJS`
- `PostgreSQL`
- `Redis`
- `BullMQ`
- `本地文件存储`（v1）
- `S3 / OSS / COS` 之类的对象存储（后续）

## 当前已定约束

- 模型供应商首版使用 `OpenAI`
- 图片策略首版只支持：
  - 无图输出
  - 模板内占位图
- 存储策略首版使用本地文件存储

## 选型理由

### NestJS

适合中长期产品化开发，模块边界清晰，适合拆分：

- `deck plan`
- `deck render`
- `slide regenerate`
- `project/deck/version/task`

### PostgreSQL

适合存储：

- 用户
- 项目
- deck 元数据
- deck 版本
- AI 任务记录
- 模板元数据

### Redis + BullMQ

适合处理异步任务：

- 整份 PPT 生成
- 单页重生
- 导出任务
- 后续图片生成/搜图

### 对象存储

适合存储：

- 模板资源
- 生成封面或配图
- 导出文件
- deck 相关静态产物

但这属于后续阶段能力。v1 先使用本地文件存储即可。

## 总体架构

建议后端先采用 `NestJS monorepo + worker` 模式，而不是一开始拆成多套独立微服务。

整体链路如下：

```text
前端请求
  -> API 层
  -> AI 编排层
  -> 中间协议层 AIDeck / AISlide
  -> PPTist 适配层
  -> 任务系统 / 数据库存储 / 对象存储
  -> 返回给前端可编辑结果
```

核心原则：

- AI 输出语义结构，而不是 PPTist 原生 JSON
- 后端在入库或回传前先做 schema 校验
- 渲染适配层负责把语义结构转成 PPTist slides

## 推荐目录结构

```text
server/
  package.json
  tsconfig.json
  nest-cli.json

  apps/
    api/
      src/
        main.ts
        app.module.ts

        modules/
          auth/
          users/
          projects/
          decks/
          ai/
          templates/
          exports/

        common/
          dto/
          guards/
          interceptors/
          filters/
          pipes/

    worker/
      src/
        main.ts
        worker.module.ts

        jobs/
          deck-render.job.ts
          slide-regenerate.job.ts
          export.job.ts

        processors/
          deck-render.processor.ts
          slide-regenerate.processor.ts
          export.processor.ts

  libs/
    db/
      src/
        prisma/
        migrations/
        prisma.service.ts

    ai-schema/
      src/
        ai-deck.ts
        ai-slide.ts
        regeneration-context.ts
        style-fingerprint.ts
        guards.ts

    ai-orchestrator/
      src/
        planner/
          deck-planner.service.ts
          outline-builder.service.ts
          page-count.service.ts
        renderer/
          deck-renderer.service.ts
          slide-regenerator.service.ts
        prompts/
          deck-plan.prompt.ts
          deck-render.prompt.ts
          slide-regenerate.prompt.ts
        providers/
          llm-provider.interface.ts
          openai.provider.ts
          zhipu.provider.ts
          doubao.provider.ts

    pptist-adapter/
      src/
        deck-to-slides.service.ts
        slide-to-pptist.service.ts
        template-matcher.service.ts
        content-trimmer.service.ts
        style-fingerprint.service.ts

    queue/
      src/
        queue.module.ts
        queue.constants.ts
        queue.service.ts

    storage/
      src/
        storage.module.ts
        storage.service.ts

    logger/
      src/
        logger.module.ts
        logger.service.ts
```

## 各层职责

### 1. apps/api

对前端提供 HTTP 接口。

主要职责：

- 参数校验
- 鉴权
- 创建任务
- 查询任务结果
- 保存 deck/project/version 元数据

不建议在 controller 中直接写 prompt 或模型调用逻辑。

### 2. apps/worker

处理耗时任务和重试逻辑。

主要职责：

- 整份 deck render
- 单页 regenerate
- 导出任务
- 后续图片生成、搜图等长任务

### 3. libs/ai-schema

定义系统的中间协议。

这是整个项目最关键的一层，用来统一：

- `AIDeck`
- `AISlide`
- `RegenerationContext`
- `StyleFingerprint`

它的作用是把 AI 生成层和 PPTist 原生页面结构解耦。

### 4. libs/ai-orchestrator

AI 编排核心层。

建议再拆成四部分：

- `planner`
- `renderer`
- `prompts`
- `providers`

其中：

- `planner` 负责页数规划和大纲生成
- `renderer` 负责把大纲扩成完整语义 deck，或重生单页
- `prompts` 统一管理 prompt 模板
- `providers` 统一管理不同模型厂商接入

### 5. libs/pptist-adapter

负责把 `AIDeck/AISlide` 转成 PPTist 可编辑 slide 数据。

这一层主要做：

- 模板匹配
- 占位符填充
- 内容裁剪
- 版式降级
- 风格指纹落地

### 6. libs/queue

统一管理队列名、任务提交和消费。

### 7. libs/storage

统一管理文件存储读写。

v1：

- 本地文件系统

后续：

- 对象存储

## 核心模块边界

推荐的服务调用关系：

```text
AIController
  -> AIService
    -> DeckPlannerService
    -> DeckRendererService
    -> SlideRegeneratorService
    -> QueueService
```

其中 `DeckRendererService` 和 `SlideRegeneratorService` 内部再调用：

```text
LLMProvider
  -> AIDeck / AISlide schema guards
  -> PPTistAdapterService
```

也就是说，后端正确的顺序应该是：

```text
模型输出
  -> 结构校验
  -> AIDeck/AISlide
  -> PPTist 适配
  -> 返回前端
```

而不是：

```text
模型直接输出 PPTist JSON
```

## API 设计建议

### `POST /ai/deck/plan`

作用：

- 解析用户意图
- 生成 deck 大纲
- 估算实际页数

输入建议包含：

- topic
- goalPageCount
- language
- audience
- purpose
- tone

### `POST /ai/deck/render`

作用：

- 把确认后的大纲扩成完整 `AIDeck`
- 再由适配层转成 PPTist slides

### `POST /ai/slide/regenerate`

作用：

- 在整份 deck 上下文中重生某一页

输入建议包含：

- deckId
- slideId
- 用户补充要求
- `RegenerationContext`

### `GET /ai/tasks/:id`

作用：

- 查询异步任务状态

## 中间协议层建议

后端需要维护独立的语义结构，而不是直接用 PPTist 页面结构作为 AI 输入输出。

建议至少包含：

### AIDeck

- deck id
- topic
- goalPageCount
- actualPageCount
- language
- audience
- tone
- purpose
- outlineSummary
- slides

### AISlide

- id
- kind
- title
- subtitle
- bullets
- sections
- imagePrompt
- layoutHint
- regeneratable
- sourceContext

### RegenerationContext

- deckTopic
- deckOutlineSummary
- prevSlideSummary
- nextSlideSummary
- currentSlideGoal
- currentSlideKind
- currentLayoutHint
- mode
- styleFingerprint

## 页数控制策略

用户给的是目标页数，不要求绝对严格一致。

建议规则：

- 用户输入 `N`
- 规划阶段以 `N` 为目标
- 最终输出允许落在 `N-1 ~ N+2`

如果超出范围，优先做确定性压缩，而不是重跑模型。

压缩策略建议：

- 合并相邻内容页
- 减少章节过渡页
- 裁剪过长 bullet
- 优先移除可选总结页

## 单页重生策略

单页重生不要把当前页的 PPTist JSON 直接交给模型去“修改”。

推荐链路：

```text
当前 deck 上下文
  -> 生成新的 AISlide
  -> 交给 PPTist adapter
  -> 生成预览页
  -> 用户决定替换或插入
```

重生时建议始终携带：

- 整份 deck 主题
- 当前页在整份中的作用
- 前后页摘要
- 当前风格指纹
- 当前页类型和布局约束

## Prompt 管理建议

Prompt 不要散落在 service 里，建议集中放在：

```text
libs/ai-orchestrator/src/prompts/
  deck-plan.prompt.ts
  deck-render.prompt.ts
  slide-regenerate.prompt.ts
  shared/
    style-rules.prompt.ts
    page-count-rules.prompt.ts
```

这样便于统一复用：

- 页数规则
- 输出格式约束
- 风格一致性规则

## 模型 Provider 适配建议

后端业务层不应直接依赖某一家模型厂商。

建议先定义统一接口：

```ts
interface LLMProvider {
  generateJson<T>(input: {
    systemPrompt: string
    userPrompt: string
    schemaName: string
  }): Promise<T>
}
```

然后分别实现：

- OpenAI provider
- 智谱 provider
- 豆包 provider

其中 v1 只需要真正落地 `OpenAI provider`。

这样业务层调用不需要关心底层差异。

## 数据表建议

v1 建议至少有这些表：

- `users`
- `projects`
- `decks`
- `deck_versions`
- `ai_tasks`
- `templates`
- `exports`

### projects

作为项目级容器。

### decks

记录当前 deck 元数据，例如：

- topic
- language
- target_page_count
- actual_page_count
- status

### deck_versions

记录 deck 版本快照，例如：

- ai_deck_json
- pptist_slides_json
- source_task_id

### ai_tasks

记录 AI 任务状态，例如：

- task_type
- status
- input_json
- output_json
- error_message

## 队列任务建议

BullMQ 可以先定义三类 job：

- `deck_plan`
- `deck_render`
- `slide_regenerate`

建议：

- `deck_plan` 初期可同步
- `deck_render` 建议异步
- `slide_regenerate` 初期可同步，后续按耗时迁移异步

## v1 落地建议

第一阶段不要急着拆成真正的分布式微服务。

更实际的做法是先做：

```text
apps/api
libs/ai-schema
libs/ai-orchestrator
libs/pptist-adapter
```

等整份生成和单页重生稳定后，再补：

- `apps/worker`
- `libs/queue`
- 更完整的对象存储和导出链路

## 总结

这个项目的后端本质上不是“套一个大模型接口”，而是一个分层明确的 AI 编排系统：

```text
HTTP API
  -> AI 编排
  -> 中间协议校验
  -> PPTist 适配渲染
  -> 队列任务
  -> 数据库存储与对象存储
```

最关键的三点是：

- 不让模型直接输出 PPTist 原生 JSON
- 用 `AIDeck/AISlide` 做中间层
- 用 `adapter` 保证输出稳定可编辑
