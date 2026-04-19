import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Download, Search, Star, Users } from 'lucide-react';
import { MARKETPLACE_ITEMS } from '../../constants/marketplace';
import { mockApi } from '../../mock';
import { Category, MarketplaceItem, Skill } from '../../types';

interface MarketplaceProps {
  installedSkills: Skill[];
  onInstalled: (skill: Skill) => void;
}

type FilterCat = Category | 'all';

const CATEGORY_FILTERS: Array<{ id: FilterCat; label: string }> = [
  { id: 'all', label: '全部' },
  { id: '编程开发', label: '编程开发' },
  { id: '数据分析', label: '数据分析' },
  { id: '产品设计', label: '产品设计' },
  { id: '效率流程', label: '效率流程' },
  { id: '商业营销', label: '商业营销' },
];

export default function Marketplace({ installedSkills, onInstalled }: MarketplaceProps) {
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState<FilterCat>('all');
  const [installing, setInstalling] = useState<string | null>(null);
  const [recentlyInstalled, setRecentlyInstalled] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const installedIds = useMemo(() => new Set(installedSkills.map(skill => skill.id)), [installedSkills]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MARKETPLACE_ITEMS.filter(item => {
      const matchesCat = catFilter === 'all' || item.category === catFilter;
      const matchesQ =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some(tag => tag.toLowerCase().includes(q));
      return matchesCat && matchesQ;
    });
  }, [catFilter, query]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const handleInstall = async (item: MarketplaceItem) => {
    if (installedIds.has(item.id) || installing) return;
    setInstalling(item.id);
    const result = await mockApi.installSkill(item);
    setInstalling(null);

    if (result.success) {
      setRecentlyInstalled(previous => new Set(previous).add(item.id));
      onInstalled(result.data);
      showToast(`已将 ${item.name} 添加到你的技能库`);
    }
  };

  const installedCount = MARKETPLACE_ITEMS.filter(item => installedIds.has(item.id) || recentlyInstalled.has(item.id)).length;

  return (
    <div className="px-6 py-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display italic text-3xl text-on-surface leading-tight mb-1">Marketplace</h1>
            <p className="text-sm text-on-surface-variant">为 demo 补足新的能力模块，模拟从市场安装技能的完整体验。</p>
          </div>
          <div className="flex items-center gap-3 text-sm text-on-surface-variant">
            <span>
              <span className="font-mono font-semibold text-on-surface">{installedCount}</span> 已安装
            </span>
            <span className="text-outline">·</span>
            <span>
              <span className="font-mono font-semibold text-on-surface">{MARKETPLACE_ITEMS.length - installedCount}</span> 可安装
            </span>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-muted" />
        <input
          type="text"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="搜索可安装的技能"
          className="w-full h-10 pl-9 pr-4 bg-surface-card border border-outline-variant rounded-xl text-sm text-on-surface placeholder:text-on-surface-muted focus:outline-none focus:border-primary/50 transition-colors"
        />
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }} className="flex gap-1.5 flex-wrap mb-6">
        {CATEGORY_FILTERS.map(filter => (
          <button
            key={filter.id}
            onClick={() => setCatFilter(filter.id)}
            className={`h-7 px-3 rounded-full text-[12px] font-medium border transition-all ${
              catFilter === filter.id
                ? 'bg-primary/12 border-primary/40 text-primary'
                : 'bg-surface-card border-outline-subtle text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </motion.div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center bg-surface-card border border-outline-subtle rounded-2xl">
          <div className="text-4xl opacity-30">◎</div>
          <p className="text-on-surface-variant font-medium">没有找到匹配的技能</p>
          <p className="text-on-surface-muted text-sm">试试别的关键词或切换分类。</p>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((item, index) => {
              const isInstalled = installedIds.has(item.id) || recentlyInstalled.has(item.id);
              return (
                <MarketplaceCard
                  key={item.id}
                  item={item}
                  isInstalled={isInstalled}
                  isInstalling={installing === item.id}
                  index={index}
                  onInstall={() => handleInstall(item)}
                />
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 bg-surface-elevated border border-outline-default rounded-xl shadow-lg text-sm text-on-surface z-50"
          >
            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MarketplaceCard({
  item,
  isInstalled,
  isInstalling,
  index,
  onInstall,
}: {
  item: MarketplaceItem;
  isInstalled: boolean;
  isInstalling: boolean;
  index: number;
  onInstall: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: Math.min(index * 0.025, 0.15), duration: 0.15 }}
      className={`relative bg-surface-card border rounded-xl p-4 flex flex-col gap-3 transition-colors ${
        isInstalled ? 'border-success/20' : 'border-outline-subtle hover:border-outline-default'
      }`}
    >
      {item.author === 'official' && (
        <div className="absolute top-3 right-3">
          <span className="flex items-center gap-1 text-[10px] font-medium text-warning px-1.5 py-0.5 rounded bg-warning/10">
            <Star className="w-2.5 h-2.5" />
            官方
          </span>
        </div>
      )}

      <div className="pr-10">
        <div className="text-[13px] font-semibold text-on-surface leading-tight">{item.name}</div>
        <span className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/8 text-primary border border-primary/20">
          {item.category}
        </span>
      </div>

      <p className="text-[12px] text-on-surface-variant leading-relaxed line-clamp-3 flex-1">{item.description}</p>

      <div className="flex flex-wrap gap-1">
        {item.tags.slice(0, 3).map(tag => (
          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-bright border border-outline-subtle text-on-surface-muted">
            #{tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-outline-subtle">
        <span className="flex items-center gap-1 text-[11px] text-on-surface-muted">
          <Users className="w-3 h-3" />
          {item.installs.toLocaleString()}
        </span>

        {isInstalled ? (
          <span className="flex items-center gap-1 text-[12px] font-medium text-success">
            <CheckCircle2 className="w-3.5 h-3.5" />
            已安装
          </span>
        ) : (
          <button
            onClick={onInstall}
            disabled={isInstalling}
            className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-60"
          >
            {isInstalling ? <span className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {isInstalling ? '安装中' : '安装'}
          </button>
        )}
      </div>
    </motion.div>
  );
}
