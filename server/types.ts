import type { Category, Skill } from '../src/types';

export interface SkillMetadataPatch {
  description?: string;
  category?: Category;
  tags?: string[];
  whenToUse?: string[];
}

export interface SkillMetadataFile {
  version: number;
  updatedAt: string;
  skills: Record<string, SkillMetadataPatch>;
}

export interface ScanContext {
  scanRoots: string[];
  metadataFilePath: string;
}

export interface ParsedSkillFile extends Skill {
  relativeKey: string;
}
