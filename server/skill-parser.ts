import fs from 'node:fs/promises';
import path from 'node:path';
import type { Category } from '../src/types';
import type { ParsedSkillFile } from './types';

const CATEGORIES: Category[] = ['编程开发', '内容创作', '数据分析', '产品设计', '效率流程', '商业营销', '其他'];

const CATEGORY_ALIASES: Record<string, Category> = {
  coding: '编程开发',
  development: '编程开发',
  engineering: '编程开发',
  frontend: '编程开发',
  browser: '编程开发',
  testing: '编程开发',
  writing: '内容创作',
  content: '内容创作',
  document: '内容创作',
  documents: '内容创作',
  slides: '内容创作',
  spreadsheet: '数据分析',
  spreadsheets: '数据分析',
  data: '数据分析',
  research: '数据分析',
  analysis: '数据分析',
  product: '产品设计',
  design: '产品设计',
  ux: '产品设计',
  workflow: '效率流程',
  automation: '效率流程',
  notion: '效率流程',
  sync: '效率流程',
  marketing: '商业营销',
  sales: '商业营销',
  email: '商业营销',
  business: '商业营销',
};

const CATEGORY_BY_KEY: Record<string, Category> = {
  imagegen: '产品设计',
  'openai-docs': '编程开发',
  'plugin-creator': '编程开发',
  'skill-creator': '效率流程',
  'skill-installer': '效率流程',
  analyst: '产品设计',
  brainstorming: '产品设计',
  slides: '内容创作',
  spreadsheets: '数据分析',
  doc: '内容创作',
  'extract-learning-roadmap': '内容创作',
  'frontend-design': '编程开发',
  'frontend-skill': '编程开发',
  'jupyter-notebook': '数据分析',
  'markdown-to-pdf': '内容创作',
  'notion-research-documentation': '效率流程',
  'notion-spec-to-implementation': '效率流程',
  'paper-project-picker': '数据分析',
  'paper-to-project-tech-note': '内容创作',
  pdf: '内容创作',
  playwright: '编程开发',
  prd: '产品设计',
  'project-doc-to-qa': '内容创作',
  'project-doc-to-roadmap': '内容创作',
  'project-doc-to-terms': '内容创作',
  screenshot: '效率流程',
  'skill-repo-sync': '效率流程',
  spreadsheet: '数据分析',
  'writing-plans': '效率流程',
};

function normalizeCategory(value?: string): Category {
  if (!value) return '其他';
  const normalized = value.trim().replace(/^["']|["']$/g, '');
  if (CATEGORIES.includes(normalized as Category)) return normalized as Category;
  return CATEGORY_ALIASES[normalized.toLowerCase()] ?? '其他';
}

function parseFrontmatter(raw: string): Record<string, string> {
  const match = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  return match[1]
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((result, line) => {
      const separatorIndex = line.indexOf(':');
      if (separatorIndex === -1) return result;
      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      result[key] = value;
      return result;
    }, {});
}

function parseTags(frontmatter: Record<string, string>, raw: string, relativeKey: string): string[] {
  const rawTags = frontmatter.tags;
  if (rawTags) {
    const inlineArray = rawTags.match(/^\[(.*)\]$/)?.[1] ?? rawTags;
    return inlineArray
      .split(',')
      .map(tag => tag.replace(/^["']|["']$/g, '').trim())
      .filter(Boolean);
  }

  const text = `${relativeKey}\n${raw}`.toLowerCase();
  const candidates = ['react', 'typescript', 'git', 'github', 'browser', 'playwright', 'pdf', 'docx', 'ppt', 'excel', 'notion', 'openai', 'api', 'research'];
  return candidates.filter(tag => text.includes(tag)).slice(0, 4);
}

function getTitle(raw: string, fallback: string, frontmatter: Record<string, string>): string {
  if (frontmatter.title) return frontmatter.title.replace(/^["']|["']$/g, '');
  if (frontmatter.name) return frontmatter.name.replace(/^["']|["']$/g, '');
  return raw.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? fallback;
}

function getDescription(raw: string, frontmatter: Record<string, string>): string {
  if (frontmatter.description) return frontmatter.description.replace(/^["']|["']$/g, '');

  const frontmatterEnd = raw.match(/^---\s*\r?\n[\s\S]*?\r?\n---\s*/)?.[0] ?? '';
  const body = frontmatterEnd ? raw.slice(frontmatterEnd.length) : raw;
  const firstParagraph = body
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(line => line && !line.startsWith('#') && !line.startsWith('-'));

  return firstParagraph?.slice(0, 120) ?? '待补充描述';
}

function inferCategory(relativeKey: string, raw: string, frontmatter: Record<string, string>): Category {
  const explicit = normalizeCategory(frontmatter.category);
  if (explicit !== '其他') return explicit;

  const pathParts = relativeKey.split('/');
  const folderKey = pathParts.at(-2)?.toLowerCase();
  if (folderKey && CATEGORY_BY_KEY[folderKey]) return CATEGORY_BY_KEY[folderKey];

  const text = `${relativeKey}\n${raw}`.toLowerCase();
  if (/(marketing|business|email|sales|商业|营销|邮件)/.test(text)) return '商业营销';
  if (/(prd|product|design|ux|analyst|产品|设计|需求)/.test(text)) return '产品设计';
  if (/(doc|pdf|slide|ppt|writing|content|markdown|文档|写作|内容)/.test(text)) return '内容创作';
  if (/(excel|sheet|csv|data|analysis|research|数据|分析|研究)/.test(text)) return '数据分析';
  if (/(workflow|sync|install|notion|automation|效率|流程|同步|安装)/.test(text)) return '效率流程';
  if (/(react|frontend|code|git|api|browser|playwright|plugin|coding|开发|代码|编程)/.test(text)) return '编程开发';
  return '其他';
}

function inferStatus(title: string, description: string, whenToUse: string[], tags: string[]): 'active' | 'unrecognized' {
  return title && description !== '待补充描述' && (whenToUse.length > 0 || tags.length > 0) ? 'active' : 'unrecognized';
}

export async function parseSkillFile(root: string, filePath: string): Promise<ParsedSkillFile> {
  const raw = await fs.readFile(filePath, 'utf8');
  const fileName = path.basename(filePath);
  const relativeKey = path.relative(root, filePath).replaceAll('\\', '/');
  const frontmatter = parseFrontmatter(raw);
  const title = getTitle(raw, path.basename(path.dirname(filePath)), frontmatter);
  const description = getDescription(raw, frontmatter);
  const tags = parseTags(frontmatter, raw, relativeKey);
  const category = inferCategory(relativeKey, raw, frontmatter);
  const stat = await fs.stat(filePath);
  const whenToUse = frontmatter.when_to_use
    ? frontmatter.when_to_use
        .split('|')
        .map(item => item.trim())
        .filter(Boolean)
    : [];

  return {
    id: relativeKey,
    relativeKey,
    title,
    description,
    category,
    tags,
    status: inferStatus(title, description, whenToUse, tags),
    icon: 'Cpu',
    sourcePath: filePath,
    fileName,
    fileType: 'md',
    updatedAt: stat.mtime.toISOString(),
    scannedAt: new Date().toISOString(),
    details: {
      whatItDoes: description,
      whenToUse,
      triggerWords: tags,
      rawContent: raw,
    },
  };
}
