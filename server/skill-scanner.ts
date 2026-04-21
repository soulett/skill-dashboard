import fs from 'node:fs/promises';
import path from 'node:path';
import { SUPPORTED_SKILL_FILES } from './config';
import { parseSkillFile } from './skill-parser';
import type { ParsedSkillFile } from './types';

export type RootScanState = 'detected' | 'empty' | 'unreachable';

export interface RootScanResult {
  state: RootScanState;
  skills: ParsedSkillFile[];
  message?: string;
}

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async entry => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(fullPath);
      return SUPPORTED_SKILL_FILES.has(entry.name) ? [fullPath] : [];
    }),
  );

  return files.flat();
}

export async function scanSkillRoots(roots: string[]): Promise<ParsedSkillFile[]> {
  const collected = await Promise.all(
    roots.map(async root => {
      try {
        const files = await walk(root);
        return Promise.all(files.map(file => parseSkillFile(root, file)));
      } catch {
        return [];
      }
    }),
  );

  return collected.flat();
}

export async function scanSingleRoot(root: string): Promise<RootScanResult> {
  try {
    const files = await walk(root);
    if (files.length === 0) {
      return { state: 'empty', skills: [], message: '目录存在，但暂未发现技能文件。' };
    }

    const skills = await Promise.all(files.map(file => parseSkillFile(root, file)));
    return {
      state: skills.length > 0 ? 'detected' : 'empty',
      skills,
      message: skills.length > 0 ? '已识别到技能文件。' : '目录存在，但暂未发现技能文件。',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '目录不可访问';
    return { state: 'unreachable', skills: [], message };
  }
}
