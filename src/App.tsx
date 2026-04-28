import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BarChart3,
  Bot,
  CheckCircle2,
  Code2,
  FolderSearch,
  GitMerge,
  Layers,
  LayoutDashboard,
  Megaphone,
  Package,
  PenLine,
} from 'lucide-react';
import { api } from './api';
import { AIPathHelpResult, askPathHelp } from './api/ai';
import RightPanel from './components/RightPanel';
import Sidebar from './components/Sidebar';
import SkillCard from './components/SkillCard';
import StatsCard from './components/StatsCard';
import TopBar from './components/TopBar';
import HealthCheck from './components/pages/HealthCheck';
import Marketplace from './components/pages/Marketplace';
import RecommendationHome from './components/pages/RecommendationHome';
import SkillMap from './components/pages/SkillMap';
import { buildSceneRecommendationResult } from './recommendation';
import recommendationScenesData from './data/recommendation-scenes.json';
import skillRegistrySeedData from './data/skill-registry.seed.json';
import {
  AppPage,
  Category,
  RecommendationScene,
  SceneRecommendationResult,
  SeedSkillRegistry,
  Skill,
  SkillSource,
  SourceId,
  SourceScanStatus,
  SourceScanSummary,
  StatsData,
} from './types';
import { formatRelativeTime, inferSkillSource } from './utils';

type FilterCategory = Category | 'All';
type SourceFilter = SkillSource | 'all';
type ImportSource = SourceId;
type ImportUiState = 'idle' | 'success' | 'failed';

const CATEGORY_CONFIG: Array<{ id: FilterCategory; icon: ComponentType<{ className?: string }> }> = [
  { id: 'All', icon: Layers },
  { id: '编程开发', icon: Code2 },
  { id: '内容创作', icon: PenLine },
  { id: '数据分析', icon: BarChart3 },
  { id: '产品设计', icon: LayoutDashboard },
  { id: '效率流程', icon: GitMerge },
  { id: '商业营销', icon: Megaphone },
  { id: '其他', icon: Package },
];

const SKILL_ROOT_GUIDES = [
  {
    id: 'codex',
    name: 'Codex',
    paths: ['~/.codex/skills', 'C:\\Users\\<用户名>\\.codex\\skills'],
  },
  {
    id: 'cursor',
    name: 'Cursor',
    paths: [
      '~/.cursor/skills-cursor',
      '~/.cursor/skills',
      '<workspace>/.cursor/skills',
      'C:\\Users\\<用户名>\\.cursor\\skills-cursor',
      'C:\\Users\\<用户名>\\.cursor\\skills',
      '<workspace>\\.cursor\\skills',
    ],
  },
  {
    id: 'claude',
    name: 'Claude',
    paths: ['~/.claude/skills', 'C:\\Users\\<用户名>\\.claude\\skills'],
  },
] as const;

const SOURCE_LOCATE_STEPS: Record<'windows' | 'macos', string[]> = {
  windows: ['打开“文件资源管理器”', '点击“查看”并勾选“隐藏的项目”', '进入下方候选路径，选择包含 SKILL.md 的目录'],
  macos: ['打开 Finder', '按 Command + Shift + . 显示隐藏文件夹', '按 Shift + Command + G，输入下方候选路径并前往'],
};

const SOURCE_FILTER_CONFIG: Array<{ id: SourceFilter; label: string }> = [
  { id: 'all', label: '全部来源' },
  { id: 'codex', label: 'Codex' },
  { id: 'cursor', label: 'Cursor' },
  { id: 'claude', label: 'Claude' },
  { id: 'unknown', label: '其他' },
];

const MAX_IMPORTED_RAW_CONTENT = 20_000;
const RECOMMENDATION_SCENES = recommendationScenesData.scenes as RecommendationScene[];
const SKILL_REGISTRY_SEED = skillRegistrySeedData as SeedSkillRegistry;
const DEFAULT_PRIMARY_SCENE_ID =
  [...RECOMMENDATION_SCENES]
    .sort((a, b) => a.priority - b.priority)
    .find(scene => scene.is_primary !== false)?.scene_id ?? RECOMMENDATION_SCENES[0]?.scene_id ?? '';

interface LocalImportScanResult {
  skills: Skill[];
  errors: string[];
}

interface DirectoryPickResult {
  mode: 'handle' | 'files';
  directoryHandle?: any;
  files?: File[];
}

function maskPathForDisplay(input: string): string {
  const isPosixStyle = input.startsWith('/') || input.startsWith('~/') || input.startsWith('<workspace>/');
  let output = isPosixStyle ? input : input.replaceAll('/', '\\');

  output = output.replace(/^[A-Za-z]:\\Users\\[^\\]+/i, match => match.replace(/\\[^\\]+$/, '\\<用户名>'));
  output = output.replace(/\\AI-Coding\\skill dashboard/gi, '\\<workspace>');
  output = output.replace(/^local:\\\\(codex|cursor|claude)\\\\[^\\]+\\\\/i, (_m, source) => `local://${source}/<已选目录>/`);

  if (output.startsWith('\\\\') || output.startsWith('/')) {
    output = output.replace(/^\/Users\/[^/]+/i, '/Users/<用户名>');
    output = output.replace(/^\/home\/[^/]+/i, '/home/<用户名>');
  }

  return output;
}

function getPathHelpKnownPaths(source: ImportSource | 'unknown', os: 'windows' | 'macos' | 'linux' | 'unknown'): string[] {
  const basePaths =
    source === 'unknown' ? SKILL_ROOT_GUIDES.flatMap(item => item.paths) : (SKILL_ROOT_GUIDES.find(item => item.id === source)?.paths ?? []);

  const filtered = basePaths.filter(path => {
    if (os === 'windows') return path.includes('\\') || /^[A-Za-z]:/.test(path);
    if (os === 'macos' || os === 'linux') return path.includes('/') && !path.includes('\\');
    return true;
  });

  return [...new Set(filtered)];
}

function parseFrontmatter(raw: string): Record<string, string> {
  const match = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  return match[1]
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, line) => {
      const idx = line.indexOf(':');
      if (idx === -1) return acc;
      acc[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      return acc;
    }, {});
}

function firstDescriptionLine(raw: string): string {
  const contentWithoutFrontmatter = raw.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*/m, '');
  const line = contentWithoutFrontmatter
    .split(/\r?\n/)
    .map(item => item.trim())
    .find(item => item && !item.startsWith('#') && !item.startsWith('-'));
  return line?.slice(0, 140) ?? '待补充描述';
}

