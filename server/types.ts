import type { Category, Skill } from '../src/types';

export interface SkillMetadataPatch {
  displayTitle?: string;
  displayDescription?: string;
  description?: string;
  category?: Category;
  tags?: string[];
  whenToUse?: string[];
  locale?: 'zh-CN';
  translationSource?: 'auto' | 'manual';
  translatedAt?: string;
}

export interface SkillMetadataFile {
  version: number;
  updatedAt: string;
  skills: Record<string, SkillMetadataPatch>;
}

export interface ScanContext {
  scanRoots: string[];
  fallbackScanRoots: string[];
  metadataFilePath: string;
  importedSkillsFilePath: string;
}

export interface ImportedSkillsFile {
  version: number;
  updatedAt: string;
  skills: Skill[];
}

export interface ParsedSkillFile extends Skill {
  relativeKey: string;
}
