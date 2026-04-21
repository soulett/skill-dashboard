import type { Category, Skill } from '../src/types';
import type { SkillMetadataPatch } from './types';

const TITLE_MAP: Record<string, string> = {
  'openai-docs': 'OpenAI 官方文档检索',
  'skill-installer': '技能安装工具',
  'skill-creator': '技能创建模板',
  'plugin-creator': '插件创建模板',
  imagegen: '图像生成能力',
  analyst: '业务分析能力',
  brainstorming: '需求共创流程',
  doc: 'Word 文档处理',
  slides: '演示文稿工具',
  spreadsheets: '电子表格工具',
  pdf: 'PDF 处理工具',
  playwright: '浏览器自动化',
  'frontend-design': '前端设计能力',
  'frontend-skill': '前端界面能力',
  'markdown-to-pdf': 'Markdown 转 PDF',
  'jupyter-notebook': 'Jupyter Notebook 工具',
  'notion-research-documentation': 'Notion 研究文档流程',
  'notion-spec-to-implementation': 'Notion 规格落地流程',
  'paper-project-picker': '论文项目选择工具',
  'paper-to-project-tech-note': '论文项目技术笔记',
  'project-doc-to-qa': '项目面试问答生成器',
  'project-doc-to-roadmap': '项目学习路线生成器',
  'project-doc-to-terms': '项目术语表生成器',
  screenshot: '系统截图工具',
  'skill-repo-sync': '技能仓库同步流程',
  spreadsheet: '表格处理工具',
  babysit: '守护执行流程',
  canvas: '画布能力模块',
  'create-hook': 'Hook 创建模板',
  'create-rule': '规则创建模板',
  'create-skill': '技能创建模板',
  'create-subagent': '子代理创建模板',
  'migrate-to-skills': '技能迁移工具',
  shell: 'Shell 命令工具',
  statusline: '状态栏配置工具',
  'update-cli-config': 'CLI 配置更新',
  'update-cursor-settings': 'Cursor 设置更新',
};

const CATEGORY_COPY: Record<Category, string> = {
  编程开发: '编程开发',
  内容创作: '内容创作',
  数据分析: '数据分析',
  产品设计: '产品设计',
  效率流程: '效率流程',
  商业营销: '商业营销',
  其他: '通用能力',
};

function keyFromSkill(skill: Skill): string {
  return skill.id.split('/').at(-2)?.toLowerCase() ?? skill.title.toLowerCase();
}

function humanizeTitle(skill: Skill): string {
  const key = keyFromSkill(skill);
  if (TITLE_MAP[key]) return TITLE_MAP[key];
  if (TITLE_MAP[skill.title.toLowerCase()]) return TITLE_MAP[skill.title.toLowerCase()];
  const normalized = skill.title.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  return normalized;
}

function normalizeTags(skill: Skill): string[] {
  const tags = new Set(skill.tags.slice(0, 5));
  tags.add(CATEGORY_COPY[skill.category]);
  return [...tags].slice(0, 6);
}

export function generateChineseMetadata(skill: Skill): SkillMetadataPatch {
  const displayTitle = humanizeTitle(skill);
  const categoryName = CATEGORY_COPY[skill.category];
  const displayDescription = `${displayTitle}用于处理${categoryName}相关任务，帮助你把原始技能能力转成更容易理解、搜索和复用的工作流入口。`;

  return {
    displayTitle,
    displayDescription,
    description: displayDescription,
    category: skill.category,
    tags: normalizeTags(skill),
    whenToUse: [
      `需要处理${categoryName}类任务时`,
      '想快速找到合适的本地 AI 技能时',
      '整理或演示个人能力库时',
    ],
    locale: 'zh-CN',
    translationSource: 'auto',
    translatedAt: new Date().toISOString(),
  };
}
