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
  eventsFilePath: string;
}

export interface ImportedSkillsFile {
  version: number;
  updatedAt: string;
  skills: Skill[];
}

export interface ParsedSkillFile extends Skill {
  relativeKey: string;
}

export type DashboardEventType =
  | 'home_recommendation_view'
  | 'scene_selected'
  | 'recommendation_clicked'
  | 'skill_detail_opened'
  | 'prompt_recommendation_requested'
  | 'prompt_recommendation_returned'
  | 'prompt_recommendation_clicked'
  | 'prompt_recommendation_fallback';

export interface DashboardEvent {
  id: string;
  type: DashboardEventType;
  createdAt: string;
  sceneId?: string;
  recommendedSkillId?: string;
  matchedSkillId?: string | null;
}
