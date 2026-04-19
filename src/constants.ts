import { Skill, StatsData } from './types';

const now = Date.now();
const minutesAgo = (minutes: number) => new Date(now - minutes * 60_000).toISOString();
const hoursAgo = (hours: number) => new Date(now - hours * 3_600_000).toISOString();
const daysAgo = (days: number) => new Date(now - days * 86_400_000).toISOString();

export const SKILLS: Skill[] = [
  {
    id: 'frontend-design',
    title: 'Frontend Design',
    description: '用更强视觉和明确层级，把普通页面做成可展示、可上线、像产品的前端界面。',
    category: '编程开发',
    tags: ['react', 'ui', 'landing-page', 'design-system'],
    status: 'active',
    icon: 'Palette',
    sourcePath: '~/.codex/skills/frontend-design/SKILL.md',
    fileName: 'SKILL.md',
    fileType: 'md',
    updatedAt: hoursAgo(6),
    scannedAt: minutesAgo(3),
    details: {
      whatItDoes: '负责高质量前端界面设计与实现，擅长落地仪表盘、落地页、组件系统和品牌化页面。它会优先处理视觉层级、间距、色彩、排版和交互反馈，让页面在第一眼就更像一个真实产品。',
      whenToUse: ['要把 demo 提升到可展示水准时', '需要重新梳理页面视觉层级时', '想做 landing page 或产品首页时'],
      triggerWords: ['design ui', 'build landing page', 'improve visual polish'],
      rawContent: `---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces.
---

# Frontend Design

- Build deliberate, polished interfaces
- Avoid generic AI-looking layouts
- Start from hierarchy, typography, and motion`,
    },
  },
  {
    id: 'playwright',
    title: 'Playwright 自动化',
    description: '从终端驱动真实浏览器做流程验证、截图采集、表单操作和页面回归检查。',
    category: '编程开发',
    tags: ['playwright', 'testing', 'browser', 'e2e'],
    status: 'active',
    icon: 'Globe',
    sourcePath: '~/.codex/skills/playwright/SKILL.md',
    fileName: 'SKILL.md',
    fileType: 'md',
    updatedAt: daysAgo(2),
    scannedAt: minutesAgo(3),
    details: {
      whatItDoes: '在需要真实浏览器上下文的任务里，它可以自动打开页面、点击按钮、填写表单、导出截图，并帮助验证关键路径是否可用。适合在发布前检查页面行为而不是只看静态代码。',
      whenToUse: ['要验证核心交互链路时', '需要批量截图留档时', '排查浏览器环境下的问题时'],
      triggerWords: ['run browser flow', 'take screenshots', 'debug ui'],
      rawContent: `---
name: playwright
description: Automate a real browser from the terminal.
---

# Playwright

- Navigate pages
- Fill forms
- Capture screenshots
- Validate critical flows`,
    },
  },
  {
    id: 'business-analyst',
    title: 'Business Analyst',
    description: '在动手做产品前，把目标用户、问题定义、需求边界和成功标准梳理清楚。',
    category: '产品设计',
    tags: ['discovery', 'requirements', 'research', 'brief'],
    status: 'active',
    icon: 'UserRoundSearch',
    sourcePath: '~/.codex/skills/analyst/SKILL.md',
    fileName: 'SKILL.md',
    fileType: 'md',
    updatedAt: daysAgo(4),
    scannedAt: minutesAgo(3),
    details: {
      whatItDoes: '聚焦产品发现和需求分析，擅长澄清目标用户、使用场景、核心价值和边界条件。适合在方案尚不稳定、需求容易发散的阶段帮助收敛方向。',
      whenToUse: ['需求还很模糊时', '要梳理目标用户和场景时', '需要写产品简报和需求摘要时'],
      triggerWords: ['product brief', 'user research', 'clarify requirements'],
      rawContent: `---
name: analyst
description: Product discovery and requirements analysis specialist.
---

# Business Analyst

- Clarify goals and users
- Reduce scope ambiguity
- Turn ideas into actionable requirements`,
    },
  },
  {
    id: 'prd',
    title: 'PRD 生成器',
    description: '把一个功能想法整理成结构化 PRD，方便研发、设计和演示统一理解。',
    category: '产品设计',
    tags: ['prd', 'requirements', 'planning', 'spec'],
    status: 'active',
    icon: 'FileText',
    sourcePath: '~/.codex/skills/prd/SKILL.md',
    fileName: 'SKILL.md',
    fileType: 'md',
    updatedAt: daysAgo(5),
    scannedAt: minutesAgo(3),
    details: {
      whatItDoes: '根据功能目标生成包含问题定义、目标、用户故事、功能范围、验收标准和非目标的 PRD。它适合帮助团队快速对齐预期，也很适合做 demo 前的方案沉淀。',
      whenToUse: ['准备做新功能前', '需要和同伴快速对齐需求时', '要把一个想法沉淀成正式文档时'],
      triggerWords: ['create prd', 'write requirements', 'plan this feature'],
      rawContent: `---
name: prd
description: Generate a product requirements document for a new feature.
---

# PRD

1. Problem
2. Goals
3. User stories
4. Requirements
5. Out of scope`,
    },
  },
  {
    id: 'doc',
    title: 'DOCX 文档处理',
    description: '创建、编辑和检查 Word 文档，适合交付说明书、方案稿和结构化报告。',
    category: '内容创作',
    tags: ['docx', 'word', 'report', 'formatting'],
    status: 'active',
    icon: 'FileType2',
    sourcePath: '~/.codex/skills/doc/SKILL.md',
    fileName: 'SKILL.md',
    fileType: 'md',
    updatedAt: daysAgo(8),
    scannedAt: minutesAgo(3),
    details: {
      whatItDoes: '适合处理对版式有要求的 Word 文件，包括新建、改写、格式整理和视觉校验。对于需要正式交付的说明文档、方案文档和报告非常实用。',
      whenToUse: ['要输出正式说明文档时', '需要保留版式编辑现有 Word 时', '交付前检查排版时'],
      triggerWords: ['edit docx', 'create word doc', 'format report'],
      rawContent: `---
name: doc
description: Read, create, or edit .docx documents.
---

# DOCX

- Use python-docx for structured edits
- Re-render when layout matters`,
    },
  },
  {
    id: 'slides',
    title: 'Slides / PPT',
    description: '生成可编辑演示文稿，用于项目汇报、方案展示和作品集打包。',
    category: '内容创作',
    tags: ['pptx', 'slides', 'presentation', 'deck'],
    status: 'active',
    icon: 'Presentation',
    sourcePath: '~/.codex/skills/slides/SKILL.md',
    fileName: 'SKILL.md',
    fileType: 'md',
    updatedAt: daysAgo(3),
    scannedAt: minutesAgo(3),
    details: {
      whatItDoes: '帮助构建可编辑的演示文稿，包含页面结构、标题层级、图表信息和视觉版式。适合在作品集、客户汇报和项目复盘中快速生成结构清晰的 PPT。',
      whenToUse: ['要做产品方案展示时', '需要整理成作品集页面时', '要输出团队汇报材料时'],
      triggerWords: ['build slides', 'make ppt', 'presentation deck'],
      rawContent: `---
name: slides
description: Create and edit presentation slide decks.
---

# Slides

- Build editable PPTX decks
- Keep layout stable
- Optimize for presentations`,
    },
  },
  {
    id: 'spreadsheet',
    title: 'Spreadsheet',
    description: '面向 Excel 和 CSV 的数据整理分析能力，适合做台账、列表、统计和结构化表格。',
    category: '数据分析',
    tags: ['excel', 'csv', 'analysis', 'table'],
    status: 'active',
    icon: 'Table2',
    sourcePath: '~/.codex/skills/spreadsheet/SKILL.md',
    fileName: 'SKILL.md',
    fileType: 'md',
    updatedAt: daysAgo(6),
    scannedAt: minutesAgo(3),
    details: {
      whatItDoes: '适合创建、编辑和分析表格数据，能处理 Excel、CSV 和 TSV 等文件，支持公式、筛选、汇总和结果核对。它常用于搭建运营表、项目进度表和数据统计底表。',
      whenToUse: ['要整理结构化数据时', '需要生成统计表和汇总表时', '想把杂乱信息变成可分析表格时'],
      triggerWords: ['analyze csv', 'edit excel', 'make spreadsheet'],
      rawContent: `---
name: spreadsheet
description: Create, edit, and analyze spreadsheet files.
---

# Spreadsheet

- Work with .xlsx and .csv
- Keep formulas intact
- Build summary views`,
    },
  },
  {
    id: 'openai-docs',
    title: 'OpenAI Docs',
    description: '查询权威 OpenAI 官方文档，帮助选模型、定接口方案和核对最新用法。',
    category: '数据分析',
    tags: ['openai', 'docs', 'api', 'models'],
    status: 'active',
    icon: 'BookOpenText',
    sourcePath: '~/.codex/skills/.system/openai-docs/SKILL.md',
    fileName: 'SKILL.md',
    fileType: 'md',
    updatedAt: daysAgo(1),
    scannedAt: minutesAgo(3),
    details: {
      whatItDoes: '聚焦官方文档查询和最新模型信息核对，适合在接入 OpenAI API、比较模型、确认参数和升级方案时提供可靠参考。它强调来源权威和信息时效。',
      whenToUse: ['要接 OpenAI API 时', '不确定模型怎么选时', '要确认官方最新能力和限制时'],
      triggerWords: ['openai docs', 'which model', 'openai api'],
      rawContent: `---
name: openai-docs
description: Use official OpenAI documentation as the primary source.
---

# OpenAI Docs

- Prefer official docs
- Cite sources
- Verify model recency`,
    },
  },
  {
    id: 'notion-research',
    title: 'Notion Research Documentation',
    description: '从多个 Notion 页面收集信息并整理成 brief、报告或结构化结论。',
    category: '效率流程',
    tags: ['notion', 'research', 'brief', 'documentation'],
    status: 'active',
    icon: 'SearchCheck',
    sourcePath: '~/.codex/skills/notion-research-documentation/SKILL.md',
    fileName: 'SKILL.md',
    fileType: 'md',
    updatedAt: daysAgo(7),
    scannedAt: minutesAgo(3),
    details: {
      whatItDoes: '在 Notion 场景里聚合多页信息、抽取重点并输出更易理解的简报或文档。适合做周报整理、专题研究和内部信息沉淀。',
      whenToUse: ['要汇总多个 Notion 页面时', '需要输出带来源的研究简报时', '做周报或项目复盘时'],
      triggerWords: ['research notion', 'notion brief', 'summarize notion'],
      rawContent: `---
name: notion-research-documentation
description: Research across Notion and synthesize into docs.
---

# Notion Research

- Search multiple pages
- Preserve citations
- Output structured documentation`,
    },
  },
  {
    id: 'skill-installer',
    title: 'Skill Installer',
    description: '从技能市场或 GitHub 仓库安装新技能，快速扩充你的 AI 能力库。',
    category: '效率流程',
    tags: ['install', 'skills', 'github', 'marketplace'],
    status: 'active',
    icon: 'Download',
    sourcePath: '~/.codex/skills/.system/skill-installer/SKILL.md',
    fileName: 'SKILL.md',
    fileType: 'md',
    updatedAt: hoursAgo(18),
    scannedAt: minutesAgo(3),
    details: {
      whatItDoes: '帮助发现、安装和接入新的 Skills，让本地 AI 工作流不断扩展。适合在已有技能体系基础上继续按场景补能力。',
      whenToUse: ['发现缺少某项能力时', '想从市场安装精选技能时', '要从 GitHub 引入现成能力时'],
      triggerWords: ['install skill', 'browse skills', 'get from github'],
      rawContent: `---
name: skill-installer
description: Install Codex skills from curated lists or GitHub paths.
---

# Skill Installer

- Install curated skills
- Support GitHub sources
- Expand the local skill library`,
    },
  },
  {
    id: 'marketing-copy',
    title: 'Marketing Copy',
    description: '面向落地页、广告和转化场景的文案生成能力，强调清晰价值表达与行动号召。',
    category: '商业营销',
    tags: ['copywriting', 'marketing', 'landing-page', 'conversion'],
    status: 'active',
    icon: 'Megaphone',
    sourcePath: '~/.codex/skills/marketing-copy/SKILL.md',
    fileName: 'SKILL.md',
    fileType: 'md',
    updatedAt: daysAgo(4),
    scannedAt: minutesAgo(3),
    details: {
      whatItDoes: '针对营销页面、产品介绍、活动页和广告位撰写更有转化感的文案。适合在 demo 上线前，快速把产品语言从“功能描述”升级为“价值表达”。',
      whenToUse: ['要写首页 hero 文案时', '要做活动页和卖点表达时', '想提升页面转化感时'],
      triggerWords: ['marketing copy', 'landing page copy', 'conversion text'],
      rawContent: `---
name: marketing-copy
description: Write high-conversion copy for product and campaign pages.
---

# Marketing Copy

- Clarify value
- Improve conversion
- Match message to audience`,
    },
  },
  {
    id: 'cold-email',
    title: 'Cold Email',
    description: '生成更个性化的外联邮件，适合 BD、合作邀约、求职和冷启动触达。',
    category: '商业营销',
    tags: ['email', 'outreach', 'bd', 'sales'],
    status: 'updating',
    icon: 'Mail',
    sourcePath: '~/.codex/skills/cold-email/SKILL.md',
    fileName: 'SKILL.md',
    fileType: 'md',
    updatedAt: hoursAgo(2),
    scannedAt: minutesAgo(3),
    details: {
      whatItDoes: '帮助撰写冷启动邮件、合作邀约和销售触达内容，重点是提高相关性、开信率和回复率。特别适合早期产品寻找种子用户、合作伙伴或客户。',
      whenToUse: ['要联系潜在合作方时', '做冷启动增长时', '需要外联求职或商务邮件时'],
      triggerWords: ['cold email', 'outreach', 'intro mail'],
      rawContent: `---
name: cold-email
description: Create personalized cold outreach emails.
---

# Cold Email

- Personalize the first line
- Clarify the ask
- Reduce friction to reply`,
    },
  },
  {
    id: 'legacy-checklist',
    title: 'Legacy Checklist',
    description: '一份待整理的历史 SOP，目前能识别文件存在，但元信息还不完整。',
    category: '其他',
    tags: ['legacy', 'sop'],
    status: 'unrecognized',
    icon: 'FileWarning',
    sourcePath: '~/Documents/old-skills/legacy-checklist.txt',
    fileName: 'legacy-checklist.txt',
    fileType: 'txt',
    updatedAt: daysAgo(12),
    scannedAt: minutesAgo(3),
    details: {
      whatItDoes: '这是一份还没有完全结构化的旧资料。当前系统能发现它，但还需要手动补齐标题、标签和适用场景，才能像其他技能一样被更好地管理和调用。',
      whenToUse: ['需要整理旧技能资产时', '想把零散 SOP 录入系统时'],
      triggerWords: [],
      rawContent: `Day 1: 创建账号
Day 2: 补齐权限
Day 3: 跟随示例跑通
Day 5: 开始独立执行`,
    },
  },
];

export const STATS_DATA: StatsData = {
  totalSkills: SKILLS.length,
  totalCategories: [...new Set(SKILLS.map(skill => skill.category))].length,
  newSinceLastScan: 2,
  lastScanTime: minutesAgo(2),
};

export const CATEGORIES = ['编程开发', '内容创作', '数据分析', '产品设计', '效率流程', '商业营销', '其他'] as const;
