import fs from 'node:fs/promises';
import path from 'node:path';
import { SUPPORTED_SKILL_FILES } from './config';
import { parseSkillFile } from './skill-parser';
import type { ParsedSkillFile } from './types';

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