function extractTags(raw: string, frontmatter: Record<string, string>): string[] {
  const tagValue = frontmatter.tags;
  if (tagValue) {
    const normalized = tagValue.replace(/^\[|\]$/g, '');
    return normalized
      .split(',')
      .map(item => item.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean)
      .slice(0, 8);
  }

  const text = raw.toLowerCase();
  const candidates = ['api', 'openai', 'browser', 'testing', 'playwright', 'workflow', 'automation', 'plugin', 'cursor', 'codex'];
  return candidates.filter(tag => text.includes(tag)).slice(0, 5);
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function scanLocalSkillsFromDirectory(directoryHandle: any, source: ImportSource, maxDepth = 4): Promise<LocalImportScanResult> {
  const skills: Skill[] = [];
  const errors: string[] = [];

  async function walk(handle: any, relativeParts: string[], depth: number): Promise<void> {
    if (depth > maxDepth) return;
    for await (const entry of handle.values()) {
      if (entry.kind === 'directory') {
        await walk(entry, [...relativeParts, entry.name], depth + 1);
        continue;
      }

      if (entry.kind !== 'file' || entry.name.toLowerCase() !== 'skill.md') continue;

      const relativePath = [...relativeParts, entry.name].join('/');
      try {
        const file = await entry.getFile();
        const raw = await file.text();
        const rawForUpload = raw.length > MAX_IMPORTED_RAW_CONTENT ? raw.slice(0, MAX_IMPORTED_RAW_CONTENT) : raw;
        const frontmatter = parseFrontmatter(raw);
        const title =
          frontmatter.title ??
          frontmatter.name ??
          raw.match(/^#\s+(.+)$/m)?.[1]?.trim() ??
          relativeParts.at(-1) ??
          'Untitled Skill';
        const description = frontmatter.description ?? firstDescriptionLine(raw);
        const tags = extractTags(raw, frontmatter);
        const normalizedRaw = raw.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim().toLowerCase();
        const contentHash = await sha256Hex(normalizedRaw);
        const now = new Date().toISOString();

        skills.push({
          id: `local-import/${contentHash.slice(0, 24)}`,
          title,
          description,
          category: '其他',
          tags,
          status: 'active',
          icon: 'Cpu',
          sourcePath: `local://${source}/${directoryHandle.name}/${relativePath}`,
          fileName: entry.name,
          fileType: 'md',
          updatedAt: file.lastModified ? new Date(file.lastModified).toISOString() : now,
          scannedAt: now,
          contentHash,
          details: {
            whatItDoes: description,
            whenToUse: [],
            triggerWords: tags,
            rawContent: rawForUpload,
          },
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        errors.push(`${relativePath}: ${reason}`);
      }
    }
  }

  await walk(directoryHandle, [], 0);
  return { skills, errors };
}

async function scanLocalSkillsFromFileList(files: File[], source: ImportSource): Promise<LocalImportScanResult> {
  const skills: Skill[] = [];
  const errors: string[] = [];

  const skillFiles = files.filter(file => file.name.toLowerCase() === 'skill.md');

  for (const file of skillFiles) {
    const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    try {
      const raw = await file.text();
      const rawForUpload = raw.length > MAX_IMPORTED_RAW_CONTENT ? raw.slice(0, MAX_IMPORTED_RAW_CONTENT) : raw;
      const frontmatter = parseFrontmatter(raw);
      const pathParts = relativePath.split('/').filter(Boolean);
      const title =
        frontmatter.title ??
        frontmatter.name ??
        raw.match(/^#\s+(.+)$/m)?.[1]?.trim() ??
        pathParts.at(-2) ??
        'Untitled Skill';
      const description = frontmatter.description ?? firstDescriptionLine(raw);
      const tags = extractTags(raw, frontmatter);
      const normalizedRaw = raw.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim().toLowerCase();
      const contentHash = await sha256Hex(normalizedRaw);
      const now = new Date().toISOString();

      skills.push({
        id: `local-import/${contentHash.slice(0, 24)}`,
        title,
        description,
        category: '其他',
        tags,
        status: 'active',
        icon: 'Cpu',
        sourcePath: `local://${source}/uploaded/${relativePath}`,
        fileName: file.name,
        fileType: 'md',
        updatedAt: file.lastModified ? new Date(file.lastModified).toISOString() : now,
        scannedAt: now,
        contentHash,
        details: {
          whatItDoes: description,
          whenToUse: [],
          triggerWords: tags,
          rawContent: rawForUpload,
        },
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      errors.push(`${relativePath}: ${reason}`);
    }
  }

  return { skills, errors };
}

function pickDirectoryWithFileInput(): Promise<File[]> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.appendChild(input);

    const cleanup = () => {
      input.remove();
    };

    input.addEventListener(
      'change',
      () => {
        const files = Array.from(input.files ?? []);
        cleanup();
        if (files.length === 0) {
          reject(new Error('未选择目录'));
          return;
        }
        resolve(files);
      },
      { once: true },
    );

    input.addEventListener(
      'cancel',
      () => {
        cleanup();
        reject(new Error('用户取消了目录选择'));
      },
      { once: true },
    );

    input.click();
  });
}

async function pickDirectoryForImport(): Promise<DirectoryPickResult> {
  const picker = (window as Window & { showDirectoryPicker?: () => Promise<any> }).showDirectoryPicker;
  if (picker) {
    try {
      const directoryHandle = await picker();
      return { mode: 'handle', directoryHandle };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/aborted|user canceled|cancelled|The user aborted a request/i.test(message)) {
        throw error;
      }
    }
  }

  const files = await pickDirectoryWithFileInput();
  return { mode: 'files', files };
}

function getSourceStatusStyle(status: SourceScanStatus['status']) {
  if (status === 'detected') {
    return {
      chip: 'bg-success/12 text-success border-success/30',
      dot: 'bg-success',
      label: '已识别',
    };
  }

  if (status === 'empty') {
    return {
      chip: 'bg-warning/12 text-warning border-warning/30',
      dot: 'bg-warning',
      label: '未发现',
    };
  }

  return {
    chip: 'bg-surface-bright text-on-surface-muted border-outline-subtle',
    dot: 'bg-on-surface-muted/60',
    label: '待连接',
  };
}

function buildFallbackSourceSummary(): SourceScanSummary {
  const scannedAt = new Date().toISOString();
  const sources: SourceScanStatus[] = SKILL_ROOT_GUIDES.map(item => ({
    source: item.id,
    label: item.name,
    paths: [...item.paths],
    status: 'unreachable',
    skillCount: 0,
    scannedSkillCount: 0,
    importedSkillCount: 0,
    lastScannedAt: scannedAt,
    message: '暂未获取到扫描状态，请稍后重试。',
  }));

  return {
    sources,
    totalDetectedSkills: 0,
    scannedAt,
  };
}

function patchConnectedSourceSummary(
  previous: SourceScanSummary | null,
  source: ImportSource,
  importedCount: number,
): SourceScanSummary {
  const base = previous ?? buildFallbackSourceSummary();
  const nextScannedAt = new Date().toISOString();
  const nextSources = base.sources.map(item => {
    if (item.source !== source) return item;

    const nextCount = Math.max(item.skillCount ?? 0, importedCount);
    return {
      ...item,
      status: 'detected' as const,
      skillCount: nextCount,
      scannedSkillCount: nextCount,
      importedSkillCount: nextCount,
      lastScannedAt: nextScannedAt,
      message: '已接入',
    };
  });

  return {
    ...base,
    sources: nextSources,
    totalDetectedSkills: nextSources.reduce((sum, item) => sum + (item.skillCount ?? 0), 0),
    scannedAt: nextScannedAt,
  };
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>('home');
  const [selectedSceneId, setSelectedSceneId] = useState(DEFAULT_PRIMARY_SCENE_ID);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [sourceScanSummary, setSourceScanSummary] = useState<SourceScanSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('All');
  const [selectedSource, setSelectedSource] = useState<SourceFilter>('all');
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [autoEditSkillId, setAutoEditSkillId] = useState<string | null>(null);
  const [suppressSkillSelectUntil, setSuppressSkillSelectUntil] = useState(0);
  const [loading, setLoading] = useState(true);
  const [importingSource, setImportingSource] = useState<ImportSource | null>(null);
  const [importStateBySource, setImportStateBySource] = useState<Record<ImportSource, { state: ImportUiState; importedCount: number }>>({
    codex: { state: 'idle', importedCount: 0 },
    cursor: { state: 'idle', importedCount: 0 },
    claude: { state: 'idle', importedCount: 0 },
  });
  const [manualImportPathBySource, setManualImportPathBySource] = useState<Record<ImportSource, string>>({
    codex: '',
    cursor: '',
    claude: '',
  });
  const [localizeFeedback, setLocalizeFeedback] = useState<string | null>(null);
  const [importFailures, setImportFailures] = useState<string[]>([]);
  const [showImportFailures, setShowImportFailures] = useState(false);
  const [pathHelpQuery, setPathHelpQuery] = useState('');
  const [pathHelpSource, setPathHelpSource] = useState<ImportSource | 'unknown'>('unknown');
  const [pathHelpOs, setPathHelpOs] = useState<'windows' | 'macos' | 'linux' | 'unknown'>('unknown');
  const [pathHelpLoading, setPathHelpLoading] = useState(false);
  const [pathHelpResult, setPathHelpResult] = useState<AIPathHelpResult | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboardLoadError, setDashboardLoadError] = useState<string | null>(null);
  const [isPromptModeOpen, setIsPromptModeOpen] = useState(false);
  const [taskPrompt, setTaskPrompt] = useState('');
  const [isPromptMatching, setIsPromptMatching] = useState(false);
  const [promptRecommendations, setPromptRecommendations] = useState<SceneRecommendationResult['items']>([]);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [promptFallbackUsed, setPromptFallbackUsed] = useState(false);
  const [promptRequestState, setPromptRequestState] = useState<'idle' | 'success' | 'empty' | 'error'>('idle');
  const [promptElapsedSec, setPromptElapsedSec] = useState(0);
  const promptTimerRef = useRef<number | null>(null);

  const loadDashboardData = async () => {
    const [skillsRes, statsRes, sourceScanRes] = await Promise.all([
      api.getSkills(),
      api.getStats(),
      api.getSourceScanSummary(),
    ]);
    if (skillsRes.success) setSkills(skillsRes.data.skills);
    if (statsRes.success) {
      setStatsData(statsRes.data);
    } else if (skillsRes.success) {
      const fallbackStats: StatsData = {
        totalSkills: skillsRes.data.skills.length,
        totalCategories: new Set(skillsRes.data.skills.map(skill => skill.category)).size,
        newSinceLastScan: 0,
        lastScanTime: new Date().toISOString(),
      };
      setStatsData(fallbackStats);
    }
    setSourceScanSummary(sourceScanRes.success ? sourceScanRes.data : buildFallbackSourceSummary());
    const errors = [skillsRes, statsRes, sourceScanRes]
      .filter(item => !item.success)
      .map(item => ('error' in item ? item.error : undefined))
      .filter((item): item is string => Boolean(item));
    setDashboardLoadError(errors.length > 0 ? errors.join('；') : null);

    return {
      skillCount: skillsRes.success ? skillsRes.data.skills.length : 0,
      sourceCount: sourceScanRes.success ? sourceScanRes.data.totalDetectedSkills : 0,
      hasErrors: errors.length > 0,
    };
  };

  useEffect(() => {
    loadDashboardData().finally(() => setLoading(false));
  }, []);

  const filteredSkills = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return skills.filter(skill => {
      const matchesCategory = selectedCategory === 'All' || skill.category === selectedCategory;
      const source = inferSkillSource(skill.sourcePath);
      const matchesSource = selectedSource === 'all' || source === selectedSource;
      const matchesQuery =
        !q ||
        skill.title.toLowerCase().includes(q) ||
        skill.originalTitle?.toLowerCase().includes(q) ||
        skill.description.toLowerCase().includes(q) ||
        skill.tags.some(tag => tag.toLowerCase().includes(q));

      return matchesCategory && matchesSource && matchesQuery;
    });
  }, [searchQuery, selectedCategory, selectedSource, skills]);

  const selectedScene = useMemo(
    () =>
      RECOMMENDATION_SCENES.find(scene => scene.scene_id === selectedSceneId) ??
      RECOMMENDATION_SCENES.find(scene => scene.scene_id === DEFAULT_PRIMARY_SCENE_ID) ??
      RECOMMENDATION_SCENES[0],
    [selectedSceneId],
  );

  const recommendationResult = useMemo<SceneRecommendationResult | null>(() => {
    if (!selectedScene) return null;
    return buildSceneRecommendationResult(selectedScene, SKILL_REGISTRY_SEED.skills, skills);
  }, [selectedScene, skills]);

  const selectedSkill = skills.find(skill => skill.id === selectedSkillId) ?? null;
  const hasImportedSkills = skills.length > 0;
  const panelEnabled = currentPage === 'home' || currentPage === 'skills';

  const handleSkillUpdate = (updatedSkill: Skill) => {
    setSkills(previous => previous.map(skill => (skill.id === updatedSkill.id ? updatedSkill : skill)));
    setAutoEditSkillId(null);
  };

  const handleScan = async () => {
    await api.triggerScan();
    await loadDashboardData();
  };

  const trackDashboardEvent = async (payload: {
    type:
      | 'home_recommendation_view'
      | 'scene_selected'
      | 'recommendation_clicked'
      | 'skill_detail_opened'
      | 'prompt_recommendation_requested'
      | 'prompt_recommendation_returned'
      | 'prompt_recommendation_clicked'
      | 'prompt_recommendation_fallback';
    sceneId?: string;
    recommendedSkillId?: string;
    matchedSkillId?: string | null;
  }) => {
    await api.trackEvent(payload);
  };

  useEffect(() => {
    if (currentPage !== 'home' || !hasImportedSkills) return;
    trackDashboardEvent({
      type: 'home_recommendation_view',
      sceneId: selectedScene?.scene_id,
    }).catch(() => undefined);
  }, [currentPage, hasImportedSkills, selectedScene?.scene_id]);

  const finalizeImportedSource = async (
    source: ImportSource,
    importedCount: number,
    options?: { mode?: 'default' | 'manual-path' | 'directory-picker'; failureCount?: number },
  ) => {
    const mode = options?.mode ?? 'default';
    const failureCount = options?.failureCount ?? 0;
    const localizeResult = await api.localizeAllSkills();
    const refreshed = await loadDashboardData();

    if (importedCount > 0 && refreshed.skillCount === 0 && refreshed.sourceCount === 0) {
      window.location.reload();
      return;
    }

    setImportStateBySource(previous => ({
      ...previous,
      [source]: { state: 'success', importedCount },
    }));

    if (localizeResult.success) {
      const updatedCount = 'updatedCount' in localizeResult.data ? localizeResult.data.updatedCount : localizeResult.data.total;
      const sourceLabel = SKILL_ROOT_GUIDES.find(item => item.id === source)?.name ?? source;
      if (mode === 'default') {
        setLocalizeFeedback(
          `已连接 ${sourceLabel} 默认路径，并识别到 ${importedCount} 条 skills。它们会出现在首页推荐和技能库里；如果这些条目之前已经被系统扫描到，不会重复新增卡片。`,
        );
      } else if (mode === 'manual-path') {
        setLocalizeFeedback(
          `已从手动路径接入 ${sourceLabel}，识别到 ${importedCount} 条 skills。它们会合并进现有技能库，不会重复新增同一条能力。`,
        );
      } else {
        const localizedSummary =
          updatedCount > 0
            ? `已导入 ${importedCount} 条 skills，并补充了 ${updatedCount} 条中文展示。`
            : `已导入 ${importedCount} 条 skills，当前中文展示层已经是最新状态。`;
        const failureSummary = failureCount > 0 ? ` 另外有 ${failureCount} 个文件没有导入成功。` : '';
        setLocalizeFeedback(`${localizedSummary}${failureSummary}`);
      }
    } else {
      const localizeError = 'error' in localizeResult && typeof localizeResult.error === 'string' ? localizeResult.error : undefined;
      setLocalizeFeedback(`导入 ${importedCount} 条成功，但中文展示更新失败：${localizeError ?? '未知错误'}`);
    }
    setCurrentPage('home');
    if (DEFAULT_PRIMARY_SCENE_ID) {
      setSelectedSceneId(DEFAULT_PRIMARY_SCENE_ID);
    }
  };

  const markImportFailure = (source: ImportSource, message: string) => {
    setLocalizeFeedback(message);
    setImportStateBySource(previous => ({
      ...previous,
      [source]: { state: 'failed', importedCount: 0 },
    }));
  };

  const beginImportFlow = (source: ImportSource) => {
    if (importingSource) return false;
    const sourceLabel = SKILL_ROOT_GUIDES.find(item => item.id === source)?.name ?? source;
    setImportingSource(source);
    setImportFailures([]);
    setShowImportFailures(false);
    setLocalizeFeedback(`正在连接 ${sourceLabel}，请稍等...`);
    return true;
  };

  const finishImportFlow = () => {
    setImportingSource(null);
  };

  const handleImportSourceDefaults = async (source: ImportSource) => {
    if (!beginImportFlow(source)) return;

    try {
      const importResult = await api.importSource(source);
      if (!importResult.success) {
        const errorMessage = 'error' in importResult && typeof importResult.error === 'string' ? importResult.error : '默认路径导入失败，请稍后重试。';
        markImportFailure(source, errorMessage);
        return;
      }

      setImportStateBySource(previous => ({
        ...previous,
        [source]: { state: 'success', importedCount: importResult.data.importedCount },
      }));
      setSourceScanSummary(previous => patchConnectedSourceSummary(previous, source, importResult.data.importedCount));
      setLocalizeFeedback(`已连接 ${SKILL_ROOT_GUIDES.find(item => item.id === source)?.name ?? source}，正在同步中文展示与统计...`);
      try {
        await finalizeImportedSource(source, importResult.data.importedCount, { mode: 'default' });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setLocalizeFeedback(`已连接成功，但后续刷新失败：${message}`);
      }
    } finally {
      finishImportFlow();
    }
  };

  const handleImportSourceManualPath = async (source: ImportSource) => {
    if (!beginImportFlow(source)) return;

    try {
      const inputPath = manualImportPathBySource[source].trim();
      if (!inputPath) {
        markImportFailure(source, '请先输入一个明确的 skills 目录路径。');
        return;
      }

      const importResult = await api.importSourcePath(source, inputPath);
      if (!importResult.success) {
        const errorMessage = 'error' in importResult && typeof importResult.error === 'string' ? importResult.error : '手动路径导入失败，请检查路径后重试。';
        markImportFailure(source, errorMessage);
        return;
      }

      setImportStateBySource(previous => ({
        ...previous,
        [source]: { state: 'success', importedCount: importResult.data.importedCount },
      }));
      setSourceScanSummary(previous => patchConnectedSourceSummary(previous, source, importResult.data.importedCount));
      setLocalizeFeedback(`已连接 ${SKILL_ROOT_GUIDES.find(item => item.id === source)?.name ?? source}，正在同步中文展示与统计...`);
      try {
        await finalizeImportedSource(source, importResult.data.importedCount, { mode: 'manual-path' });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setLocalizeFeedback(`已连接成功，但后续刷新失败：${message}`);
      }
    } finally {
      finishImportFlow();
    }
  };

  const handleImportLocalDirectory = async (source: ImportSource) => {
    if (!beginImportFlow(source)) return;

    try {
      const picked = await pickDirectoryForImport();
      const scanned =
        picked.mode === 'handle'
          ? await scanLocalSkillsFromDirectory(picked.directoryHandle, source, 4)
          : await scanLocalSkillsFromFileList(picked.files ?? [], source);
      setImportFailures(scanned.errors);

      if (scanned.skills.length === 0) {
        markImportFailure(source, '未发现可导入的 SKILL.md。请直接选择包含 skills 的目录，而不是更上层的大目录。');
        return;
      }

      const importResult = await api.importSkills(scanned.skills);
      if (!importResult.success) {
        const importError = 'error' in importResult && typeof importResult.error === 'string' ? importResult.error : undefined;
        markImportFailure(source, importError ?? '本地导入失败，请稍后重试。');
        return;
      }

      setImportStateBySource(previous => ({
        ...previous,
        [source]: { state: 'success', importedCount: scanned.skills.length },
      }));
      setSourceScanSummary(previous => patchConnectedSourceSummary(previous, source, scanned.skills.length));
      setLocalizeFeedback(`已导入 ${scanned.skills.length} 条 skills，正在同步中文展示与统计...`);
      try {
        await finalizeImportedSource(source, scanned.skills.length, {
          mode: 'directory-picker',
          failureCount: scanned.errors.length,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setLocalizeFeedback(`已导入成功，但后续刷新失败：${message}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/aborted|user canceled|cancelled|The user aborted a request/i.test(message)) {
        markImportFailure(source, `导入没有完成：${message}`);
      }
    } finally {
      finishImportFlow();
    }
  };

  const handleAskPathHelp = async () => {
    if (!pathHelpQuery.trim()) return;
    setPathHelpLoading(true);
    const knownPaths = getPathHelpKnownPaths(pathHelpSource, pathHelpOs);
    const result = await askPathHelp({
      message: pathHelpQuery.trim(),
      source: pathHelpSource,
      os: pathHelpOs,
      knownPaths,
      lastError: importFailures[0] ?? '',
    });
    setPathHelpResult(result);
    setPathHelpLoading(false);
  };

  const handleInstalled = (newSkill: Skill) => {
    setSkills(previous => [...previous, newSkill]);
  };

  const handleNavigateToSkill = (skillId: string, editMode = false) => {
    setCurrentPage('skills');
    setSelectedSkillId(skillId);
    setSidebarOpen(false);
    setAutoEditSkillId(editMode ? skillId : null);
    setSuppressSkillSelectUntil(0);
  };

  const closeSkillPanel = () => {
    setSelectedSkillId(null);
    setAutoEditSkillId(null);
    setSuppressSkillSelectUntil(Date.now() + 220);
  };

  const navigatePage = (page: AppPage) => {
    setCurrentPage(page);
    setSidebarOpen(false);
    if (page !== 'skills' && page !== 'home') setSelectedSkillId(null);
    setAutoEditSkillId(null);
  };

  const handleRecommendationClick = (recommendedSkillId: string, matchedSkillId: string | null) => {
    trackDashboardEvent({
      type: 'recommendation_clicked',
      sceneId: selectedScene?.scene_id,
      recommendedSkillId,
      matchedSkillId: matchedSkillId ?? null,
    }).catch(() => undefined);
    if (!matchedSkillId) return;
    trackDashboardEvent({
      type: 'skill_detail_opened',
      sceneId: selectedScene?.scene_id,
      recommendedSkillId,
      matchedSkillId,
    }).catch(() => undefined);
    setAutoEditSkillId(null);
    setSelectedSkillId(matchedSkillId);
  };

  const handlePromptMatch = async () => {
    const prompt = taskPrompt.trim();
    if (!prompt || isPromptMatching) return;
    setIsPromptMatching(true);
    setPromptError(null);
    setPromptRecommendations([]);
    setPromptRequestState('idle');
    setPromptElapsedSec(0);
    if (promptTimerRef.current) window.clearInterval(promptTimerRef.current);
    promptTimerRef.current = window.setInterval(() => {
      setPromptElapsedSec(prev => prev + 1);
    }, 1000);
    trackDashboardEvent({ type: 'prompt_recommendation_requested', sceneId: selectedScene?.scene_id }).catch(() => undefined);
    try {
      const response = await api.recommendByPrompt(prompt, 5);
      if (!response.success) {
        setPromptError('error' in response && response.error ? response.error : '任务匹配失败，请稍后重试。');
        setPromptRequestState('error');
        return;
      }
      setPromptRecommendations(response.data.items);
      setPromptFallbackUsed(response.data.fallbackUsed);
      if (!response.data.items || response.data.items.length === 0) {
        setPromptError('暂时没有匹配到可展示的技能，请换一种更具体的任务描述再试一次。');
        setPromptRequestState('empty');
      } else {
        setPromptRequestState('success');
      }
      trackDashboardEvent({ type: 'prompt_recommendation_returned', sceneId: selectedScene?.scene_id }).catch(() => undefined);
      if (response.data.fallbackUsed) {
        trackDashboardEvent({ type: 'prompt_recommendation_fallback', sceneId: selectedScene?.scene_id }).catch(() => undefined);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes('failed to fetch')) {
        setPromptError('网络请求失败（Failed to fetch）。请确认访问地址是 http://127.0.0.1:3010，并检查后端 http://127.0.0.1:3210 是否在线。');
      } else {
        setPromptError(message || '任务匹配失败，请稍后重试。');
      }
      setPromptRequestState('error');
    } finally {
      setIsPromptMatching(false);
      if (promptTimerRef.current) {
        window.clearInterval(promptTimerRef.current);
        promptTimerRef.current = null;
      }
    }
  };

  useEffect(() => {
    return () => {
      if (promptTimerRef.current) {
        window.clearInterval(promptTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-surface text-on-surface flex">
      <Sidebar
        currentPage={currentPage}
        onNavigate={navigatePage}
        skillCount={skills.length}
        onScan={handleScan}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col lg:ml-[220px]">
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onMenuToggle={() => setSidebarOpen(open => !open)}
          searchDisabled={currentPage !== 'skills'}
          searchPlaceholder={currentPage === 'skills' ? '搜索 skill、标签或使用场景' : '去技能库里搜索本地 skills'}
        />

        <main className={`flex-1 pt-[56px] transition-all duration-300 ${selectedSkill && panelEnabled ? 'lg:mr-[420px]' : ''}`}>
          <AnimatePresence mode="sync">
            {currentPage === 'home' && (
              <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <HomePage
                  hasImportedSkills={hasImportedSkills}
                  scenes={RECOMMENDATION_SCENES}
                  selectedSceneId={selectedSceneId}
                  recommendationResult={recommendationResult}
                  sourceScanSummary={sourceScanSummary}
                  localizeFeedback={localizeFeedback}
                  dashboardLoadError={dashboardLoadError}
                  detectedSkillCount={skills.length}
                  onSceneChange={sceneId => {
                    setSelectedSceneId(sceneId);
                    trackDashboardEvent({ type: 'scene_selected', sceneId }).catch(() => undefined);
                  }}
                  onRecommendationClick={handleRecommendationClick}
                  promptModeOpen={isPromptModeOpen}
                  taskPrompt={taskPrompt}
                  promptMatching={isPromptMatching}
                  promptRecommendations={promptRecommendations}
                  promptError={promptError}
                  promptFallbackUsed={promptFallbackUsed}
                  promptRequestState={promptRequestState}
                  promptElapsedSec={promptElapsedSec}
                  onTogglePromptMode={() => setIsPromptModeOpen(value => !value)}
                  onTaskPromptChange={setTaskPrompt}
                  onPromptMatch={handlePromptMatch}
                  onPromptRecommendationClick={(recommendedSkillId, matchedSkillId) => {
                    trackDashboardEvent({
                      type: 'prompt_recommendation_clicked',
                      sceneId: selectedScene?.scene_id,
                      recommendedSkillId,
                      matchedSkillId: matchedSkillId ?? null,
                    }).catch(() => undefined);
                    handleRecommendationClick(recommendedSkillId, matchedSkillId);
                  }}
                  onNavigateToImport={() => navigatePage('import')}
                  onNavigateToLibrary={() => navigatePage('skills')}
                />
              </motion.div>
            )}

            {currentPage === 'import' && (
              <motion.div key="import" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ImportSourcesPage
                  hasImportedSkills={hasImportedSkills}
                  sourceScanSummary={sourceScanSummary}
                  statsData={statsData}
                  importingSource={importingSource}
                  importFailures={importFailures}
                  showImportFailures={showImportFailures}
                  importStateBySource={importStateBySource}
                  localizeFeedback={localizeFeedback}
                  dashboardLoadError={dashboardLoadError}
                  pathHelpQuery={pathHelpQuery}
                  pathHelpSource={pathHelpSource}
                  pathHelpOs={pathHelpOs}
                  pathHelpLoading={pathHelpLoading}
                  pathHelpResult={pathHelpResult}
                  manualImportPathBySource={manualImportPathBySource}
                  onManualImportPathChange={(source, value) =>
                    setManualImportPathBySource(previous => ({
                      ...previous,
                      [source]: value,
                    }))
                  }
                  onImportSourceDefaults={handleImportSourceDefaults}
                  onImportSourceManualPath={handleImportSourceManualPath}
                  onImportLocalDirectory={handleImportLocalDirectory}
                  onToggleImportFailures={() => setShowImportFailures(value => !value)}
                  onPathHelpQueryChange={setPathHelpQuery}
                  onPathHelpSourceChange={setPathHelpSource}
                  onPathHelpOsChange={setPathHelpOs}
                  onAskPathHelp={handleAskPathHelp}
                  onNavigateHome={() => navigatePage('home')}
                />
              </motion.div>
            )}

            {currentPage === 'skills' && (
              <motion.div key="skills" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <SkillLibraryPage
                  skills={skills}
                  filteredSkills={filteredSkills}
                  searchQuery={searchQuery}
                  selectedCategory={selectedCategory}
                  selectedSource={selectedSource}
                  selectedSkillId={selectedSkillId}
                  loading={loading}
                  onCategoryChange={category => {
                    setSelectedCategory(category);
                    setSelectedSkillId(null);
                    setAutoEditSkillId(null);
                  }}
                  onSourceChange={source => {
                    setSelectedSource(source);
                    setSelectedSkillId(null);
                    setAutoEditSkillId(null);
                  }}
                  onSkillSelect={id => {
                    if (Date.now() < suppressSkillSelectUntil) return;
                    setAutoEditSkillId(null);
                    setSelectedSkillId(previous => (previous === id ? null : id));
                  }}
                  onClearSelection={closeSkillPanel}
                  onNavigateToImport={() => navigatePage('import')}
                />
              </motion.div>
            )}

            {currentPage === 'health' && (
              <motion.div key="health" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <HealthCheck skills={skills} onNavigateToSkill={handleNavigateToSkill} onSkillPatched={handleSkillUpdate} />
              </motion.div>
            )}

            {currentPage === 'marketplace' && (
              <motion.div key="marketplace" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Marketplace installedSkills={skills} onInstalled={handleInstalled} />
              </motion.div>
            )}

            {currentPage === 'map' && (
              <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <SkillMap skills={skills} onNavigateToSkill={id => handleNavigateToSkill(id)} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {panelEnabled && (
        <RightPanel
          skill={selectedSkill}
          onClose={closeSkillPanel}
          onSkillUpdate={handleSkillUpdate}
          autoEdit={autoEditSkillId === selectedSkillId && autoEditSkillId !== null}
          onAutoEditConsumed={() => setAutoEditSkillId(null)}
        />
      )}
    </div>
  );
}

function FeedbackBanner({ message, tone }: { message: string; tone: 'success' | 'warning' }) {
  const classes =
    tone === 'success'
      ? 'border-success/30 bg-success/10 text-success'
      : 'border-warning/30 bg-warning/10 text-warning';
  return <div className={`rounded-lg border px-3 py-2 text-[12px] ${classes}`}>{message}</div>;
}

function HomePage({
  hasImportedSkills,
  scenes,
  selectedSceneId,
  recommendationResult,
  sourceScanSummary,
  localizeFeedback,
  dashboardLoadError,
  detectedSkillCount,
  promptModeOpen,
  taskPrompt,
  promptMatching,
  promptRecommendations,
  promptError,
  promptFallbackUsed,
  promptRequestState,
  promptElapsedSec,
  onTogglePromptMode,
  onTaskPromptChange,
  onPromptMatch,
  onSceneChange,
  onRecommendationClick,
  onPromptRecommendationClick,
  onNavigateToImport,
  onNavigateToLibrary,
}: {
  hasImportedSkills: boolean;
  scenes: RecommendationScene[];
  selectedSceneId: string;
  recommendationResult: SceneRecommendationResult | null;
  sourceScanSummary: SourceScanSummary | null;
  localizeFeedback: string | null;
  dashboardLoadError: string | null;
  detectedSkillCount: number;
  promptModeOpen: boolean;
  taskPrompt: string;
  promptMatching: boolean;
  promptRecommendations: SceneRecommendationResult['items'];
  promptError: string | null;
  promptFallbackUsed: boolean;
  promptRequestState: 'idle' | 'success' | 'empty' | 'error';
  promptElapsedSec: number;
  onTogglePromptMode: () => void;
  onTaskPromptChange: (value: string) => void;
  onPromptMatch: () => void;
  onSceneChange: (sceneId: string) => void;
  onRecommendationClick: (recommendedSkillId: string, matchedSkillId: string | null) => void;
  onPromptRecommendationClick: (recommendedSkillId: string, matchedSkillId: string | null) => void;
  onNavigateToImport: () => void;
  onNavigateToLibrary: () => void;
}) {
  const connectedSourceCount = sourceScanSummary?.sources.filter(source => source.status === 'detected').length ?? 0;

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-4 space-y-3">
        {localizeFeedback && <FeedbackBanner message={localizeFeedback} tone="success" />}
        {dashboardLoadError && <FeedbackBanner message={`数据加载不完整：${dashboardLoadError}`} tone="warning" />}
      </div>

      {!hasImportedSkills ? (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[28px] border border-outline-subtle bg-surface-card/80 p-6 sm:p-8"
        >
          <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-primary">推荐前的准备</p>
          <h1 className="max-w-3xl font-display text-[2.2rem] leading-[1.02] text-on-surface sm:text-[3.2rem]">
            还没有识别到本地 skills，
            <br />
            先连接你的本地来源。
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-on-surface-variant sm:text-[15px]">
            Skill Dashboard 的推荐建立在你本地已经安装的 skills 之上。先导入来源，系统才能根据真实能力资产给出任务推荐。
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={onNavigateToImport}
              className="rounded-xl border border-primary/35 bg-primary px-4 py-2.5 text-[14px] font-medium text-[#071318] transition-opacity hover:opacity-90"
            >
              去连接本地来源
            </button>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {(sourceScanSummary?.sources ?? SKILL_ROOT_GUIDES.map(item => ({
              source: item.id,
              label: item.name,
              paths: item.paths,
              status: 'unreachable' as const,
              skillCount: 0,
              lastScannedAt: new Date().toISOString(),
            }))).map(source => {
              const style = getSourceStatusStyle(source.status);
              return (
                <div key={source.source} className="rounded-2xl border border-outline-subtle bg-surface-bright/70 p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[14px] font-medium text-on-surface">{source.label}</span>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${style.chip}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                      {style.label}
                    </span>
                  </div>
                  <div className="text-[22px] font-mono font-semibold text-on-surface">{source.skillCount ?? 0}</div>
                  <div className="mt-1 text-[11px] text-on-surface-muted">当前识别到的技能数</div>
                </div>
              );
            })}
          </div>
        </motion.section>
      ) : (
        <>
          {recommendationResult && (
            <RecommendationHome
              scenes={scenes}
              selectedSceneId={selectedSceneId}
              result={recommendationResult}
              detectedSkillCount={detectedSkillCount}
              promptModeOpen={promptModeOpen}
              taskPrompt={taskPrompt}
              promptMatching={promptMatching}
              promptRecommendations={promptRecommendations}
              promptError={promptError}
              promptFallbackUsed={promptFallbackUsed}
              promptRequestState={promptRequestState}
              promptElapsedSec={promptElapsedSec}
              onTogglePromptMode={onTogglePromptMode}
              onTaskPromptChange={onTaskPromptChange}
              onPromptMatch={onPromptMatch}
              onSceneChange={onSceneChange}
              onRecommendationClick={onRecommendationClick}
              onPromptRecommendationClick={onPromptRecommendationClick}
            />
          )}

          <section className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-outline-subtle bg-surface-card/70 p-4">
              <div className="text-[12px] uppercase tracking-[0.1em] text-on-surface-muted">已识别技能</div>
              <div className="mt-2 text-[28px] font-mono text-on-surface">{detectedSkillCount}</div>
              <p className="mt-1 text-[12px] text-on-surface-muted">推荐基于真实本地能力资产，不是通用模板。</p>
            </div>
            <div className="rounded-2xl border border-outline-subtle bg-surface-card/70 p-4">
              <div className="text-[12px] uppercase tracking-[0.1em] text-on-surface-muted">已接入来源</div>
              <div className="mt-2 text-[28px] font-mono text-on-surface">{connectedSourceCount}</div>
              <p className="mt-1 text-[12px] text-on-surface-muted">可以继续补充 Codex、Cursor 或 Claude 的来源目录。</p>
            </div>
            <div className="rounded-2xl border border-outline-subtle bg-surface-card/70 p-4">
              <div className="text-[12px] uppercase tracking-[0.1em] text-on-surface-muted">下一步</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={onNavigateToLibrary}
                  className="rounded-lg border border-outline-variant bg-surface-bright px-3 py-2 text-[13px] text-on-surface transition-colors hover:border-outline"
                >
                  去技能库浏览
                </button>
                <button
                  onClick={onNavigateToImport}
                  className="rounded-lg border border-primary/30 bg-primary/8 px-3 py-2 text-[13px] text-primary transition-colors hover:bg-primary/12"
                >
                  管理来源
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function ImportSourcesPage({
  hasImportedSkills,
  sourceScanSummary,
  statsData,
  importingSource,
  importFailures,
  showImportFailures,
  importStateBySource,
  localizeFeedback,
  dashboardLoadError,
  pathHelpQuery,
  pathHelpSource,
  pathHelpOs,
  pathHelpLoading,
  pathHelpResult,
  manualImportPathBySource,
  onManualImportPathChange,
  onImportSourceDefaults,
  onImportSourceManualPath,
  onImportLocalDirectory,
  onToggleImportFailures,
  onPathHelpQueryChange,
  onPathHelpSourceChange,
  onPathHelpOsChange,
  onAskPathHelp,
  onNavigateHome,
}: {
  hasImportedSkills: boolean;
  sourceScanSummary: SourceScanSummary | null;
  statsData: StatsData | null;
  importingSource: ImportSource | null;
  importFailures: string[];
  showImportFailures: boolean;
  importStateBySource: Record<ImportSource, { state: ImportUiState; importedCount: number }>;
  localizeFeedback: string | null;
  dashboardLoadError: string | null;
  pathHelpQuery: string;
  pathHelpSource: ImportSource | 'unknown';
  pathHelpOs: 'windows' | 'macos' | 'linux' | 'unknown';
  pathHelpLoading: boolean;
  pathHelpResult: AIPathHelpResult | null;
  manualImportPathBySource: Record<ImportSource, string>;
  onManualImportPathChange: (source: ImportSource, value: string) => void;
  onImportSourceDefaults: (source: ImportSource) => void;
  onImportSourceManualPath: (source: ImportSource) => void;
  onImportLocalDirectory: (source: ImportSource) => void;
  onToggleImportFailures: () => void;
  onPathHelpQueryChange: (value: string) => void;
  onPathHelpSourceChange: (value: ImportSource | 'unknown') => void;
  onPathHelpOsChange: (value: 'windows' | 'macos' | 'linux' | 'unknown') => void;
  onAskPathHelp: () => void;
  onNavigateHome: () => void;
}) {
  const displaySources =
    sourceScanSummary?.sources ??
    SKILL_ROOT_GUIDES.map(item => ({
      source: item.id,
      label: item.name,
      paths: item.paths,
      status: 'unreachable' as const,
      skillCount: 0,
      scannedSkillCount: 0,
      importedSkillCount: 0,
      lastScannedAt: new Date().toISOString(),
      message: '暂未获取到扫描状态，请直接选择目录导入。',
    }));
  const debugSummary = `DEBUG stats=${statsData?.totalSkills ?? 'null'} sourceTotal=${sourceScanSummary?.totalDetectedSkills ?? 'null'} cards=${displaySources.map(item => `${item.source}:${item.skillCount}`).join('|')}`;
  const hydratedSources = displaySources.map(source => {
    const importUi = importStateBySource[source.source as ImportSource];
    if (!importUi || importUi.state !== 'success' || importUi.importedCount <= 0) {
      return source;
    }

    const nextCount = Math.max(source.skillCount ?? 0, importUi.importedCount);
    return {
      ...source,
      status: 'detected' as const,
      skillCount: nextCount,
      scannedSkillCount: nextCount,
      importedSkillCount: nextCount,
      message: '已接入',
    };
  });
  const hydratedTotalDetectedSkills = hydratedSources.reduce((sum, item) => sum + (item.skillCount ?? 0), 0);

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[28px] border border-outline-subtle bg-surface-card/80 p-6 sm:p-8"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-primary">导入与来源</p>
            <h1 className="font-display text-[2.2rem] leading-[1.02] text-on-surface sm:text-[3rem]">
              先接入本地来源，
              <br />
              再生成任务推荐。
            </h1>
            <p className="mt-4 text-sm leading-6 text-on-surface-variant sm:text-[15px]">
              Skill Dashboard 会读取你选择目录中的 SKILL.md 与必要元信息，用来建立本地能力清单与推荐底座。我们不会修改原始 skill 文件。
            </p>
          </div>

          {hasImportedSkills && (
            <button
              onClick={onNavigateHome}
              className="inline-flex items-center justify-center rounded-xl border border-primary/30 bg-primary/8 px-4 py-2.5 text-[13px] font-medium text-primary transition-colors hover:bg-primary/12"
            >
              返回首页查看推荐
            </button>
          )}
        </div>

        <div className="mt-4 space-y-3">
          {localizeFeedback && <FeedbackBanner message={localizeFeedback} tone="success" />}
          <div className="rounded-lg border border-outline-subtle bg-surface-container-low px-3 py-2 font-mono text-[11px] text-on-surface-muted">{debugSummary}</div>
          {dashboardLoadError && <FeedbackBanner message={`数据加载不完整：${dashboardLoadError}`} tone="warning" />}
        </div>

        <div className="mt-5 rounded-2xl border border-outline-subtle bg-surface-container-low/70 p-4">
          <p className="mb-3 text-[12px] font-medium text-on-surface">导入后会发生什么</p>
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-on-surface-muted">
            <span className="rounded-full border border-outline-subtle bg-surface-bright px-3 py-1">读取 SKILL.md</span>
            <span>→</span>
            <span className="rounded-full border border-outline-subtle bg-surface-bright px-3 py-1">识别本地 skills</span>
            <span>→</span>
            <span className="rounded-full border border-outline-subtle bg-surface-bright px-3 py-1">生成中文展示层</span>
            <span>→</span>
            <span className="rounded-full border border-outline-subtle bg-surface-bright px-3 py-1">回到首页查看推荐</span>
          </div>
        </div>

        {importFailures.length > 0 && (
          <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-[12px] text-warning">
            <div className="flex items-center justify-between gap-3">
              <span>有 {importFailures.length} 个文件导入失败</span>
              <button onClick={onToggleImportFailures} className="underline underline-offset-2 hover:opacity-80">
                {showImportFailures ? '收起明细' : '查看明细'}
              </button>
            </div>
            {showImportFailures && (
              <div className="mt-2 max-h-[180px] space-y-1 overflow-auto rounded-md bg-surface-card/70 p-2">
                {importFailures.map(item => (
                  <div key={item} className="break-all font-mono text-[11px] text-on-surface-muted">
                    {item}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-on-surface-muted">来源状态</p>
                <p className="mt-1 text-[12px] text-on-surface-muted">
                  共识别 {sourceScanSummary?.totalDetectedSkills ?? 0} 个来源技能，{formatRelativeTime(sourceScanSummary?.scannedAt ?? new Date().toISOString())} 更新
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {hydratedSources.map(source => {
                const sourceKey = source.source as ImportSource;
                const isImportingThisSource = importingSource === sourceKey;
                const importUi = importStateBySource[sourceKey];
                const style = getSourceStatusStyle(source.status);
                const guidePaths = SKILL_ROOT_GUIDES.find(item => item.id === sourceKey)?.paths ?? source.paths;
                const manualPathValue = manualImportPathBySource[sourceKey];
                const importLabel =
                  importUi.state === 'success'
                    ? `已连接，识别 ${importUi.importedCount} 条`
                    : importUi.state === 'failed'
                      ? '这次导入没有成功，可以再试一次。'
                      : '选择目录后，这里会显示导入结果。';
                const importLabelClass =
                  importUi.state === 'success'
                      ? 'text-success'
                      : importUi.state === 'failed'
                      ? 'text-warning'
                      : 'text-on-surface-muted';
                const importLabelDisplay = isImportingThisSource
                  ? '正在连接并读取这个来源，请稍等。'
                  : importUi.state === 'success'
                    ? `已连接成功，本次识别到 ${importUi.importedCount} 条 skills。`
                    : importUi.state === 'failed'
                      ? '这次连接没有完成，可以再试一次。'
                      : '选择一种导入方式后，这里会显示结果。';
                const importLabelClassDisplay = isImportingThisSource ? 'text-primary' : importLabelClass;

                return (
                  <div key={source.source} className="flex min-h-[360px] flex-col rounded-2xl border border-outline-subtle bg-surface-bright/70 p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="text-[14px] font-medium text-on-surface">{source.label}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${style.chip}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                        {style.label}
                      </span>
                    </div>

                    <div className="text-[24px] font-mono font-semibold text-on-surface">{source.skillCount}</div>
                    <div className="mt-1 text-[11px] text-on-surface-muted">当前识别到的技能数</div>

                    {(source.scannedSkillCount !== undefined || source.importedSkillCount !== undefined) && (
                      <div className="mt-3 text-[11px] text-on-surface-muted">
                        扫描 {source.scannedSkillCount ?? 0} · 导入 {source.importedSkillCount ?? 0}
                      </div>
                    )}

                    <div className="mt-4 rounded-xl border border-outline-subtle bg-surface-card/70 px-3 py-2">
                      <p className={`text-[11px] ${importLabelClassDisplay}`}>{importLabelDisplay}</p>
                    </div>

                    <details className="mt-3 text-[11px] text-on-surface-muted">
                      <summary className="cursor-pointer select-none">查看候选路径</summary>
                      <div className="mt-2 space-y-1">
                        {source.paths.map(scanPath => (
                          <div key={scanPath} className="break-all rounded-md border border-outline-subtle bg-surface-card px-2 py-1 text-[10px] font-mono text-on-surface-muted">
                            {maskPathForDisplay(scanPath)}
                          </div>
                        ))}
                      </div>
                    </details>

                    <div className="mt-auto pt-4 space-y-3">
                      <button
                        onClick={() => onImportSourceDefaults(sourceKey)}
                        disabled={isImportingThisSource}
                        className="w-full rounded-xl border border-primary/35 bg-primary px-3 py-2.5 text-[13px] font-medium text-[#071318] transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {isImportingThisSource ? '连接中...' : `一键连接 ${source.label} 默认路径`}
                      </button>

                      <div className="rounded-xl border border-outline-subtle bg-surface-card/60 p-3">
                        <p className="mb-2 text-[11px] text-on-surface-muted">如果你的 skills 不在默认路径，再手动填目录。</p>
                        <div className="flex flex-col gap-2">
                          <input
                            value={manualPathValue}
                            onChange={event => onManualImportPathChange(sourceKey, event.target.value)}
                            placeholder={`例如：${maskPathForDisplay(guidePaths[0] ?? '')}`}
                            className="h-10 rounded-lg border border-outline-variant bg-surface-bright px-3 text-[12px] text-on-surface placeholder:text-on-surface-muted"
                          />
                          <button
                            onClick={() => onImportSourceManualPath(sourceKey)}
                            disabled={isImportingThisSource || !manualPathValue.trim()}
                            className="w-full rounded-lg border border-outline-variant bg-surface-bright px-3 py-2 text-[12px] font-medium text-on-surface transition-colors hover:border-outline disabled:opacity-50"
                          >
                            按这个路径导入
                          </button>
                        </div>
                      </div>
                    </div>

                    <details className="mt-3 text-[11px] text-on-surface-muted">
                      <summary className="cursor-pointer select-none">还是不行？再手动选择目录</summary>
                      <div className="mt-2">
                        <button
                          onClick={() => onImportLocalDirectory(sourceKey)}
                          disabled={isImportingThisSource}
                          className="w-full rounded-lg border border-outline-variant bg-surface-card px-3 py-2 text-[12px] font-medium text-on-surface transition-colors hover:border-outline disabled:opacity-50"
                        >
                          {isImportingThisSource ? '导入中...' : `手动选择 ${source.label} skills 目录`}
                        </button>
                      </div>
                    </details>

                    <details className="mt-3 text-[11px] text-on-surface-muted">
                      <summary className="cursor-pointer select-none">找不到目录？查看 {source.label} 定位步骤</summary>
                      <div className="mt-2 space-y-2">
                        <div className="text-[10px] uppercase tracking-[0.08em] text-on-surface-muted">候选路径</div>
                        {guidePaths.map(scanPath => (
                          <div key={`guide-${scanPath}`} className="break-all rounded-md border border-outline-subtle bg-surface-card px-2 py-1 font-mono">
                            {maskPathForDisplay(scanPath)}
                          </div>
                        ))}
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="rounded-md border border-outline-subtle bg-surface-card px-2 py-2">
                            <div className="mb-1 text-[10px] font-semibold text-on-surface">Windows</div>
                            {SOURCE_LOCATE_STEPS.windows.map(step => (
                              <p key={`${source.source}-win-${step}`} className="text-[10px] text-on-surface-muted">
                                - {step}
                              </p>
                            ))}
                          </div>
                          <div className="rounded-md border border-outline-subtle bg-surface-card px-2 py-2">
                            <div className="mb-1 text-[10px] font-semibold text-on-surface">macOS</div>
                            {SOURCE_LOCATE_STEPS.macos.map(step => (
                              <p key={`${source.source}-mac-${step}`} className="text-[10px] text-on-surface-muted">
                                - {step}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </details>
                  </div>
                );
              })}
            </div>
          </div>

        <div className="mt-6 rounded-2xl border border-accent/25 bg-accent/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Bot className="h-4 w-4 text-accent" />
            <p className="text-[13px] font-medium text-on-surface">找不到路径？问 AI</p>
          </div>
          <p className="mb-3 text-[12px] text-on-surface-muted">先说你用的平台和系统，再描述问题，例如“我是 Windows，Cursor 找不到 skills 目录”。</p>

          <div className="mb-2 grid gap-2 sm:grid-cols-3">
            <select
              value={pathHelpSource}
              onChange={event => onPathHelpSourceChange(event.target.value as ImportSource | 'unknown')}
              className="h-9 rounded-lg border border-outline-variant bg-surface-card px-3 text-[12px] text-on-surface"
            >
              <option value="unknown">工具（可选）</option>
              <option value="codex">Codex</option>
              <option value="cursor">Cursor</option>
              <option value="claude">Claude</option>
            </select>
            <select
              value={pathHelpOs}
              onChange={event => onPathHelpOsChange(event.target.value as 'windows' | 'macos' | 'linux' | 'unknown')}
              className="h-9 rounded-lg border border-outline-variant bg-surface-card px-3 text-[12px] text-on-surface"
            >
              <option value="unknown">系统（可选）</option>
              <option value="windows">Windows</option>
              <option value="macos">macOS</option>
              <option value="linux">Linux</option>
            </select>
            <button
              onClick={onAskPathHelp}
              disabled={pathHelpLoading || !pathHelpQuery.trim()}
              className="h-9 rounded-lg border border-accent/35 bg-accent/12 px-3 text-[12px] font-medium text-accent disabled:opacity-50"
            >
              {pathHelpLoading ? 'AI 分析中...' : '获取定位建议'}
            </button>
          </div>

          <textarea
            value={pathHelpQuery}
            onChange={event => onPathHelpQueryChange(event.target.value)}
            placeholder="描述你遇到的问题，例如：我在 Windows 上找不到 Codex 的 skills 文件夹。"
            rows={2}
            className="w-full rounded-lg border border-outline-variant bg-surface-card px-3 py-2 text-[12px] text-on-surface placeholder:text-on-surface-muted"
          />

          {pathHelpResult && (
            <div className="mt-3 space-y-2 rounded-lg border border-outline-subtle bg-surface-card/80 p-3">
              <p className="text-[12px] text-on-surface">{pathHelpResult.summary}</p>
              <div className="text-[12px] text-on-surface-muted">
                <p className="mb-1">下一步：</p>
                {pathHelpResult.nextActions.map(action => (
                  <p key={action}>- {action}</p>
                ))}
              </div>
              <div className="text-[12px] text-on-surface-muted">
                <p className="mb-1">可能路径：</p>
                {pathHelpResult.likelyPaths.map(item => (
                  <p key={item} className="break-all font-mono text-[11px]">
                    {maskPathForDisplay(item)}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {statsData && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCard label="技能总数" value={statsData.totalSkills} />
            <StatsCard label="分类覆盖" value={statsData.totalCategories} />
            <StatsCard label="本次新增" value={statsData.newSinceLastScan} highlight />
            <StatsCard label="最近扫描" value={formatRelativeTime(statsData.lastScanTime)} />
          </div>
        )}
      </motion.section>
    </div>
  );
}

function SkillLibraryPage({
  skills,
  filteredSkills,
  searchQuery,
  selectedCategory,
  selectedSource,
  selectedSkillId,
  loading,
  onCategoryChange,
  onSourceChange,
  onSkillSelect,
  onClearSelection,
  onNavigateToImport,
}: {
  skills: Skill[];
  filteredSkills: Skill[];
  searchQuery: string;
  selectedCategory: FilterCategory;
  selectedSource: SourceFilter;
  selectedSkillId: string | null;
  loading: boolean;
  onCategoryChange: (cat: FilterCategory) => void;
  onSourceChange: (source: SourceFilter) => void;
  onSkillSelect: (id: string) => void;
  onClearSelection: () => void;
  onNavigateToImport: () => void;
}) {
  const selectedSkill = skills.find(skill => skill.id === selectedSkillId) ?? null;
  const isFirstScanEmpty = !searchQuery && skills.length === 0;

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 rounded-[24px] border border-outline-subtle bg-surface-card/60 p-5 sm:p-6"
      >
        <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-primary">技能库</p>
        <h1 className="font-display text-[2rem] leading-[1.05] text-on-surface sm:text-[2.8rem]">
          浏览你已经接入的
          <br />
          本地 AI skills。
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-on-surface-variant sm:text-[15px]">
          这里负责全量浏览、筛选与搜索。首页负责任务推荐，这里负责把本地能力看清楚。
        </p>
      </motion.section>

      <section className="mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {CATEGORY_CONFIG.map(({ id, icon: Icon }) => {
            const count = id === 'All' ? skills.length : skills.filter(skill => skill.category === id).length;
            const isActive = selectedCategory === id;
            return (
              <button
                key={id}
                onClick={() => onCategoryChange(id)}
                className={`inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[13px] font-medium transition-all duration-150 ${
                  isActive
                    ? 'border-primary/40 bg-primary/12 text-primary'
                    : 'border-outline-variant bg-surface-bright text-on-surface-variant hover:border-outline hover:text-on-surface'
                }`}
              >
                <Icon className="h-3 w-3" />
                {id === 'All' ? '全部' : id}
                <span className="font-mono text-[11px] opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
          {SOURCE_FILTER_CONFIG.map(filter => {
            const count = filter.id === 'all' ? skills.length : skills.filter(skill => inferSkillSource(skill.sourcePath) === filter.id).length;
            const isActive = selectedSource === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => onSourceChange(filter.id)}
                className={`inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[12px] font-medium transition-all duration-150 ${
                  isActive
                    ? 'border-info/40 bg-info/12 text-info'
                    : 'border-outline-variant bg-surface-bright text-on-surface-variant hover:border-outline hover:text-on-surface'
                }`}
              >
                {filter.label}
                <span className="font-mono text-[10px] opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-on-surface-muted">正在加载技能库...</div>
      ) : filteredSkills.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-outline-subtle bg-surface-card py-20 text-center">
          <div className="text-4xl opacity-30">◌</div>
          {isFirstScanEmpty ? (
            <div className="max-w-2xl px-5">
              <div className="mb-2 flex items-center justify-center gap-2 text-on-surface">
                <FolderSearch className="h-4 w-4 text-primary" />
                <p className="font-medium">还没有识别到本地技能</p>
              </div>
              <p className="mb-4 text-sm text-on-surface-muted">先去“导入与来源”连接你的本地 skill 目录，再回来浏览完整技能库。</p>
              <button
                onClick={onNavigateToImport}
                className="rounded-xl border border-primary/35 bg-primary px-4 py-2.5 text-[14px] font-medium text-[#071318] transition-opacity hover:opacity-90"
              >
                去导入本地 skills
              </button>
            </div>
          ) : (
            <>
              <p className="font-medium text-on-surface-variant">没有找到匹配的技能</p>
              <p className="max-w-xs text-sm text-on-surface-muted">
                {searchQuery ? `“${searchQuery}”没有匹配结果，试试别的关键词。` : '当前筛选条件下暂时没有技能。'}
              </p>
            </>
          )}
        </div>
      ) : (
        <div
          onClick={event => {
            const target = event.target as HTMLElement;
            if (!target.closest('[data-skill-card="true"]')) onClearSelection();
          }}
          className={`grid gap-4 ${selectedSkill ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}
        >
          <AnimatePresence mode="sync">
            {filteredSkills.map((skill, index) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                isSelected={selectedSkillId === skill.id}
                animationDelay={Math.min(index * 30, 200)}
                onClick={() => onSkillSelect(skill.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
