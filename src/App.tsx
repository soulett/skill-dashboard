import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BarChart3, Code2, GitMerge, Layers, LayoutDashboard, Megaphone, Package, PenLine } from 'lucide-react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import RightPanel from './components/RightPanel';
import SkillCard from './components/SkillCard';
import StatsCard from './components/StatsCard';
import HealthCheck from './components/pages/HealthCheck';
import Marketplace from './components/pages/Marketplace';
import SkillMap from './components/pages/SkillMap';
import { mockApi } from './mock';
import { formatRelativeTime } from './utils';
import { AppPage, Category, Skill, StatsData } from './types';

type FilterCategory = Category | 'All';

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

export default function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>('skills');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('All');
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [autoEditSkillId, setAutoEditSkillId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    Promise.all([mockApi.getSkills(), mockApi.getStats()]).then(([skillsRes, statsRes]) => {
      if (skillsRes.success) setSkills(skillsRes.data.skills);
      if (statsRes.success) setStatsData(statsRes.data);
      setLoading(false);
    });
  }, []);

  const filteredSkills = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return skills.filter(skill => {
      const matchesCategory = selectedCategory === 'All' || skill.category === selectedCategory;
      const matchesQuery =
        !q ||
        skill.title.toLowerCase().includes(q) ||
        skill.description.toLowerCase().includes(q) ||
        skill.tags.some(tag => tag.toLowerCase().includes(q));

      return matchesCategory && matchesQuery;
    });
  }, [searchQuery, selectedCategory, skills]);

  const selectedSkill = skills.find(skill => skill.id === selectedSkillId) ?? null;

  const handleSkillUpdate = (updatedSkill: Skill) => {
    setSkills(previous => previous.map(skill => (skill.id === updatedSkill.id ? updatedSkill : skill)));
    setAutoEditSkillId(null);
  };

  const handleScan = async () => {
    await mockApi.triggerScan();
    const statsRes = await mockApi.getStats();
    if (statsRes.success) setStatsData(statsRes.data);
  };

  const handleInstalled = (newSkill: Skill) => {
    setSkills(previous => [...previous, newSkill]);
  };

  const handleNavigateToSkill = (skillId: string, editMode = false) => {
    setCurrentPage('skills');
    setSelectedSkillId(skillId);
    setSidebarOpen(false);
    setAutoEditSkillId(editMode ? skillId : null);
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
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onMenuToggle={() => setSidebarOpen(open => !open)}
        />

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
                  selectedSkillId={selectedSkillId}
                  loading={loading}
                  onCategoryChange={category => {
                    setSelectedCategory(category);
                    setSelectedSkillId(null);
                    setAutoEditSkillId(null);
                  }}
                  onSkillSelect={id => {
                    setAutoEditSkillId(null);
                    setSelectedSkillId(previous => (previous === id ? null : id));
                  }}
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
          onClose={() => {
            setSelectedSkillId(null);
            setAutoEditSkillId(null);
          }}
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
  selectedSkillId,
  loading,
  onCategoryChange,
  onSkillSelect,
}: {
  skills: Skill[];
  filteredSkills: Skill[];
  statsData: StatsData | null;
  searchQuery: string;
  selectedCategory: FilterCategory;
  selectedSkillId: string | null;
  loading: boolean;
  onCategoryChange: (cat: FilterCategory) => void;
  onSkillSelect: (id: string) => void;
}) {
  const selectedSkill = skills.find(skill => skill.id === selectedSkillId) ?? null;

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 rounded-[28px] border border-outline-subtle bg-surface-card/80 p-5 sm:p-7"
      >
        <div className="max-w-4xl">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary mb-3">你的能力总览</p>
          <h1 className="font-display italic text-[2rem] leading-[1.05] text-on-surface sm:text-[2.8rem]">
            先别重新找工具了，
            <br />
            你已有的 AI 能力都在这里。
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-on-surface-variant sm:text-[15px]">
            当你准备开工时，不用再回忆装过什么技能，直接在这里找到最合适的能力。
          </p>

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
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-on-surface-muted text-sm">正在加载技能库...</div>
      ) : filteredSkills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center bg-surface-card border border-outline-subtle rounded-2xl">
          <div className="text-4xl opacity-30">◎</div>
          <p className="text-on-surface-variant font-medium">没有找到匹配的技能</p>
          <p className="text-on-surface-muted text-sm max-w-xs">
            {searchQuery ? `“${searchQuery}” 没有匹配结果，试试别的关键词。` : '当前分类下暂时没有演示数据。'}
          </p>
        </div>
      ) : (
        <div className={`grid gap-4 ${selectedSkill ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
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
