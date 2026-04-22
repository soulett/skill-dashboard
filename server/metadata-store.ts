import fs from 'node:fs/promises';
import path from 'node:path';
import type { ImportedSkillsFile, SkillMetadataFile, SkillMetadataPatch } from './types';
import type { Skill } from '../src/types';

export function createEmptyMetadata(): SkillMetadataFile {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    skills: {},
  };
}

export async function ensureMetadataFile(metadataFilePath: string): Promise<SkillMetadataFile> {
  await fs.mkdir(path.dirname(metadataFilePath), { recursive: true });

  try {
    const raw = await fs.readFile(metadataFilePath, 'utf8');
    const parsed = JSON.parse(raw) as SkillMetadataFile;
    return {
      version: parsed.version ?? 1,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      skills: parsed.skills ?? {},
    };
  } catch {
    const empty = createEmptyMetadata();
    await fs.writeFile(metadataFilePath, JSON.stringify(empty, null, 2), 'utf8');
    return empty;
  }
}

export async function saveSkillMetadataPatch(
  metadataFilePath: string,
  skillId: string,
  patch: SkillMetadataPatch,
): Promise<SkillMetadataFile> {
  const current = await ensureMetadataFile(metadataFilePath);
  const next: SkillMetadataFile = {
    ...current,
    updatedAt: new Date().toISOString(),
    skills: {
      ...current.skills,
      [skillId]: {
        ...current.skills[skillId],
        ...patch,
      },
    },
  };

  const tempPath = `${metadataFilePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(next, null, 2), 'utf8');
  await fs.rename(tempPath, metadataFilePath);
  return next;
}

export function createEmptyImportedSkills(): ImportedSkillsFile {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    skills: [],
  };
}

export async function ensureImportedSkillsFile(importedSkillsFilePath: string): Promise<ImportedSkillsFile> {
  await fs.mkdir(path.dirname(importedSkillsFilePath), { recursive: true });

  try {
    const raw = await fs.readFile(importedSkillsFilePath, 'utf8');
    const parsed = JSON.parse(raw) as ImportedSkillsFile;
    return {
      version: parsed.version ?? 1,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    };
  } catch {
    const empty = createEmptyImportedSkills();
    await fs.writeFile(importedSkillsFilePath, JSON.stringify(empty, null, 2), 'utf8');
    return empty;
  }
}

export async function saveImportedSkills(importedSkillsFilePath: string, skills: Skill[]): Promise<ImportedSkillsFile> {
  const next: ImportedSkillsFile = {
    version: 1,
    updatedAt: new Date().toISOString(),
    skills,
  };

  const tempPath = `${importedSkillsFilePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(next, null, 2), 'utf8');
  await fs.rename(tempPath, importedSkillsFilePath);
  return next;
}
