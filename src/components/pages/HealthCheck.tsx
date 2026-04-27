import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, ChevronRight, Copy, Sparkles, XCircle } from 'lucide-react';
import { api } from '../../api';
import { AIFieldSuggestion, suggestFieldFixes } from '../../api/ai';
import { HealthGrade, Skill, SkillHealthReport, SkillMetadataPatch } from '../../types';
import { calcCompletenessScore, GRADE_CONFIG, getMostCommonIssue } from '../../utils';

interface HealthCheckProps {
  skills: Skill[];
  onNavigateToSkill: (skillId: string, editMode: boolean) => void;
  onSkillPatched: (updatedSkill: Skill) => void;
}

type GradeFilter = HealthGrade | 'all';

export default function HealthCheck({ skills, onNavigateToSkill, onSkillPatched }: HealthCheckProps) {
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
    <div className="w-full px-6 py-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display text-3xl text-on-surface leading-tight mb-1">Health Check</h1>
        <p className="text-sm text-on-surface-variant">快速检查技能资料是否完整，找出最影响展示观感的缺口。</p>
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
              onSkillPatched={onSkillPatched}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

const FIELD_META: Record<string, { label: string; whatIs: string }> = {
  tags: { label: '标签（tags）', whatIs: '用于搜索和筛选这项技能的关键词。' },
  whatItDoes: { label: '一句话介绍（whatItDoes）', whatIs: '告诉用户这项技能能帮他省什么事。' },
  description: { label: '技能描述（description）', whatIs: '给用户的简要说明，帮助快速判断是否适合。' },
  whenToUse: { label: '适用场景（whenToUse）', whatIs: '说明在什么情况下最该使用这项技能。' },
  rawContent: { label: '原始内容（rawContent）', whatIs: '用于追溯和二次编辑的完整原始资料。' },
};

function getFieldMeta(field: string) {
  return FIELD_META[field] ?? { label: field, whatIs: '这个字段用于补全技能资料的关键信息。' };
}

function buildFallbackDetailedExplanation(field: string): string {
  if (field === 'tags') {
    return '标签决定了用户能不能在搜索和分类里快速找到这个技能。建议使用具体任务词而不是泛词，这样检索更准，也更容易让用户一眼判断是否相关。';
  }
  if (field === 'whatItDoes' || field === 'description') {
    return '这段文案是用户决定“要不要继续看”的第一道判断。重点不是技术细节，而是明确它帮用户省下了哪类重复工作。';
  }
  if (field === 'whenToUse') {
    return '适用场景相当于“使用时机提示”。写成真实工作片段，会比抽象描述更容易理解，也更容易触发用户马上行动。';
  }
  return '这条说明用于帮助用户理解字段作用和修改理由，避免只看到结果却不知道为什么要这样写。';
}

function SkillHealthRow({
  report,
  skill,
  index,
  expanded,
  onToggle,
  onFix,
  onSkillPatched,
}: {
  report: SkillHealthReport;
  skill: Skill;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onFix: () => void;
  onSkillPatched: (updatedSkill: Skill) => void;
}) {
  const cfg = GRADE_CONFIG[report.grade];
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AIFieldSuggestion[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);

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

  const toList = (value: string | string[]): string[] =>
    (Array.isArray(value) ? value : value.split(/\r?\n|[;,，；、/]|(?:\d+\s*[.)、])/g))
      .map(item => item.trim())
      .filter(Boolean);

  const toPatch = (suggestion: AIFieldSuggestion): SkillMetadataPatch | null => {
    if (suggestion.field === 'description' || suggestion.field === 'whatItDoes') {
      const text = Array.isArray(suggestion.suggestion) ? suggestion.suggestion.join('；') : suggestion.suggestion;
      return { description: text.trim() };
    }
    if (suggestion.field === 'tags') {
      return { tags: toList(suggestion.suggestion).slice(0, 8) };
    }
    if (suggestion.field === 'whenToUse') {
      return { whenToUse: toList(suggestion.suggestion).slice(0, 6) };
    }
    return null;
  };

  const applySuggestions = async (targets: AIFieldSuggestion[]) => {
    if (applying || targets.length === 0) return;
    const patches = targets.map(toPatch).filter((item): item is SkillMetadataPatch => item !== null);
    if (patches.length === 0) {
      setApplyMessage('当前建议不支持自动应用，请点击“去完善”手动确认。');
      return;
    }

    const mergedPatch = patches.reduce<SkillMetadataPatch>(
      (acc, patch) => ({
        ...acc,
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
        ...(patch.whenToUse !== undefined ? { whenToUse: patch.whenToUse } : {}),
      }),
      {},
    );

    setApplying(true);
    setApplyMessage(null);
    const response = await api.updateSkillMetadata(skill.id, mergedPatch);
    setApplying(false);

    if (response.success) {
      onSkillPatched(response.data);
      setApplyMessage('已应用建议并保存。');
    } else {
      setApplyMessage(`应用失败：${response.error ?? '未知错误'}`);
    }
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
          <button
            onClick={event => {
              event.stopPropagation();
              onFix();
            }}
            className="shrink-0 flex items-center gap-1 text-[11px] text-on-surface-variant hover:text-primary transition-colors"
          >
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
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] text-on-surface-muted">建议已生成，可直接一键应用可自动处理的字段。</p>
                        <button
                          onClick={() => applySuggestions(aiSuggestions)}
                          disabled={applying}
                          className="h-7 px-2.5 rounded-md text-[11px] font-medium border border-success/35 bg-success/10 text-success hover:bg-success/15 disabled:opacity-50"
                        >
                          {applying ? '应用中...' : '一键应用全部'}
                        </button>
                      </div>
                      {aiSuggestions.map(suggestion => {
                        const text = Array.isArray(suggestion.suggestion) ? suggestion.suggestion.join(' / ') : suggestion.suggestion;
                        const { label, whatIs } = getFieldMeta(suggestion.field);
                        const detailed = suggestion.detailedExplanation?.trim() || buildFallbackDetailedExplanation(suggestion.field);
                        const key = `${skill.id}-${suggestion.field}`;
                        const canAutoApply = toPatch(suggestion) !== null;

                        return (
                          <div key={suggestion.field} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-accent/5 border border-accent/15 text-[11px]">
                            <div className="min-w-0 space-y-1.5">
                              <div className="text-accent font-medium">{label}</div>
                              <div className="text-on-surface-variant break-all">
                                <span className="text-on-surface-muted">建议内容：</span>
                                {text}
                              </div>
                              <div className="text-on-surface-variant">
                                <span className="text-on-surface-muted">这是什么：</span>
                                {whatIs}
                              </div>
                              <div className="text-on-surface-variant">
                                <span className="text-on-surface-muted">为什么这样做：</span>
                                {suggestion.explanation}
                              </div>
                              <div className="text-on-surface-variant">
                                <span className="text-on-surface-muted">详细说明：</span>
                                {detailed}
                              </div>
                              {!canAutoApply && <div className="text-[10px] text-warning">该字段暂不支持自动应用，请手动确认后再保存。</div>}
                            </div>
                            <div className="shrink-0 flex items-center gap-1 mt-0.5">
                              {canAutoApply && (
                                <button
                                  onClick={() => applySuggestions([suggestion])}
                                  disabled={applying}
                                  className="h-6 px-2 rounded text-[10px] border border-success/30 text-success hover:bg-success/10 disabled:opacity-50"
                                  title="应用该条建议"
                                >
                                  应用
                                </button>
                              )}
                              <button onClick={() => copyText(text, key)} className="text-on-surface-muted hover:text-on-surface transition-colors" title="复制">
                                {copied === key ? <CheckCircle2 className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {applyMessage && <p className="text-[11px] text-on-surface-muted">{applyMessage}</p>}
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
