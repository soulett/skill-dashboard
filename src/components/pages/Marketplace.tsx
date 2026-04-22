import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ExternalLink, Search, Star, Users } from 'lucide-react';
import { MARKETPLACE_ITEMS } from '../../constants/marketplace';
import { Category, MarketplaceItem, Skill } from '../../types';

interface MarketplaceProps {
  installedSkills: Skill[];
  onInstalled: (skill: Skill) => void;
}

type FilterCat = Category | 'all';

const CATEGORY_FILTERS: Array<{ id: FilterCat; label: string }> = [
  { id: 'all', label: '全部' },
  { id: '编程开发' as Category, label: '编程开发' },
  { id: '数据分析' as Category, label: '数据分析' },
  { id: '产品设计' as Category, label: '产品设计' },
  { id: '效率流程' as Category, label: '效率流程' },
  { id: '商业营销' as Category, label: '商业营销' },
];

export default function Marketplace({ installedSkills: _installedSkills, onInstalled: _onInstalled }: MarketplaceProps) {
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState<FilterCat>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MARKETPLACE_ITEMS.filter(item => {
      const matchesCat = catFilter === 'all' || item.category === catFilter;
      const matchesQ =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some(tag => tag.toLowerCase().includes(q)) ||
        item.githubPath.toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
  }, [catFilter, query]);

  return (
    <div className="px-6 py-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-3xl text-on-surface leading-tight mb-1">Skill Sources</h1>
            <p className="text-sm text-on-surface-variant">展示公开可追溯的热门 skill 仓库。先看仓库内容，再决定导入策略。</p>
          </div>
          <div className="flex items-center gap-3 text-sm text-on-surface-variant">
            <span>
              <span className="font-mono font-semibold text-on-surface">{MARKETPLACE_ITEMS.length}</span> 精选来源
            </span>
            <span className="text-outline">·</span>
            <span>当前视图 Top {Math.min(10, MARKETPLACE_ITEMS.length)}</span>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-muted" />
        <input
          type="text"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="搜索技能来源、标签或仓库名"
          className="w-full h-10 pl-9 pr-4 bg-surface-card border border-outline-variant rounded-xl text-sm text-on-surface placeholder:text-on-surface-muted focus:outline-none focus:border-primary/50 transition-colors"
        />
      </motion.div>

      <div className="mb-4 rounded-xl border border-outline-subtle bg-surface-card/60 px-3 py-2 text-[11px] text-on-surface-muted">
        说明：这里展示的是“技能仓库来源”，不是单个技能条目。建议先点击查看仓库，再按你的标准筛选并导入。
      </div>

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
          <p className="text-on-surface-variant font-medium">没有找到匹配的来源</p>
          <p className="text-on-surface-muted text-sm">试试别的关键词或切换分类。</p>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item, index) => (
            <MarketplaceCard key={item.id} item={item} index={index} />
          ))}
        </motion.div>
      )}
    </div>
  );
}

function MarketplaceCard({
  item,
  index,
}: {
  item: MarketplaceItem;
  index: number;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.15), duration: 0.15 }}
      className="relative bg-surface-card border border-outline-subtle hover:border-outline-default rounded-xl p-4 flex flex-col gap-3 transition-colors"
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
        <div className="mt-1 text-[10px] text-on-surface-muted">
          来源：{item.sourceLabel ?? 'GitHub'} {item.popularityLabel ? `· ${item.popularityLabel}` : ''}
        </div>
      </div>

      <p className="text-[12px] text-on-surface-variant leading-relaxed line-clamp-3 flex-1">{item.description}</p>

      <div className="flex flex-wrap gap-1">
        {item.tags.slice(0, 4).map(tag => (
          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-bright border border-outline-subtle text-on-surface-muted">
            #{tag}
          </span>
        ))}
      </div>

      {item.trendNote && <div className="text-[11px] text-on-surface-muted line-clamp-2">趋势：{item.trendNote}</div>}

      <div className="text-[11px] text-on-surface-muted font-mono truncate">{item.githubPath}</div>

      <div className="flex items-center justify-between pt-1 border-t border-outline-subtle">
        <span className="flex items-center gap-1 text-[11px] text-on-surface-muted">
          <Users className="w-3 h-3" />
          {item.installs.toLocaleString()}
        </span>

        <a
          href={item.sourceUrl ?? `https://github.com/${item.githubPath}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          查看仓库
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </motion.div>
  );
}
