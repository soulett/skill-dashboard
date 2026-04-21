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

export interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  category: Category;
  tags: string[];
  author: MarketplaceAuthor;
  installs: number;
  githubPath: string;
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
