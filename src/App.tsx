import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, BarChart3, CheckCircle2, Code2, FolderSearch, GitMerge, Layers, LayoutDashboard, Megaphone, Package, PenLine } from 'lucide-react';
import { api } from './api';
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
    paths: ['~/.cursor/skills-cursor', '~/.cursor/skills', '<workspace>/.cursor/skills', '~/.cursor/plugins/**/skills'],
  },
  {
    id: 'claude',
    name: 'Claude',
    paths: ['~/.claude/skills', 'C:\\Users\\<用户名>\\.claude\\skills'],
  },
] as const;

const SOURCE_FILTER_CONFIG: Array<{ id: SourceFilter; label: string }> = [
  { id: 'all', label: '全部来源' },
  { id: 'codex', label: 'Codex' },
  { id: 'cursor', label: 'Cursor' },
  { id: 'claude', label: 'Claude' },
  { id: 'unknown', label: '其他' },
];

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
  const [localizingAll, setLocalizingAll] = useState(false);
  const [localizeFeedback, setLocalizeFeedback] = useState<string | null>(null);
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

  const handleLocalizeAll = async () => {
    setLocalizingAll(true);
    setLocalizeFeedback(null);
    const result = await api.localizeAllSkills();
    if (result.success) {
      setSkills(result.data.skills);
      const updatedCount = 'updatedCount' in result.data ? result.data.updatedCount : result.data.total;
      const skippedCount = 'skippedCount' in result.data ? result.data.skippedCount : 0;
      setLocalizeFeedback(`本次已更新 ${updatedCount} 条，跳过 ${skippedCount} 条`);
    }
    await loadDashboardData();
    setLocalizingAll(false);
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
                  localizingAll={localizingAll}
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
                  onLocalizeAll={handleLocalizeAll}
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
  localizingAll,
  sourceScanSummary,
  localizeFeedback,
  onCategoryChange,
  onSourceChange,
  onSkillSelect,
  onClearSelection,
  onLocalizeAll,
}: {
  skills: Skill[];
  filteredSkills: Skill[];
  statsData: StatsData | null;
  searchQuery: string;
  selectedCategory: FilterCategory;
  selectedSource: SourceFilter;
  selectedSkillId: string | null;
  loading: boolean;
  localizingAll: boolean;
  sourceScanSummary: SourceScanSummary | null;
  localizeFeedback: string | null;
  onCategoryChange: (cat: FilterCategory) => void;
  onSourceChange: (source: SourceFilter) => void;
  onSkillSelect: (id: string) => void;
  onClearSelection: () => void;
  onLocalizeAll: () => void;
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

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={onLocalizeAll}
              disabled={localizingAll || skills.length === 0}
              className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-[13px] font-medium text-primary transition-colors hover:bg-primary/16 disabled:opacity-50"
            >
              {localizingAll ? '正在扫描并更新中文展示...' : '扫描新技能并更新中文展示'}
            </button>
            <span className="text-[12px] text-on-surface-muted">只写入 metadata.json，不修改原始 SKILL.md。</span>
          </div>

          {localizeFeedback && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-success/30 bg-success/10 px-3 py-1.5 text-[12px] text-success">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{localizeFeedback}</span>
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
                  return (
                    <div key={source.source} className="rounded-xl border border-outline-subtle bg-surface-bright/70 p-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[13px] font-medium text-on-surface">{source.label}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${style.chip}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                          {style.label}
                        </span>
                      </div>
                      <div className="text-[20px] font-mono font-semibold text-on-surface">{source.skillCount}</div>
                      <div className="text-[11px] text-on-surface-muted mb-2">已识别技能数</div>
                      <div className="space-y-1">
                        {source.paths.map(scanPath => (
                          <div key={scanPath} className="rounded-md bg-surface-card border border-outline-subtle px-2 py-1 text-[10px] text-on-surface-muted font-mono break-all">
                            {scanPath}
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 text-[10px] text-on-surface-muted inline-flex items-center gap-1">
                        {source.status === 'unreachable' ? <AlertCircle className="w-3 h-3 text-error" /> : <CheckCircle2 className="w-3 h-3 text-success/80" />}
                        <span>{source.message}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
              <p className="text-on-surface-muted text-sm mb-4">我们会自动扫描常见目录。你可以先把技能文件放在下列任一位置，再点“扫描新技能并更新中文展示”。</p>
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
