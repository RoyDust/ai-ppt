# AI PPT 数据库结构草案

## 目标

为基于 PPTist 二开的 AI PPT 项目设计一版可落地的数据库结构，满足以下需求：

- 支持项目与 deck 管理
- 支持整份 PPT AI 生成
- 支持单页重生
- 支持 deck 历史版本追踪
- 支持 AI 任务记录与问题排查
- 为后续模板管理、导出管理和版本回滚预留扩展空间

本草案按照当前已确认的产品边界设计：

- 单用户 / 单团队内部系统
- 不考虑复杂租户体系
- 采用“版本化业务型”建模方式

## 建模原则

- `decks` 与 `deck_versions` 分离
- 当前主状态与历史快照分离
- AI 任务过程独立建表
- AI 复杂结构优先存 `jsonb`
- 高筛选字段使用独立列
- v1 不过度拆分 slide / element 级关系表

## 核心实体

推荐围绕以下 6 个核心实体建模：

1. `users`
2. `projects`
3. `decks`
4. `deck_versions`
5. `ai_tasks`
6. `exports`

另外建议预留 2 个可选扩展实体：

7. `templates`
8. `deck_template_bindings`

## 实体关系

推荐关系如下：

```text
users 1 --- n projects
projects 1 --- n decks
decks 1 --- n deck_versions
decks 1 --- n ai_tasks
decks 1 --- n exports
deck_versions 1 --- n ai_tasks   (可选关联)
```

可以理解为：

- `projects` 是业务容器
- `decks` 是当前工作对象
- `deck_versions` 是历史快照
- `ai_tasks` 是过程记录
- `exports` 是导出记录

## 为什么要拆 decks 和 deck_versions

`decks` 和 `deck_versions` 不是一回事。

### decks

负责存当前主记录，适合高频查询：

- 当前标题
- 当前页数
- 当前语言
- 当前版本指针
- 最近更新时间

### deck_versions

负责存历史快照，适合版本追踪：

- 某次整份生成结果
- 某次单页重生结果
- 某次导入结果
- 某次手动保存的关键版本

如果不拆开，会出现两个问题：

- deck 主表会越来越重
- 很难同时兼顾“当前状态查询”和“历史版本追踪”

## 结构化列与 JSONB 的边界

### 建议使用普通列的字段

这些字段后续会高频筛选、排序或建立索引：

- `user_id`
- `project_id`
- `deck_id`
- `title`
- `language`
- `status`
- `task_type`
- `target_page_count`
- `actual_page_count`
- `current_version_id`
- `created_at`
- `updated_at`

### 建议使用 JSONB 的字段

这些结构未来很可能演进，不建议现在过度拆分：

- `outline_json`
- `ai_deck_json`
- `pptist_slides_json`
- `style_fingerprint_json`
- `task_input_json`
- `task_output_json`
- `metadata_json`
- `theme_json`
- `manifest_json`

## 表结构草案

## 1. users

即使当前是内部系统，也建议保留。

```sql
users
- id                    uuid pk
- username              varchar(64) not null unique
- display_name          varchar(128)
- email                 varchar(128)
- avatar_url            text
- status                varchar(32) not null default 'active'
- created_at            timestamptz not null default now()
- updated_at            timestamptz not null default now()
```

说明：

- 即使当前只有一个默认用户，也建议从一开始保留此表
- 便于后续扩展基础账号能力

## 2. projects

项目容器。

```sql
projects
- id                    uuid pk
- user_id               uuid not null references users(id)
- name                  varchar(256) not null
- description           text
- cover_url             text
- status                varchar(32) not null default 'active'
- archived_at           timestamptz
- created_at            timestamptz not null default now()
- updated_at            timestamptz not null default now()
```

推荐索引：

- `idx_projects_user_id`
- `idx_projects_updated_at`

说明：

- 一个 project 下可以有多份 deck
- 后续可扩展标签、分类、归档能力

