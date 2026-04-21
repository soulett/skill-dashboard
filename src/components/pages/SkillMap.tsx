import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, ArrowRight, ChevronDown, Lightbulb, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { analyzeSkillEcosystem, EcosystemAnalysis } from '../../api/ai';
import { Category, Skill } from '../../types';
import { calcSkillEdges } from '../../utils';

interface SkillMapProps {
  skills: Skill[];
  onNavigateToSkill: (skillId: string) => void;
}

const CATEGORY_STYLE: Record<string, { fill: string; stroke: string; label: string; cluster: string }> = {
  编程开发: { fill: 'rgba(96,165,250,0.08)', stroke: '#60A5FA', label: '#93C5FD', cluster: 'rgba(96,165,250,0.04)' },
  内容创作: { fill: 'rgba(167,139,250,0.08)', stroke: '#A78BFA', label: '#C4B5FD', cluster: 'rgba(167,139,250,0.04)' },
  数据分析: { fill: 'rgba(56,201,184,0.08)', stroke: '#38C9B8', label: '#5EEAD4', cluster: 'rgba(56,201,184,0.04)' },
  产品设计: { fill: 'rgba(240,168,48,0.08)', stroke: '#F0A830', label: '#FCD34D', cluster: 'rgba(240,168,48,0.04)' },
  效率流程: { fill: 'rgba(74,222,128,0.08)', stroke: '#4ADE80', label: '#86EFAC', cluster: 'rgba(74,222,128,0.04)' },
  商业营销: { fill: 'rgba(248,113,113,0.08)', stroke: '#F87171', label: '#FCA5A5', cluster: 'rgba(248,113,113,0.04)' },
  其他: { fill: 'rgba(148,163,184,0.08)', stroke: '#94A3B8', label: '#CBD5E1', cluster: 'rgba(148,163,184,0.04)' },
};

const W = 900;
const H = 540;
const NODE_R = 18;
const CLUSTER_POSITIONS = [
  { x: 175, y: 155 },
  { x: 725, y: 155 },
  { x: 450, y: 270 },
  { x: 175, y: 400 },
  { x: 725, y: 400 },
  { x: 450, y: 470 },
  { x: 450, y: 80 },
];

function clusterRadius(count: number) {
  if (count <= 1) return 0;
  if (count <= 3) return 68;
  if (count <= 5) return 82;
  return 100;
}

function nodePositions(count: number, cx: number, cy: number): Array<{ x: number; y: number }> {
  if (count === 0) return [];
  if (count === 1) return [{ x: cx, y: cy }];

  const r = clusterRadius(count);

  if (count <= 6) {
    return Array.from({ length: count }, (_, index) => {
      const angle = (2 * Math.PI * index) / count - Math.PI / 2;
      return { x: cx + r * 0.72 * Math.cos(angle), y: cy + r * 0.72 * Math.sin(angle) };
    });
  }

  const inner = 3;
  const outer = count - inner;
  const innerR = r * 0.42;
  const outerR = r * 0.82;
  const positions: Array<{ x: number; y: number }> = [];

  for (let index = 0; index < inner; index += 1) {
    const angle = (2 * Math.PI * index) / inner - Math.PI / 2;
    positions.push({ x: cx + innerR * Math.cos(angle), y: cy + innerR * Math.sin(angle) });
  }

  for (let index = 0; index < outer; index += 1) {
    const angle = (2 * Math.PI * index) / outer - Math.PI / 2 + Math.PI / outer;
    positions.push({ x: cx + outerR * Math.cos(angle), y: cy + outerR * Math.sin(angle) });
  }

  return positions;
}

