import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, ChevronRight, Copy, Sparkles, XCircle } from 'lucide-react';
import { AIFieldSuggestion, suggestFieldFixes } from '../../api/ai';
import { HealthGrade, Skill, SkillHealthReport } from '../../types';
import { calcCompletenessScore, GRADE_CONFIG, getMostCommonIssue } from '../../utils';

interface HealthCheckProps {
  skills: Skill[];
  onNavigateToSkill: (skillId: string, editMode: boolean) => void;
}

type GradeFilter = HealthGrade | 'all';

export default function HealthCheck({ skills, onNavigateToSkill }: HealthCheckProps) {
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sort, setSort] = useState<'asc' | 'desc'>('asc');

  const reports = useMemo(() => skills.map(calcCompletenessScore), [skills]);
  const summary = useMemo(() => {
    const excellent = reports.filter(report => report.grade === 'excellent').length;
    const good = reports.filter(report => report.grade === 'good').length;
    const needsWork = reports.filter(report => report.grade === 'needs-work').length;
    const critical = reports.filter(report => report.grade === 'critical').length;
    const avgScore = Math.round(reports.reduce((sum, report) => sum + report.score, 0) / (reports.length || 1));
    return { excellent, good, needsWork, critical, avgScore };
  }, [reports]);

  const filtered = useMemo(() => {
    const base = gradeFilter === 'all' ? reports : reports.filter(report => report.grade === gradeFilter);
    return [...base].sort((left, right) => (sort === 'asc' ? left.score - right.score : right.score - left.score));
  }, [gradeFilter, reports, sort]);

  const mostCommonIssue = useMemo(() => getMostCommonIssue(skills), [skills]);
  const getSkill = (id: string) => skills.find(skill => skill.id === id)!;

  const filters: Array<{ id: GradeFilter; label: string }> = [
    { id: 'all', label: '全部' },
    { id: 'critical', label: '待修复' },
    { id: 'needs-work', label: '待完善' },
    { id: 'good', label: '良好' },
    { id: 'excellent', label: '优秀' },
  ];

  return (
    <div className="px-6 py-8 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display italic text-3xl text-on-surface leading-tight mb-1">Health Check</h1>
        <p className="text-sm text-on-surface-variant">快速检查技能资料是否完整，找出最影响演示观感的缺口。</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: '技能总数', value: skills.length, color: 'text-on-surface' },
          { label: '优秀 + 良好', value: summary.excellent + summary.good, color: 'text-success' },
          { label: '待完善', value: summary.needsWork, color: 'text-warning' },
          { label: '待修复', value: summary.critical, color: 'text-error' },
        ].map(card => (
          <div key={card.label} className="bg-surface-card rounded-xl border border-outline-subtle p-4">
            <div className={`text-2xl font-semibold font-mono ${card.color}`}>{card.value}</div>
            <div className="text-xs text-on-surface-muted mt-0.5">{card.label}</div>
          </div>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="bg-surface-card rounded-xl border border-outline-subtle p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-on-surface">整体完整度</span>
          <span className="font-mono text-lg font-semibold text-on-surface">
            {summary.avgScore}
            <span className="text-xs text-on-surface-muted"> / 100</span>
          </span>
        </div>
        <div className="h-2 bg-surface-bright rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${summary.avgScore}%` }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
            className="h-full rounded-full"
            style={{ backgroundColor: summary.avgScore >= 90 ? '#4ADE80' : summary.avgScore >= 70 ? '#38C9B8' : summary.avgScore >= 50 ? '#F0A830' : '#F87171' }}
          />
        </div>
        <div className="flex items-center gap-1.5 mt-3 text-xs text-warning">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span>{mostCommonIssue}</span>
        </div>
      </motion.div>

      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {filters.map(filter => {
            const isActive = gradeFilter === filter.id;
            const cfg = filter.id !== 'all' ? GRADE_CONFIG[filter.id as HealthGrade] : null;
            return (
              <button
                key={filter.id}
                onClick={() => setGradeFilter(filter.id)}
                className={`h-7 px-3 rounded-full text-[12px] font-medium border transition-all ${
                  isActive
                    ? cfg
                      ? `${cfg.bg} ${cfg.color} border-current/30`
                      : 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-surface-card border-outline-subtle text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setSort(value => (value === 'asc' ? 'desc' : 'asc'))}
          className="h-7 px-3 rounded-lg text-[12px] font-medium border border-outline-subtle text-on-surface-variant hover:text-on-surface bg-surface-card transition-colors"
        >
          {sort === 'asc' ? '分数从低到高' : '分数从高到低'}
        </button>
      </div>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {filtered.map((report, index) => (
            <SkillHealthRow
              key={report.skillId}
              report={report}
              skill={getSkill(report.skillId)}
              index={index}
              expanded={expandedId === report.skillId}
              onToggle={() => setExpandedId(previous => (previous === report.skillId ? null : report.skillId))}
              onFix={() => onNavigateToSkill(report.skillId, true)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SkillHealthRow({
  report,
  skill,
  index,
  expanded,
  onToggle,
  onFix,
}: {
  report: SkillHealthReport;
  skill: Skill;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onFix: () => void;
}) {
  const cfg = GRADE_CONFIG[report.grade];
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AIFieldSuggestion[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const failedFields = report.checks.filter(check => !check.passed).map(check => check.field);

  const runAI = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!failedFields.length || aiLoading) return;
    setAiLoading(true);
    setAiSuggestions([]);
    try {
      const results = await suggestFieldFixes(skill.title, skill.details.rawContent, failedFields);
      setAiSuggestions(results);
    } finally {
      setAiLoading(false);
    }
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.15), duration: 0.15 }}
      className="bg-surface-card rounded-xl border border-outline-subtle overflow-hidden"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={onToggle} className="text-on-surface-muted hover:text-on-surface transition-colors shrink-0">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-on-surface truncate">{skill.title}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {report.checks.map(check => (
              <span key={check.field} title={check.passed ? check.label : `${check.label}：${check.tip}`}>
                {check.passed ? <CheckCircle2 className="w-3 h-3 text-success/70" /> : <XCircle className="w-3 h-3 text-error/80" />}
              </span>
            ))}
            <span className="text-[11px] text-on-surface-muted ml-1">
              {report.passedCount}/{report.checks.length} 项通过
            </span>
          </div>
        </div>

        <div className="w-28 shrink-0 hidden sm:block">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-surface-bright rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${report.score}%`, backgroundColor: cfg.barColor }} />
            </div>
            <span className="text-[11px] font-mono text-on-surface-muted w-6 text-right">{report.score}</span>
          </div>
        </div>

        <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>

        {report.grade !== 'excellent' && (
          <button onClick={event => { event.stopPropagation(); onFix(); }} className="shrink-0 flex items-center gap-1 text-[11px] text-on-surface-variant hover:text-primary transition-colors">
            去完善
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-outline-subtle">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {report.checks.map(check => (
                  <div
                    key={check.field}
                    className={`flex items-start gap-2 p-2.5 rounded-lg text-[12px] ${
                      check.passed ? 'bg-success/5 text-on-surface-variant' : 'bg-error/5 text-on-surface'
                    }`}
                  >
                    {check.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-error mt-0.5 shrink-0" />}
                    <div>
                      <div className={check.passed ? 'text-on-surface-muted line-through' : 'font-medium'}>{check.label}</div>
                      {!check.passed && <div className="text-on-surface-variant mt-0.5">{check.tip}</div>}
                    </div>
                  </div>
                ))}
              </div>

              {report.grade !== 'excellent' && (
                <div className="mt-3 pt-3 border-t border-outline-subtle">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-muted">演示建议</span>
                    <button
                      onClick={runAI}
                      disabled={aiLoading}
                      className="flex items-center gap-1 text-[11px] font-medium text-accent hover:text-accent/80 disabled:opacity-50 transition-colors"
                    >
                      {aiLoading ? (
                        <>
                          <span className="w-3 h-3 border border-accent/30 border-t-accent rounded-full animate-spin" />
                          生成中
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" />
                          生成建议
                        </>
                      )}
                    </button>
                  </div>

                  {aiSuggestions.length > 0 ? (
                    <div className="space-y-2">
                      {aiSuggestions.map(suggestion => {
                        const text = Array.isArray(suggestion.suggestion) ? suggestion.suggestion.join(' / ') : suggestion.suggestion;
                        const key = `${skill.id}-${suggestion.field}`;

                        return (
                          <div key={suggestion.field} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-accent/5 border border-accent/15 text-[11px]">
                            <div className="min-w-0">
                              <span className="font-medium text-accent mr-1.5">{suggestion.field}</span>
                              <span className="text-on-surface-variant break-all">{text}</span>
                            </div>
                            <button onClick={() => copyText(text, key)} className="shrink-0 text-on-surface-muted hover:text-on-surface transition-colors mt-0.5" title="复制">
                              {copied === key ? <CheckCircle2 className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    !aiLoading && <p className="text-[11px] text-on-surface-muted">点击“生成建议”，快速补齐演示版缺失字段。</p>
                  )}
                </div>
              )}

              {report.grade !== 'excellent' && (
                <button onClick={onFix} className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-primary hover:underline">
                  在编辑模式中完善这个技能
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
