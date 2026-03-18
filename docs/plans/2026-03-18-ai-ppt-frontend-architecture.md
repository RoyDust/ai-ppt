# AI PPT 前端架构设计

## 目标

基于现有 PPTist 前端，扩展出一个 AI PPT 单体前端应用，使其支持：

- 自然语言生成整份 PPT
- 用户输入目标页数
- 大纲确认后再生成完整 deck
- 在编辑器中重生某一页
- 生成后继续使用 PPTist 完成编辑、放映、导出

前端目标不是重写 PPTist 编辑器，而是在保持现有编辑器内核稳定的前提下，为 AI 工作流增加一层独立的应用能力。

## 前提约束

本次前端架构的产品边界已经明确：

- 采用 `单体前端`
- 不拆成“生成站点”和“编辑站点”
- 不把 PPTist 抽成单独 iframe 或远程子应用
- AI 能力直接接入当前前端应用

## 当前项目现状

现有前端是典型的单应用结构，没有 `vue-router`，应用入口较轻：

- [src/main.ts](/Users/roydust/Work/PPTist/src/main.ts)
- [src/App.vue](/Users/roydust/Work/PPTist/src/App.vue)

当前运行逻辑大致是：

```text
App
  -> Editor
  -> Screen
  -> Mobile
```

现有 PPTist 已经具备：

- Editor 编辑能力
- Screen 放映能力
- Mobile 基础移动端能力
- `slidesStore` 维护编辑器中的 slide 数据
- `mainStore` 维护全局 UI 开关
- 一套基础 AIPPT 弹窗和模板替换逻辑

相关核心入口包括：

- [src/views/Editor/index.vue](/Users/roydust/Work/PPTist/src/views/Editor/index.vue)
- [src/views/Editor/AIPPTDialog.vue](/Users/roydust/Work/PPTist/src/views/Editor/AIPPTDialog.vue)
- [src/store/slides.ts](/Users/roydust/Work/PPTist/src/store/slides.ts)
- [src/store/main.ts](/Users/roydust/Work/PPTist/src/store/main.ts)
- [src/hooks/useAIPPT.ts](/Users/roydust/Work/PPTist/src/hooks/useAIPPT.ts)

## 总体设计原则

- 保持 PPTist 编辑器内核稳定
- 将 AI 工作流从现有编辑状态中隔离出来
- AI 输出不直接进入 `slidesStore`
- 所有 AI 返回结果必须先进入中间 schema 和 adapter
- 单页重生必须先预览，再由用户确认替换
- 尽量避免把 AI 业务逻辑继续堆进 `AIPPTDialog.vue` 和 `useAIPPT.ts`

## 总体前端架构

推荐架构如下：

```text
App
  -> Editor Shell
    -> Editor Core
    -> AI Application Layer
    -> AI Schema / Adapter Layer
    -> Platform Layer
```

其中：

- `Editor Core` 是现有 PPTist 编辑器
- `AI Application Layer` 是新增的 AI 工作流层
- `AI Schema / Adapter Layer` 是 AI 数据与 PPTist slides 之间的桥梁
- `Platform Layer` 是 API、日志、缓存、异步任务等支撑能力

## 四层分工

### 1. Editor Core

这一层基本就是现有 PPTist 的编辑器核心。

职责：

- 幻灯片编辑
- 元素编辑
- 缩略图管理
- 工具栏编辑
- 演示放映
- 导出
- Undo / Redo
- 现有 slide 数据结构维护

这层继续负责“编辑现成的 PPTist slide 数据”，而不是负责 AI 生成。

典型文件：

- [src/views/Editor/index.vue](/Users/roydust/Work/PPTist/src/views/Editor/index.vue)
- [src/views/Editor/Canvas/index.vue](/Users/roydust/Work/PPTist/src/views/Editor/Canvas/index.vue)
- [src/views/Editor/Thumbnails/index.vue](/Users/roydust/Work/PPTist/src/views/Editor/Thumbnails/index.vue)
- [src/views/Editor/Toolbar/index.vue](/Users/roydust/Work/PPTist/src/views/Editor/Toolbar/index.vue)
- [src/store/slides.ts](/Users/roydust/Work/PPTist/src/store/slides.ts)

### 2. AI Application Layer

这是 AI PPT 二开的主工作流层。

职责：

- 整份生成流程
- 大纲确认流程
- 单页重生流程
- AI 任务状态管理
- 生成预览
- 错误处理和重试
- 调用后端 AI 接口

它不直接处理元素级编辑逻辑。

