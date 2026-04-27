export type SkillFileType = 'md' | 'json' | 'txt';
export type SkillSource = 'codex' | 'cursor' | 'claude' | 'unknown';

export type Category =
  | '编程开发'
  | '内容创作'
  | '数据分析'
  | '产品设计'
  | '效率流程'
  | '商业营销'
  | '其他';

export type SkillStatus = 'active' | 'unrecognized' | 'updating';

export interface SkillDetail {
  whatItDoes: string;
  whenToUse: string[];
  triggerWords: string[];
  rawContent: string;
}

export interface Skill {
  id: string;
  title: string;
  originalTitle?: string;
  contentHash?: string;
  sourcePaths?: string[];
  sourceCount?: number;
  description: string;
  category: Category;
  tags: string[];
  status: SkillStatus;
  icon: string;
  sourcePath: string;
  fileName: string;
  fileType: SkillFileType;
  updatedAt: string;
  scannedAt: string;
  details: SkillDetail;
}

export interface StatsData {
  totalSkills: number;
  totalCategories: number;
  newSinceLastScan: number;
  lastScanTime: string;
}

export type SourceId = 'codex' | 'cursor' | 'claude';
export type SourceScanState = 'detected' | 'empty' | 'unreachable';

export interface SourceScanStatus {
  source: SourceId;
  label: string;
  paths: string[];
  status: SourceScanState;
  skillCount: number;
  scannedSkillCount?: number;
  importedSkillCount?: number;
  lastScannedAt: string;
  message?: string;
}

export interface SourceScanSummary {
  sources: SourceScanStatus[];
  totalDetectedSkills: number;
  scannedAt: string;
}

export interface ScanResult {
  success: boolean;
  totalFound: number;
  newCount: number;
  updatedCount: number;
  failedCount: number;
  scannedAt: string;
  errors: string[];
}

export interface ImportSkillsResult {
  success: boolean;
  importedCount: number;
  totalImportedStored: number;
  totalSkills: number;
  scannedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface SkillUpdatePayload {
  title?: string;
  description?: string;
  category?: Category;
  tags?: string[];
  details?: {
    whenToUse?: string[];
    rawContent?: string;
  };
}

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

export type AppPage = 'skills' | 'map' | 'marketplace' | 'health';

export type MarketplaceAuthor = 'official' | 'community';
export type MarketplaceSourceType = 'github' | 'marketplace' | 'docs';

export interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  category: Category;
  tags: string[];
  author: MarketplaceAuthor;
  installs: number;
  githubPath: string;
  sourceType?: MarketplaceSourceType;
  sourceLabel?: string;
  sourceUrl?: string;
  popularityLabel?: string;
  trendNote?: string;
}

export type HealthGrade = 'excellent' | 'good' | 'needs-work' | 'critical';

export interface FieldCheckResult {
  field: string;
  label: string;
  passed: boolean;
  points: number;
  tip: string;
}

export interface SkillHealthReport {
  skillId: string;
  score: number;
  grade: HealthGrade;
  checks: FieldCheckResult[];
  passedCount: number;
}

export interface SkillEdge {
  sourceId: string;
  targetId: string;
  score: number;
  sharedTags: string[];
}

export interface RecommendationSceneQuery {
  categories: string[];
  tags: string[];
  keywords: string[];
}

export interface RecommendationScene {
  scene_id: string;
  label: string;
  description: string;
  priority: number;
  query: RecommendationSceneQuery;
  reason_template: string;
}

export interface SeedSkillRecord {
  platform: string;
  skill_id: string;
  title_normalized: string;
  display_title: string;
  description_short: string;
  category_l1: string;
  category_refined?: string;
  tags_rule: string[];
  tags_curated: string[];
  scenes_hint: string[];
  recommended_reason_templates: string[];
  capability_summary: string;
  source_path: string;
  health_status_basic: 'complete' | 'partial' | 'unknown';
  language: 'zh' | 'en' | 'mixed' | string;
  install_status: 'installed' | 'imported' | 'detected' | string;
}

export interface SeedSkillRegistry {
  version: number;
  updatedAt: string;
  source: string;
  skills: SeedSkillRecord[];
}

export interface RecommendationCardItem {
  id: string;
  title: string;
  description: string;
  recommendationReason: string;
  sourceLabel: string;
  sourceClassName: string;
  healthLabel: string;
  healthClassName: string;
  tags: string[];
  matchedSkillId: string | null;
}

export interface RecommendationCoverageSummary {
  matchedCount: number;
  incompleteCount: number;
  totalCandidates: number;
}

export interface SceneRecommendationResult {
  scene: RecommendationScene;
  items: RecommendationCardItem[];
  coverage: RecommendationCoverageSummary;
}
