import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bot, BarChart3, CheckCircle2, Code2, FolderSearch, GitMerge, Layers, LayoutDashboard, Megaphone, Package, PenLine } from 'lucide-react';
import { api } from './api';
import { AIPathHelpResult, askPathHelp } from './api/ai';
import RightPanel from './components/RightPanel';
import Sidebar from './components/Sidebar';
import SkillCard from './components/SkillCard';
import StatsCard from './components/StatsCard';
import TopBar from './components/TopBar';
import HealthCheck from './components/pages/HealthCheck';
import Marketplace from './components/pages/Marketplace';
import SkillMap from './components/pages/SkillMap';
import { AppPage, Category, Skill, SkillSource, SourceScanStatus, SourceScanSummary, StatsData } from './types';
import { formatRelativeTime, inferSkillSource } from './utils';

type FilterCategory = Category | 'All';
type SourceFilter = SkillSource | 'all';

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
    paths: ['~/.cursor/skills-cursor', '~/.cursor/skills', '<workspace>/.cursor/skills'],
  },
  {
    id: 'claude',
    name: 'Claude',
    paths: ['~/.claude/skills', 'C:\\Users\\<用户名>\\.claude\\skills'],
  },
] as const;

const SOURCE_LOCATE_STEPS: Record<'windows' | 'macos', string[]> = {
  windows: ['打开“文件资源管理器”', '点“查看”并勾选“隐藏的项目”', '进入下方候选路径，选择包含 SKILL.md 的目录'],
  macos: ['打开 Finder', '按 Command + Shift + . 显示隐藏文件夹', '按 Shift + Command + G，输入下方候选路径并前往'],
};

const SOURCE_FILTER_CONFIG: Array<{ id: SourceFilter; label: string }> = [
  { id: 'all', label: '全部来源' },
  { id: 'codex', label: 'Codex' },
  { id: 'cursor', label: 'Cursor' },
  { id: 'claude', label: 'Claude' },
  { id: 'unknown', label: '其他' },
];

type ImportSource = 'codex' | 'cursor' | 'claude';

interface LocalImportScanResult {
  skills: Skill[];
  errors: string[];
}

type ImportUiState = 'idle' | 'success' | 'failed';
const MAX_IMPORTED_RAW_CONTENT = 20_000;

