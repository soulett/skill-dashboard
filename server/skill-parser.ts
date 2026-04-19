import fs from 'node:fs/promises';
import path from 'node:path';
import type { Category } from '../src/types';
import type { ParsedSkillFile } from './types';

const CATEGORIES: Category[] = ['编程开发', '内容创作', '数据分析', '产品设计', '效率流程', '商业营销', '其他'];

function normalizeCategory(value?: string): Category {
  if (value && CATEGORIES.includes(value as Category)) {
    return value as Category;
  }
  return '其他';
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

function parseTags(frontmatter: Record<string, string>): string[] {
  const raw = frontmatter.tags;
  if (!raw) return [];

  const inlineArray = raw.match(/^\[(.*)\]$/)?.[1] ?? raw;
  return inlineArray
    .split(',')
    .map(tag => tag.replace(/^["']|["']$/g, '').trim())
    .filter(Boolean);
}

function getTitle(raw: string, fallback: string, frontmatter: Record<string, string>): string {
  if (frontmatter.title) return frontmatter.title.replace(/^["']|["']$/g, '');
  return raw.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? fallback;
}

function getDescription(raw: string, frontmatter: Record<string, string>): string {
  if (frontmatter.description) return frontmatter.description.replace(/^["']|["']$/g, '');

  const firstParagraph = raw
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(line => line && !line.startsWith('#') && line !== '---');

  return firstParagraph?.slice(0, 80) ?? '待补充描述';
}

function inferStatus(title: string, description: string, whenToUse: string[]): 'active' | 'unrecognized' {
  return title && description !== '待补充描述' && whenToUse.length > 0 ? 'active' : 'unrecognized';
}

export async function parseSkillFile(root: string, filePath: string): Promise<ParsedSkillFile> {
  const raw = await fs.readFile(filePath, 'utf8');
  const fileName = path.basename(filePath);
  const relativeKey = path.relative(root, filePath).replaceAll('\\', '/');
  const frontmatter = parseFrontmatter(raw);
  const title = getTitle(raw, path.basename(path.dirname(filePath)), frontmatter);
  const description = getDescription(raw, frontmatter);
  const category = normalizeCategory(frontmatter.category);
  const tags = parseTags(frontmatter);
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
    status: inferStatus(title, description, whenToUse),
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