## 3. decks

当前 deck 主记录。

```sql
decks
- id                    uuid pk
- project_id            uuid not null references projects(id)
- user_id               uuid not null references users(id)
- title                 varchar(256) not null
- topic                 varchar(512)
- language              varchar(32) not null default 'zh-CN'
- purpose               varchar(128)
- audience              varchar(128)
- tone                  varchar(64)
- status                varchar(32) not null default 'draft'
- target_page_count     integer
- actual_page_count     integer
- current_version_id    uuid
- latest_task_id        uuid
- thumbnail_url         text
- outline_summary       text
- metadata_json         jsonb not null default '{}'::jsonb
- created_at            timestamptz not null default now()
- updated_at            timestamptz not null default now()
```

推荐索引：

- `idx_decks_project_id`
- `idx_decks_user_id`
- `idx_decks_status`
- `idx_decks_updated_at`

说明：

- 这里只存 deck 当前主状态
- 不直接存所有版本快照细节
- `metadata_json` 适合放来源模型、标签、模板族等扩展字段

## 4. deck_versions

这是最关键的一张表。

```sql
deck_versions
- id                     uuid pk
- deck_id                uuid not null references decks(id)
- version_no             integer not null
- source_type            varchar(32) not null
- source_task_id         uuid
- parent_version_id      uuid
- title_snapshot         varchar(256)
- target_page_count      integer
- actual_page_count      integer
- outline_json           jsonb not null default '[]'::jsonb
- ai_deck_json           jsonb not null default '{}'::jsonb
- pptist_slides_json     jsonb not null default '[]'::jsonb
- style_fingerprint_json jsonb not null default '{}'::jsonb
- summary                text
- is_current             boolean not null default false
- created_by             uuid not null references users(id)
- created_at             timestamptz not null default now()
```

`source_type` 建议值：

- `ai_generate`
- `slide_regenerate`
- `manual_save`
- `import`
- `system_repair`

推荐索引：

- `uk_deck_versions_deck_id_version_no`
- `idx_deck_versions_deck_id_created_at`
- `idx_deck_versions_source_task_id`
- `idx_deck_versions_is_current`

说明：

- `outline_json` 保存大纲规划结果
- `ai_deck_json` 保存中间语义结构
- `pptist_slides_json` 保存最终可编辑版本
- `parent_version_id` 用于表达版本分叉关系

## 5. ai_tasks

统一记录所有 AI 过程任务。

```sql
ai_tasks
- id                    uuid pk
- user_id               uuid not null references users(id)
- project_id            uuid references projects(id)
- deck_id               uuid references decks(id)
- deck_version_id       uuid references deck_versions(id)
- task_type             varchar(32) not null
- status                varchar(32) not null
- provider              varchar(64)
- model                 varchar(128)
- input_json            jsonb not null default '{}'::jsonb
- output_json           jsonb not null default '{}'::jsonb
- error_code            varchar(64)
- error_message         text
- retry_count           integer not null default 0
- started_at            timestamptz
- finished_at           timestamptz
- created_at            timestamptz not null default now()
- updated_at            timestamptz not null default now()
```

`task_type` 建议值：

- `deck_plan`
- `deck_render`
- `slide_regenerate`
- `image_search`
- `image_generate`
- `export`

`status` 建议值：

- `pending`
- `running`
- `succeeded`
- `failed`
- `cancelled`

推荐索引：

- `idx_ai_tasks_deck_id`
- `idx_ai_tasks_task_type`
- `idx_ai_tasks_status`
- `idx_ai_tasks_created_at`

说明：

- `input_json` 和 `output_json` 对排查问题、调优 prompt 很关键
- `deck_version_id` 可用于关联某次任务产出的具体版本

## 6. exports

导出记录。