### 3. AI Schema / Adapter Layer

这是前端最关键的边界层。

职责：

- 定义 `AIDeck`
- 定义 `AISlide`
- 定义 `RegenerationContext`
- 定义 `StyleFingerprint`
- 校验后端返回结构
- 将 `AIDeck` 转成 PPTist slides
- 将 `AISlide` 转成单页预览 slide

原则：

- AI 返回结果不能直接进入编辑器 store
- 必须先经过 schema guard 和 adapter

### 4. Platform Layer

职责：

- API client
- telemetry / logging
- 本地缓存
- 后续任务轮询
- 后续项目保存和历史版本

## 推荐目录结构

建议把 AI 相关代码独立聚拢，而不是继续散落在 `views/Editor` 和 `hooks` 中。

推荐结构：

```text
src/
  ai/
    types/
      deck.ts
      slide.ts
      regeneration.ts
      task.ts

    services/
      aiDeck.ts

    stores/
      aiTasks.ts
      aiDeck.ts

    hooks/
      useAIDeckGeneration.ts
      useAISlideRegeneration.ts
      useAIDeckLoader.ts
      useAIDeckPreview.ts

    utils/
      guards.ts
      requests.ts
      pageCount.ts
      outline.ts
      logging.ts

    adapters/
      renderDeck.ts
      renderSlide.ts
      templateMatcher.ts
      contentTrimmer.ts
      styleFingerprint.ts

    components/
      AIDeckSetupForm.vue
      AIDeckOutlineReview.vue
      AIDeckGenerating.vue
      AISlideRegenerateDialog.vue
      AISlidePreviewCard.vue
```

这个目录的核心目的是：

- 把 AI 相关逻辑聚拢
- 保持 Editor Core 干净
- 让整份生成和单页重生都走统一的 schema / adapter 管线

## 现有文件的演进建议

### AIPPTDialog.vue

[src/views/Editor/AIPPTDialog.vue](/Users/roydust/Work/PPTist/src/views/Editor/AIPPTDialog.vue)

建议保留为“AI 入口容器”，但不再承载全部业务逻辑。

它应该只负责承载三个阶段：

- `setup`
- `outline review`
- `generating`

真正的数据请求、状态流转和 deck 适配逻辑应该移到 `src/ai/` 下。

### useAIPPT.ts

[src/hooks/useAIPPT.ts](/Users/roydust/Work/PPTist/src/hooks/useAIPPT.ts)

当前文件中有价值的部分主要是模板映射和替换逻辑。

建议：

- 逐步把纯映射逻辑迁入 `src/ai/adapters/`
- 最终让这个文件只保留兼容层，或者在新架构稳定后移除

### mainStore

[src/store/main.ts](/Users/roydust/Work/PPTist/src/store/main.ts)

建议只保留 UI 级开关，例如：

- 是否显示 AI 弹窗
- 是否显示单页重生弹窗

不建议把这些内容塞进去：

- plannedDeck
- outlineDraft
- generationTask
- slidePreview

### slidesStore

[src/store/slides.ts](/Users/roydust/Work/PPTist/src/store/slides.ts)

建议继续只维护编辑器里的 slide 数据，不承担 AI 任务状态。

也就是说，`slidesStore` 的边界应保持为：

- 编辑器真实显示中的 slides
- 当前页索引
- 主题
- 模板信息

而不是 AI 工作流容器。

## 状态分层设计

前端状态建议明确分成三类。

### 1. 编辑器运行状态

由现有 store 维护：

- 当前 slides
- 当前页索引
- 当前选中元素
- 缩放
- 工具栏状态
- 导出状态

### 2. AI 工作流状态

新增 store 维护：

- 当前步骤 `setup / outline / generating / preview`
- planningState
- renderingState
- regenerationState
- outlineDraft
- plannedDeck
- renderedDeckMeta
- slidePreview
- errorMessage
- 当前任务 id

### 3. 派生上下文状态

不建议长期存 store，建议按需计算：

- 邻页摘要
- 当前页类型
- 当前 deck 摘要
- style fingerprint

这类更适合写成纯函数或 hooks。

## 推荐新增 stores

### aiTasks store

职责：

- planningState
- renderingState
- regenerationState
- 当前错误信息
- 当前预览 slide
- 当前任务 id

### aiDeck store

职责：

- 当前生成表单
- outlineDraft
- plannedDeck
- 当前生成参数
- 当前重生模式

这两个 store 的作用是把：

- 编辑器状态
- AI 工作流状态

彻底分开。

## 整份生成的数据流