export default function SkillMap({ skills, onNavigateToSkill }: SkillMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(2);
  const [analysis, setAnalysis] = useState<EcosystemAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);

  const categories = useMemo(() => {
    const used = [...new Set(skills.map(skill => skill.category))] as Category[];
    return used.map((category, index) => ({
      category,
      skills: skills.filter(skill => skill.category === category),
      center: CLUSTER_POSITIONS[index] ?? { x: W / 2, y: H / 2 },
      style: CATEGORY_STYLE[category] ?? CATEGORY_STYLE.其他,
    }));
  }, [skills]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number; category: string }>();
    categories.forEach(({ category, skills: items, center }) => {
      const positions = nodePositions(items.length, center.x, center.y);
      items.forEach((skill, index) => map.set(skill.id, { ...positions[index], category }));
    });
    return map;
  }, [categories]);

  const edges = useMemo(() => calcSkillEdges(skills, threshold), [skills, threshold]);

  const hoveredEdges = useMemo(() => {
    if (!hoveredId) return new Set<string>();
    return new Set(edges.filter(edge => edge.sourceId === hoveredId || edge.targetId === hoveredId).flatMap(edge => [edge.sourceId, edge.targetId]));
  }, [edges, hoveredId]);

  const hoveredSkill = hoveredId ? skills.find(skill => skill.id === hoveredId) : null;

  const runAnalysis = async () => {
    if (analysisLoading) return;
    setAnalysisLoading(true);
    setAnalysisOpen(true);
    const result = await analyzeSkillEcosystem(skills, edges);
    setAnalysis(result);
    setAnalysisLoading(false);
  };

  return (
    <div className="px-6 py-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="font-display text-3xl text-on-surface leading-tight mb-1">Skill Map</h1>
        <p className="text-sm text-on-surface-variant">把技能之间的关系可视化，帮助展示“能力资产”，而不只是一堆文件列表。</p>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-on-surface-muted">关联阈值</span>
            {[1, 2, 3].map(value => (
              <button
                key={value}
                onClick={() => setThreshold(value)}
                className={`w-7 h-7 rounded-lg text-[12px] font-mono font-medium border transition-all ${
                  threshold === value
                    ? 'bg-primary/12 border-primary/40 text-primary'
                    : 'bg-surface-card border-outline-subtle text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          <div className="text-[12px] text-on-surface-muted">
            共 <span className="text-on-surface font-medium">{edges.length}</span> 条关联线
          </div>
        </div>

        <button
          onClick={analysisOpen && analysis ? () => setAnalysisOpen(open => !open) : runAnalysis}
          disabled={analysisLoading}
          className="flex items-center gap-1.5 h-8 px-4 rounded-lg text-[13px] font-medium border border-accent/40 text-accent hover:bg-accent/8 transition-all disabled:opacity-50"
        >
          {analysisLoading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              分析中
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              {analysis ? (analysisOpen ? '收起分析' : '展开分析') : 'AI 读图'}
            </>
          )}
        </button>
      </motion.div>

      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, duration: 0.4 }} className="bg-surface-card border border-outline-subtle rounded-2xl overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 'clamp(300px, 55vw, 540px)' }}>
          {edges.map(edge => {
            const left = nodeMap.get(edge.sourceId);
            const right = nodeMap.get(edge.targetId);
            if (!left || !right) return null;
            const isHighlighted = hoveredId && (edge.sourceId === hoveredId || edge.targetId === hoveredId);

            return (
              <line
                key={`${edge.sourceId}-${edge.targetId}`}
                x1={left.x}
                y1={left.y}
                x2={right.x}
                y2={right.y}
                stroke={isHighlighted ? '#38C9B8' : 'rgba(255,255,255,0.07)'}
                strokeWidth={isHighlighted ? 1.5 : 1}
                strokeDasharray={isHighlighted ? undefined : '3 4'}
              />
            );
          })}

          {categories.map(({ category, skills: categorySkills, center, style }) => {
            const r = clusterRadius(categorySkills.length);
            return (
              <g key={category}>
                {categorySkills.length > 1 && (
                  <circle cx={center.x} cy={center.y} r={r + NODE_R + 8} fill={style.cluster} stroke={style.stroke} strokeWidth={0.5} strokeOpacity={0.3} />
                )}
                <text x={center.x} y={center.y - (categorySkills.length > 1 ? r + NODE_R + 14 : NODE_R + 10)} textAnchor="middle" fill={style.label} fontSize="11" fontWeight="600" letterSpacing="0.04em" opacity={0.85}>
                  {category}
                </text>
              </g>
            );
          })}

          {categories.map(({ skills: categorySkills, center, style }) =>
            nodePositions(categorySkills.length, center.x, center.y).map((position, index) => {
              const skill = categorySkills[index];
              if (!skill) return null;

              const isHovered = hoveredId === skill.id;
              const isRelated = hoveredEdges.has(skill.id);
              const isDimmed = hoveredId && !isHovered && !isRelated;

              return (
                <g
                  key={skill.id}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredId(skill.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => onNavigateToSkill(skill.id)}
                >
                  <circle
                    cx={position.x}
                    cy={position.y}
                    r={isHovered ? NODE_R * 1.3 : NODE_R}
                    fill={style.fill}
                    stroke={isHovered || isRelated ? style.stroke : `${style.stroke}60`}
                    strokeWidth={isHovered ? 2 : 1}
                    opacity={isDimmed ? 0.25 : 1}
                    style={{ transition: 'r 0.15s, opacity 0.15s, stroke-width 0.15s' }}
                  />
                  <text
                    x={position.x}
                    y={position.y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={style.label}
                    fontSize={isHovered ? '9' : '8'}
                    opacity={isDimmed ? 0.3 : 0.9}
                    style={{ transition: 'opacity 0.15s', pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {skill.title.length > 8 ? `${skill.title.slice(0, 8)}...` : skill.title}
                  </text>
                </g>
              );
            }),
          )}
        </svg>
      </motion.div>

      <div className="mt-3 h-14 flex items-center">
        {hoveredSkill ? (
          <motion.div key={hoveredSkill.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 px-4 py-3 bg-surface-card border border-outline-default rounded-xl w-full">
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-on-surface">{hoveredSkill.title}</div>
              <div className="text-[11px] text-on-surface-muted mt-0.5">
                {hoveredSkill.category}
                {hoveredEdges.size > 1 && <span className="ml-2 text-primary">· 与 {hoveredEdges.size - 1} 个技能存在明显关联</span>}
              </div>
            </div>
            <button onClick={() => onNavigateToSkill(hoveredSkill.id)} className="text-[11px] text-primary hover:underline shrink-0">
              查看详情
            </button>
          </motion.div>
        ) : (
          <p className="text-[12px] text-on-surface-muted px-1">悬停节点可查看技能摘要，点击可进入详情面板。</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {categories.map(({ category, skills: categorySkills, style }) => (
          <div key={category} className="flex items-center gap-1.5 text-[11px] text-on-surface-muted">
            <svg width="10" height="10">
              <circle cx="5" cy="5" r="4" fill={style.fill} stroke={style.stroke} strokeWidth="1" />
            </svg>
            {category} <span className="font-mono opacity-60">{categorySkills.length}</span>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {analysisOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: 'easeInOut' }} className="overflow-hidden">
            <div className="mt-6 rounded-2xl border border-accent/20 bg-accent/4 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-accent/15">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span className="text-[13px] font-semibold text-accent">AI 生态分析</span>
                  {analysis && <span className="text-[11px] text-on-surface-muted">· 基于 {skills.length} 个技能</span>}
                </div>
                <button onClick={() => setAnalysisOpen(false)} className="text-on-surface-muted hover:text-on-surface transition-colors">
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {analysisLoading && (
                <div className="px-5 py-10 flex flex-col items-center gap-3 text-center">
                  <div className="relative w-10 h-10">
                    <div className="absolute inset-0 rounded-full border-2 border-accent/20" />
                    <div className="absolute inset-0 rounded-full border-2 border-t-accent animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto w-4 h-4 text-accent" />
                  </div>
                  <p className="text-[13px] text-on-surface-variant">正在分析当前技能库结构...</p>
                  <p className="text-[11px] text-on-surface-muted">这部分是本地演示版分析，不依赖外部 AI 服务。</p>
                </div>
              )}

              {analysis && !analysisLoading && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="px-5 py-5 space-y-5">
                  <p className="text-[13px] text-on-surface leading-relaxed">{analysis.summary}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <TrendingUp className="w-3.5 h-3.5 text-tertiary" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-muted">优势</span>
                      </div>
                      <ul className="space-y-1.5">
                        {analysis.strengths.map((item, index) => (
                          <li key={index} className="flex items-start gap-1.5 text-[12px] text-on-surface-variant">
                            <span className="text-tertiary shrink-0 mt-0.5">✓</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-secondary" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-muted">缺口</span>
                      </div>
                      <ul className="space-y-1.5">
                        {analysis.gaps.map((item, index) => (
                          <li key={index} className="flex items-start gap-1.5 text-[12px] text-on-surface-variant">
                            <span className="text-secondary shrink-0 mt-0.5">!</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {analysis.powerSkillIds.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Zap className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-muted">核心技能</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {analysis.powerSkillIds.map(id => {
                          const skill = skills.find(item => item.id === id);
                          if (!skill) return null;
                          return (
                            <button
                              key={id}
                              onClick={() => onNavigateToSkill(id)}
                              className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-lg bg-primary/8 border border-primary/20 text-primary hover:bg-primary/15 transition-colors"
                            >
                              {skill.title}
                              <ArrowRight className="w-3 h-3 opacity-60" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {analysis.suggestions.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Lightbulb className="w-3.5 h-3.5 text-accent" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-muted">建议补充</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {analysis.suggestions.map((item, index) => (
                          <div key={index} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-surface-container-high border border-outline-subtle">
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] font-medium text-on-surface">{item.name}</div>
                              <div className="text-[11px] text-on-surface-muted mt-0.5">{item.reason}</div>
                            </div>
                            <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-surface-bright border border-outline-subtle text-on-surface-muted whitespace-nowrap">
                              {item.category}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-accent/8 border border-accent/20">
                    <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <p className="text-[12px] text-on-surface leading-relaxed">{analysis.insight}</p>
                  </div>

                  <button onClick={runAnalysis} className="text-[11px] text-on-surface-muted hover:text-accent transition-colors">
                    重新分析
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