```sql
exports
- id                    uuid pk
- user_id               uuid not null references users(id)
- deck_id               uuid not null references decks(id)
- deck_version_id       uuid references deck_versions(id)
- export_type           varchar(32) not null
- status                varchar(32) not null
- file_url              text
- file_size             bigint
- error_message         text
- created_at            timestamptz not null default now()
- updated_at            timestamptz not null default now()
```

`export_type` 建议值：

- `pptx`
- `pdf`
- `image`
- `json`

推荐索引：

- `idx_exports_deck_id`
- `idx_exports_status`
- `idx_exports_created_at`

## 可选扩展表

## 7. templates

虽然模板体系不是 v1 的重点，但建议先预留表。

```sql
templates
- id                    uuid pk
- name                  varchar(128) not null
- category              varchar(64)
- status                varchar(32) not null default 'active'
- cover_url             text
- theme_json            jsonb not null default '{}'::jsonb
- manifest_json         jsonb not null default '{}'::jsonb
- source_type           varchar(32) not null default 'system'
- created_at            timestamptz not null default now()
- updated_at            timestamptz not null default now()
```

说明：

- `theme_json` 可存模板主题色、字体、视觉参数
- `manifest_json` 可存模板页类型支持范围、页面容量、版式元数据

## 8. deck_template_bindings

记录某个 deck 当前主要绑定哪个模板族。

```sql
deck_template_bindings
- id                    uuid pk
- deck_id               uuid not null references decks(id)
- template_id           uuid not null references templates(id)
- binding_role          varchar(32) not null default 'primary'
- created_at            timestamptz not null default now()
```

说明：

- `binding_role` 用于后续支持主模板、副模板、多模板方案

## 主外键关系汇总

```text
users.id -> projects.user_id
users.id -> decks.user_id
users.id -> deck_versions.created_by
users.id -> ai_tasks.user_id
users.id -> exports.user_id

projects.id -> decks.project_id
decks.id -> deck_versions.deck_id
decks.id -> ai_tasks.deck_id
decks.id -> exports.deck_id

deck_versions.id -> ai_tasks.deck_version_id
deck_versions.id -> exports.deck_version_id
```

## 推荐保留为 JSONB 的字段

建议以下字段直接采用 JSONB：

- `decks.metadata_json`
- `deck_versions.outline_json`
- `deck_versions.ai_deck_json`
- `deck_versions.pptist_slides_json`
- `deck_versions.style_fingerprint_json`
- `ai_tasks.input_json`
- `ai_tasks.output_json`
- `templates.theme_json`
- `templates.manifest_json`

原因：

- 协议会演进
- 字段结构会变化
- v1 阶段没必要过度范式化

## 建议强约束的字段

以下字段建议使用明确列和非空约束：

- `title`
- `status`
- `task_type`
- `language`
- `target_page_count`
- `actual_page_count`
- `version_no`
- `created_at`
- `updated_at`

原因：

- 这些字段会被频繁检索、过滤和排序
- 后续便于建立索引和做监控统计

## v1 最低落地集

如果当前目标是尽快推进 v1，最低建议先建这 5 张表：

- `users`
- `projects`
- `decks`
- `deck_versions`
- `ai_tasks`

`deck_versions` 不能省，因为：

- 整份生成会产生版本
- 单页重生会产生版本
- 后续需要回滚和对比

`exports` 和 `templates` 可以稍后补。

## v1 不建议现在拆分的内容

当前不建议拆成独立表：

- slides
- elements
- regeneration suggestions
- prompt templates
- style tokens

原因：

- 这些内容更适合先放在 JSONB 中
- 提前拆表会增加复杂度
- 当前产品阶段还没有强需求支撑

## 总结

本草案的核心设计结论是：

- 用 `projects` 管业务归属
- 用 `decks` 管当前主状态
- 用 `deck_versions` 管历史快照
- 用 `ai_tasks` 管 AI 过程
- 用 `jsonb` 承载复杂可变结构

一句话总结：

```text
当前状态和历史版本分离
AI 任务和业务对象分离
复杂生成结构优先 JSONB
```