推荐流程：

```text
AIDeckSetupForm
  -> useAIDeckGeneration.createPlan()
  -> aiDeckService.planDeck()
  -> aiDeckStore.plannedDeck / outlineDraft
  -> AIDeckOutlineReview
  -> useAIDeckGeneration.createDeck()
  -> aiDeckService.renderDeck()
  -> renderAIDeckToSlides()
  -> useAIDeckLoader.loadSlidesIntoEditor()
  -> slidesStore.setSlides(...)
```

这里最关键的约束是：

```text
后端返回的 AIDeck
  不能直接进入 slidesStore
  必须先过 adapter
```

## 单页重生的数据流

推荐流程：

```text
用户点击 重新生成此页
  -> useAISlideRegeneration.collectContext()
  -> buildSlideRegenerationPayload()
  -> aiDeckService.regenerateSlide()
  -> AISlide
  -> renderAISlideToPPTistSlide()
  -> aiTasksStore.slidePreview
  -> AISlideRegenerateDialog
  -> 用户确认
  -> replaceCurrentSlide() 或 insertAfterCurrentSlide()
```

这里要强调：

- 单页重生必须先生成预览
- 不允许接口返回后直接覆盖当前页

## 核心 hooks 设计

### useAIDeckGeneration

职责：

- 创建 planning 请求
- 创建 rendering 请求
- 驱动整份生成 step 切换
- 更新 AI 工作流状态

### useAISlideRegeneration

职责：

- 收集当前页上下文
- 构造 regeneration payload
- 请求后端重生当前页
- 生成预览 slide
- 执行替换或插入

### useAIDeckLoader

职责：

- 安全地把 adapter 输出的 slides 装入编辑器
- 决定覆盖当前 deck 还是插入新 slides

### useAIDeckPreview

职责：

- 为后续 deck 生成预览或候选展示预留

## 与 Editor Core 的连接点

AI 层不应频繁触碰编辑器内核。

推荐仅在以下时机写入 Editor Core：

### 1. 整份生成完成后

调用：

- `slidesStore.setSlides(...)`
- 或统一的 loader

### 2. 用户确认替换当前页时

调用：

- `updateSlide(...)`
- 或专门的 slide replace helper

### 3. 用户确认插入候选页时

调用：

- `addSlidesFromData(...)`

除此之外，AI 层尽量只维护自己的中间状态。

## 前端状态机建议

### 整份生成流程状态机

```text
idle
  -> planning
  -> outline-review
  -> rendering
  -> completed
  -> failed
```

### 单页重生流程状态机

```text
idle
  -> collecting-context
  -> regenerating
  -> preview-ready
  -> applied / cancelled / failed
```

不要用零散的多个 boolean 控整个流程，否则后续维护会越来越乱。

## UI 结构建议

建议把 AI 交互拆成多个专用组件，而不是一个超级弹窗承载所有逻辑。

推荐组件：

- `AIDeckSetupForm`
- `AIDeckOutlineReview`
- `AIDeckGenerating`
- `AISlideRegenerateDialog`
- `AISlidePreviewCard`

这样有几个好处：

- 整份生成逻辑独立
- 单页重生逻辑独立
- 状态和 UI 对齐
- 后续增加“换一种风格再来一版”时不容易把一个组件做成巨石

## 错误处理策略

前端至少应区分三类错误：

### 1. 请求错误

例如：

- 网络失败
- 服务超时
- 权限异常

### 2. Schema 错误

例如：

- 后端返回的数据不符合 `AIDeck/AISlide` 约定

### 3. Adapter 错误

例如：

- 语义数据本身合法
- 但映射不成可编辑的 PPTist slide

这三类错误不能都报成“生成失败”。

## 前端技术边界总结

这个项目的前端不应该演化成：

- 一堆 AI 请求直接改 editor store
- 一个越来越臃肿的 `AIPPTDialog`
- 一个继续膨胀的 `useAIPPT.ts`

更合理的前端技术架构是：

```text
PPTist Editor Core
  + AI Application Layer
  + AI Schema / Adapter Layer
  + 独立 AI stores
  + 明确状态机
```

## 总结

前端的核心设计结论是：

- 保持 PPTist 作为编辑器内核
- 新增一层 AI 工作流应用层
- 用 schema 和 adapter 作为边界
- 用独立 store 管理 AI 状态
- 用预览确认机制完成单页重生

一句话总结：

```text
AI 负责生成语义结果
Adapter 负责翻译成 PPTist slides
Editor Core 负责最终编辑和导出
```
