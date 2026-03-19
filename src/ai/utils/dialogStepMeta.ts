type AIDeckStep = 'setup' | 'outline' | 'generating'

interface DialogMetaOptions {
  step: AIDeckStep
  goalPageCount: number
  language: string
  topic?: string
  isPlanning: boolean
  isRendering: boolean
  lastPolledAt?: string
}

interface SummaryItem {
  label: string
  value: string
}

interface WorkflowStep {
  key: AIDeckStep
  label: string
  description: string
}

export interface AIPPTDialogMeta {
  activeStep: AIDeckStep
  eyebrow: string
  title: string
  subtitle: string
  badgeLabel: string
  summaryItems: SummaryItem[]
  guidance: string[]
  statusNote: string
  workflowSteps: WorkflowStep[]
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  { key: 'setup', label: '01 规划', description: '输入主题，定义页数和语言。' },
  { key: 'outline', label: '02 校稿', description: '确认大纲内容，再决定是否开始生成。' },
  { key: 'generating', label: '03 渲染', description: '按确认后的规划稿执行二次 AI 生成。' },
]

const LANGUAGE_LABELS: Record<string, string> = {
  'zh-CN': '中文',
  'en-US': 'English',
}

export const getAIPPTDialogMeta = ({
  step,
  goalPageCount,
  language,
  topic,
  isPlanning,
  isRendering,
  lastPolledAt,
}: DialogMetaOptions): AIPPTDialogMeta => {
  const normalizedTopic = topic?.trim() || '待输入'
  const summaryItems: SummaryItem[] = [
    { label: '主题', value: normalizedTopic },
    { label: '目标页数', value: `${goalPageCount} 页` },
    { label: '输出语言', value: LANGUAGE_LABELS[language] || language },
  ]

  if (step === 'generating') {
    summaryItems.push({ label: '渲染方式', value: '二次 AI 生成' })
  }

  if (step === 'setup') {
    return {
      activeStep: step,
      eyebrow: 'AIPPT Assistant',
      title: '把一个主题推进成可执行的大纲',
      subtitle: '先规划，再确认大纲，最后触发生成。这里先定义 AI 的工作范围。',
      badgeLabel: '规划阶段',
      summaryItems,
      guidance: [
        '先输入主题，让 AI 给出第一版规划。',
        '页数和语言只影响规划边界，不会直接跳过确认环节。',
        isPlanning ? '规划进行中，请不要重复提交。' : '确认参数后再发起规划，后续仍可编辑大纲。',
      ],
      statusNote: isPlanning ? 'AI 正在拆解主题并规划目录。' : '等待开始规划',
      workflowSteps: WORKFLOW_STEPS,
    }
  }

  if (step === 'outline') {
    return {
      activeStep: step,
      eyebrow: 'AIPPT Assistant',
      title: '确认规划稿，再进入正式生成',
      subtitle: '这里编辑的是 AI 规划出的中间稿，最终 render 将严格基于这些内容执行。',
      badgeLabel: '校稿阶段',
      summaryItems,
      guidance: [
        '优先检查全局摘要、单页标题和要点是否符合预期。',
        '这一步适合删掉空话、补齐结构、压实表达。',
        isRendering ? '渲染已开始，当前规划稿会作为唯一输入。' : '确认无误后再开始生成，当前不会直接写入编辑器。',
      ],
      statusNote: isRendering ? 'AI 正在根据规划稿生成最终演示文稿。' : '等待你确认规划稿',
      workflowSteps: WORKFLOW_STEPS,
    }
  }

  return {
    activeStep: step,
    eyebrow: 'AIPPT Assistant',
    title: 'AI 正在制作最终演示文稿',
    subtitle: '当前不是简单套模板，而是基于确认后的规划稿执行二次 AI 生成。',
    badgeLabel: '渲染阶段',
    summaryItems,
    guidance: [
      '生成阶段会保留你在上一阶段确认过的结构和重点。',
      '窗口保持打开即可，完成后会自动写回编辑器。',
      '如果轮询状态长时间不更新，再判断是否异常。',
    ],
    statusNote: lastPolledAt ? `最近轮询：${lastPolledAt}` : '等待首次轮询状态',
    workflowSteps: WORKFLOW_STEPS,
  }
}