function maskPathForDisplay(input: string): string {
  const normalized = input.replaceAll('/', '\\');
  let output = normalized;

  output = output.replace(/^[A-Za-z]:\\Users\\[^\\]+/i, match => match.replace(/\\[^\\]+$/, '\\<用户名>'));
  output = output.replace(/\\AI-Coding\\skill dashboard/gi, '\\<workspace>');
  output = output.replace(/^local:\\\\(codex|cursor|claude)\\\\[^\\]+\\\\/i, (_m, source) => `local://${source}/<已选目录>/`);

  if (output.startsWith('\\\\') || output.startsWith('/')) {
    output = output.replace(/^\/Users\/[^/]+/i, '/Users/<用户名>');
    output = output.replace(/^\/home\/[^/]+/i, '/home/<用户名>');
  }

  return output;
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
    chip: 'bg-error/12 text-error border-error/30',
    dot: 'bg-error',
    label: '路径不可达',
  };
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>('skills');
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
  const [localizeFeedback, setLocalizeFeedback] = useState<string | null>(null);
  const [importFailures, setImportFailures] = useState<string[]>([]);
  const [showImportFailures, setShowImportFailures] = useState(false);
  const [pathHelpQuery, setPathHelpQuery] = useState('');
  const [pathHelpSource, setPathHelpSource] = useState<ImportSource | 'unknown'>('unknown');
  const [pathHelpOs, setPathHelpOs] = useState<'windows' | 'macos' | 'linux' | 'unknown'>('unknown');
  const [pathHelpLoading, setPathHelpLoading] = useState(false);
  const [pathHelpResult, setPathHelpResult] = useState<AIPathHelpResult | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadDashboardData = async () => {
    const [skillsRes, statsRes, sourceScanRes] = await Promise.all([api.getSkills(), api.getStats(), api.getSourceScanSummary()]);
    if (skillsRes.success) setSkills(skillsRes.data.skills);
    if (statsRes.success) setStatsData(statsRes.data);
    if (sourceScanRes.success) setSourceScanSummary(sourceScanRes.data);
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

  const selectedSkill = skills.find(skill => skill.id === selectedSkillId) ?? null;

  const handleSkillUpdate = (updatedSkill: Skill) => {
    setSkills(previous => previous.map(skill => (skill.id === updatedSkill.id ? updatedSkill : skill)));
    setAutoEditSkillId(null);
  };

  const handleScan = async () => {
    await api.triggerScan();
    await loadDashboardData();
  };

  const handleImportLocalDirectory = async (source: ImportSource) => {
    if (importingSource) return;
    const picker = (window as Window & { showDirectoryPicker?: () => Promise<any> }).showDirectoryPicker;
    if (!picker) {
      setLocalizeFeedback('当前浏览器不支持目录授权，请使用最新版 Chrome / Edge。');
      return;
    }

    setImportingSource(source);
    setImportFailures([]);
    setShowImportFailures(false);
    setLocalizeFeedback(null);

    try {
      const directoryHandle = await picker();
      const scanned = await scanLocalSkillsFromDirectory(directoryHandle, source, 4);
      setImportFailures(scanned.errors);
      if (scanned.skills.length === 0) {
        setLocalizeFeedback('未发现可导入的 SKILL.md，请检查目录后重试。');
        setImportStateBySource(previous => ({
          ...previous,
          [source]: { state: 'failed', importedCount: 0 },
        }));
        return;
      }

      const importResult = await api.importSkills(scanned.skills);
      if (!importResult.success) {
        const importError =
          'error' in importResult && typeof importResult.error === 'string' ? importResult.error : undefined;
        setLocalizeFeedback(importError ?? '本地导入失败，请稍后重试。');
        setImportStateBySource(previous => ({
          ...previous,
          [source]: { state: 'failed', importedCount: 0 },
        }));
        return;
      }

      const localizeResult = await api.localizeAllSkills();
      if (localizeResult.success) {
        const updatedCount = 'updatedCount' in localizeResult.data ? localizeResult.data.updatedCount : localizeResult.data.total;
        const skippedCount = 'skippedCount' in localizeResult.data ? localizeResult.data.skippedCount : 0;
        const failureCount = scanned.errors.length;
        setLocalizeFeedback(`导入 ${scanned.skills.length} 条，中文更新 ${updatedCount} 条，跳过 ${skippedCount} 条，失败 ${failureCount} 条。`);
      } else {
        const localizeError =
          'error' in localizeResult && typeof localizeResult.error === 'string' ? localizeResult.error : undefined;
        setLocalizeFeedback(`导入 ${scanned.skills.length} 条成功，但中文展示更新失败：${localizeError ?? '未知错误'}`);
      }

      setImportStateBySource(previous => ({
        ...previous,
        [source]: { state: 'success', importedCount: scanned.skills.length },
      }));

      await loadDashboardData();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/aborted|user canceled|cancelled|The user aborted a request/i.test(message)) {
        setLocalizeFeedback(`导入中断：${message}`);
        setImportStateBySource(previous => ({
          ...previous,
          [source]: { state: 'failed', importedCount: 0 },
        }));
      }
    } finally {
      setImportingSource(null);
    }
  };

  const handleAskPathHelp = async () => {
    if (!pathHelpQuery.trim()) return;
    setPathHelpLoading(true);
    const knownPaths = sourceScanSummary?.sources.flatMap(item => item.paths) ?? [];
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
    // Prevent accidental click-through selecting another card right after closing.
    setSuppressSkillSelectUntil(Date.now() + 220);
  };

  const navigatePage = (page: AppPage) => {
    setCurrentPage(page);
    setSidebarOpen(false);
    if (page !== 'skills') setSelectedSkillId(null);
    setAutoEditSkillId(null);
  };

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
        <TopBar searchQuery={searchQuery} onSearchChange={setSearchQuery} onMenuToggle={() => setSidebarOpen(open => !open)} />

        <main className={`flex-1 pt-[56px] transition-all duration-300 ${selectedSkill && currentPage === 'skills' ? 'lg:mr-[420px]' : ''}`}>
          <AnimatePresence mode="sync">
            {currentPage === 'skills' && (
              <motion.div key="skills" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <SkillLibraryPage
                  skills={skills}
                  filteredSkills={filteredSkills}
                  statsData={statsData}
                  searchQuery={searchQuery}
                  selectedCategory={selectedCategory}
                  selectedSource={selectedSource}
                  selectedSkillId={selectedSkillId}
                  loading={loading}
                  sourceScanSummary={sourceScanSummary}
                  localizeFeedback={localizeFeedback}
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
                  onImportLocalDirectory={handleImportLocalDirectory}
                  importingSource={importingSource}
                  importFailures={importFailures}
                  showImportFailures={showImportFailures}
                  importStateBySource={importStateBySource}
                  pathHelpQuery={pathHelpQuery}
                  pathHelpSource={pathHelpSource}
                  pathHelpOs={pathHelpOs}
                  pathHelpLoading={pathHelpLoading}
                  pathHelpResult={pathHelpResult}
                  onPathHelpQueryChange={setPathHelpQuery}
                  onPathHelpSourceChange={setPathHelpSource}
                  onPathHelpOsChange={setPathHelpOs}
                  onAskPathHelp={handleAskPathHelp}
                  onToggleImportFailures={() => setShowImportFailures(value => !value)}
                />
              </motion.div>
            )}

            {currentPage === 'health' && (
              <motion.div key="health" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <HealthCheck skills={skills} onNavigateToSkill={handleNavigateToSkill} />
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

      {currentPage === 'skills' && (
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

function SkillLibraryPage({
  skills,
  filteredSkills,
  statsData,
  searchQuery,
  selectedCategory,
  selectedSource,
  selectedSkillId,
  loading,
  sourceScanSummary,
  localizeFeedback,
  onCategoryChange,
  onSourceChange,
  onSkillSelect,
  onClearSelection,
  onImportLocalDirectory,
  importingSource,
  importFailures,
  showImportFailures,
  importStateBySource,
  pathHelpQuery,
  pathHelpSource,
  pathHelpOs,
  pathHelpLoading,
  pathHelpResult,
  onPathHelpQueryChange,
  onPathHelpSourceChange,
  onPathHelpOsChange,
  onAskPathHelp,
  onToggleImportFailures,
}: {
  skills: Skill[];
  filteredSkills: Skill[];
  statsData: StatsData | null;
  searchQuery: string;
  selectedCategory: FilterCategory;
  selectedSource: SourceFilter;
  selectedSkillId: string | null;
  loading: boolean;
  sourceScanSummary: SourceScanSummary | null;
  localizeFeedback: string | null;
  onCategoryChange: (cat: FilterCategory) => void;
  onSourceChange: (source: SourceFilter) => void;
  onSkillSelect: (id: string) => void;
  onClearSelection: () => void;
  onImportLocalDirectory: (source: ImportSource) => void;
  importingSource: ImportSource | null;
  importFailures: string[];
  showImportFailures: boolean;
  importStateBySource: Record<ImportSource, { state: ImportUiState; importedCount: number }>;
  pathHelpQuery: string;
  pathHelpSource: ImportSource | 'unknown';
  pathHelpOs: 'windows' | 'macos' | 'linux' | 'unknown';
  pathHelpLoading: boolean;
  pathHelpResult: AIPathHelpResult | null;
  onPathHelpQueryChange: (value: string) => void;
  onPathHelpSourceChange: (value: ImportSource | 'unknown') => void;
  onPathHelpOsChange: (value: 'windows' | 'macos' | 'linux' | 'unknown') => void;
  onAskPathHelp: () => void;
  onToggleImportFailures: () => void;
}) {
  const selectedSkill = skills.find(skill => skill.id === selectedSkillId) ?? null;
  const isFirstScanEmpty = !searchQuery && skills.length === 0;

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 rounded-[28px] border border-outline-subtle bg-surface-card/80 p-5 sm:p-7"
      >
        <div className="w-full">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary mb-3">你的能力总览</p>
          <h1 className="font-display text-[2rem] leading-[1.05] text-on-surface sm:text-[2.8rem]">
            把分散的技能，
            <br />
            收进一个可管理的工作台。
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-on-surface-variant sm:text-[15px]">
            当你准备开工时，不用再回忆装过什么技能，直接在这里找到最合适的能力。
          </p>

          {localizeFeedback && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-success/30 bg-success/10 px-3 py-1.5 text-[12px] text-success">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{localizeFeedback}</span>
            </div>
          )}

          {importFailures.length > 0 && (
            <div className="mt-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-[12px] text-warning">
              <div className="flex items-center justify-between gap-3">
                <span>有 {importFailures.length} 个文件导入失败</span>
                <button onClick={onToggleImportFailures} className="underline underline-offset-2 hover:opacity-80">
                  {showImportFailures ? '收起明细' : '查看明细'}
                </button>
              </div>
              {showImportFailures && (
                <div className="mt-2 max-h-[180px] overflow-auto space-y-1 rounded-md bg-surface-card/70 p-2">
                  {importFailures.map(item => (
                    <div key={item} className="font-mono text-[11px] text-on-surface-muted break-all">
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {sourceScanSummary && (
            <div className="mt-5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-on-surface-muted">扫描来源状态</p>
                <p className="text-[11px] text-on-surface-muted">
                  共识别 {sourceScanSummary.totalDetectedSkills} 个来源技能 · {formatRelativeTime(sourceScanSummary.scannedAt)} 更新
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {sourceScanSummary.sources.map(source => {
                  const style = getSourceStatusStyle(source.status);
                  const sourceKey = source.source as ImportSource;
                  const isImportingThisSource = importingSource === sourceKey;
                  const importUi = importStateBySource[sourceKey];
                  const guidePaths = SKILL_ROOT_GUIDES.find(item => item.id === sourceKey)?.paths ?? source.paths;
                  const importLabel =
                    importUi.state === 'success'
                      ? `已导入 ${importUi.importedCount} 条`
                      : importUi.state === 'failed'
                        ? '导入失败，请重试'
                        : '未选择目录';
                  const importLabelClass =
                    importUi.state === 'success'
                      ? 'text-success'
                      : importUi.state === 'failed'
                        ? 'text-error'
                        : 'text-on-surface-muted';
                  return (
                    <div key={source.source} className="rounded-xl border border-outline-subtle bg-surface-bright/70 p-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[13px] font-medium text-on-surface">{source.label}</span>
                        <span className={`text-[11px] ${importLabelClass}`}>{importLabel}</span>
                      </div>
                      <div className="text-[20px] font-mono font-semibold text-on-surface">{source.skillCount}</div>
                      <div className="text-[11px] text-on-surface-muted mb-2">已识别技能数</div>
                      {(source.scannedSkillCount !== undefined || source.importedSkillCount !== undefined) && (
                        <div className="mb-2 text-[10px] text-on-surface-muted">
                          扫描 {source.scannedSkillCount ?? 0} · 导入 {source.importedSkillCount ?? 0}
                        </div>
                      )}
                      <div className="space-y-1">
                        {source.paths.map(scanPath => (
                          <div key={scanPath} className="rounded-md bg-surface-card border border-outline-subtle px-2 py-1 text-[10px] text-on-surface-muted font-mono break-all">
                            {maskPathForDisplay(scanPath)}
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => onImportLocalDirectory(sourceKey)}
                          disabled={isImportingThisSource}
                          className="rounded-lg border border-info/35 bg-info/12 px-3 py-1.5 text-[12px] font-medium text-info transition-colors hover:bg-info/18 disabled:opacity-50"
                        >
                          {isImportingThisSource ? '导入中...' : `选择${source.label}目录导入`}
                        </button>
                        <span className="text-[11px] text-on-surface-muted">导入后自动更新中文展示</span>
                      </div>

                      <details className="mt-2 text-[11px] text-on-surface-muted">
                        <summary className="cursor-pointer select-none">找不到目录？查看 {source.label} 定位步骤</summary>
                        <div className="mt-2 space-y-2">
                          <div className="text-[10px] uppercase tracking-[0.08em] text-on-surface-muted">候选路径</div>
                          {guidePaths.map(scanPath => (
                            <div key={`guide-${scanPath}`} className="rounded-md bg-surface-card border border-outline-subtle px-2 py-1 font-mono break-all">
                              {maskPathForDisplay(scanPath)}
                            </div>
                          ))}
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="rounded-md bg-surface-card border border-outline-subtle px-2 py-2">
                              <div className="mb-1 text-[10px] font-semibold text-on-surface">Windows</div>
                              {SOURCE_LOCATE_STEPS.windows.map(step => (
                                <p key={`${source.source}-win-${step}`} className="text-[10px] text-on-surface-muted">
                                  - {step}
                                </p>
                              ))}
                            </div>
                            <div className="rounded-md bg-surface-card border border-outline-subtle px-2 py-2">
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
          )}

          <div className="mt-5 rounded-xl border border-accent/25 bg-accent/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-4 h-4 text-accent" />
              <p className="text-[13px] font-medium text-on-surface">找不到路径？问 AI</p>
            </div>
            <p className="text-[12px] text-on-surface-muted mb-3">直接描述你的情况，例如“我是 Windows，Cursor 找不到 skills 目录”。</p>

            <div className="grid gap-2 sm:grid-cols-3 mb-2">
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
              placeholder="描述你遇到的问题（例如：我在 Windows 上找不到 Codex 的 skills 文件夹）"
              rows={2}
              className="w-full rounded-lg border border-outline-variant bg-surface-card px-3 py-2 text-[12px] text-on-surface placeholder:text-on-surface-muted"
            />

            {pathHelpResult && (
              <div className="mt-3 rounded-lg border border-outline-subtle bg-surface-card/80 p-3 space-y-2">
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
                    <p key={item} className="font-mono text-[11px] break-all">
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
        </div>
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
                className={`inline-flex shrink-0 items-center gap-1.5 h-8 px-3 rounded-full border text-[13px] font-medium transition-all duration-150 whitespace-nowrap ${
                  isActive
                    ? 'bg-primary/12 border-primary/40 text-primary'
                    : 'bg-surface-bright border-outline-variant text-on-surface-variant hover:border-outline hover:text-on-surface'
                }`}
              >
                <Icon className="w-3 h-3" />
                {id === 'All' ? '全部' : id}
                <span className="font-mono text-[11px] opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 mt-2">
          {SOURCE_FILTER_CONFIG.map(filter => {
            const count = filter.id === 'all' ? skills.length : skills.filter(skill => inferSkillSource(skill.sourcePath) === filter.id).length;
            const isActive = selectedSource === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => onSourceChange(filter.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 h-7 px-2.5 rounded-full border text-[12px] font-medium transition-all duration-150 whitespace-nowrap ${
                  isActive
                    ? 'bg-info/12 border-info/40 text-info'
                    : 'bg-surface-bright border-outline-variant text-on-surface-variant hover:border-outline hover:text-on-surface'
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
        <div className="flex items-center justify-center py-20 text-on-surface-muted text-sm">正在加载技能库...</div>
      ) : filteredSkills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center bg-surface-card border border-outline-subtle rounded-2xl">
          <div className="text-4xl opacity-30">◎</div>
          {isFirstScanEmpty ? (
            <div className="w-full max-w-4xl px-5 py-2 text-left">
              <div className="flex items-center gap-2 text-on-surface mb-2">
                <FolderSearch className="w-4 h-4 text-primary" />
                <p className="font-medium">还没有识别到本地技能</p>
              </div>
              <p className="text-on-surface-muted text-sm mb-4">请先在“扫描来源状态”的对应来源卡片内点击“选择目录导入”，授权后系统会读取你选择目录中的 SKILL.md。</p>
              <div className="grid gap-3 md:grid-cols-3">
                {SKILL_ROOT_GUIDES.map(guide => (
                  <div key={guide.id} className="rounded-xl border border-outline-subtle bg-surface-bright/70 p-3">
                    <div className="text-[13px] font-medium text-on-surface mb-2">{guide.name}</div>
                    <div className="space-y-1.5">
                      {guide.paths.map(path => (
                        <div key={path} className="rounded-md bg-surface-card border border-outline-subtle px-2 py-1.5 text-[11px] text-on-surface-muted font-mono break-all">
                          {path}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-on-surface-muted mt-3">提示：不同安装方式目录可能不同。若仍扫描不到，我们下一步会加“手动选择文件夹”入口。</p>
            </div>
          ) : (
            <>
              <p className="text-on-surface-variant font-medium">没有找到匹配的技能</p>
              <p className="text-on-surface-muted text-sm max-w-xs">
                {searchQuery ? `“${searchQuery}” 没有匹配结果，试试别的关键词。` : '当前分类下暂时没有技能。'}
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
