import { FieldCheckResult, HealthGrade, Skill, SkillEdge, SkillHealthReport } from './types';

interface CheckDef {
  field: string;
  label: string;
  points: number;
  tip: string;
  validator: (skill: Skill) => boolean;
}

const CHECKS: CheckDef[] = [
  { field: 'title', label: '标题完整', points: 15, tip: '标题要能直接说明这是哪类技能。', validator: skill => skill.title.trim().length > 0 },
  { field: 'description', label: '描述清晰', points: 20, tip: '用一句话说清楚价值，建议至少 20 个字。', validator: skill => skill.description.trim().length >= 20 },
  { field: 'category', label: '分类明确', points: 10, tip: '尽量放进明确分类，减少“其他”。', validator: skill => skill.category !== '其他' },
  { field: 'tags', label: '标签够用', points: 10, tip: '至少准备 2 个可搜索标签。', validator: skill => skill.tags.length >= 2 },
  { field: 'whenToUse', label: '适用场景完整', points: 15, tip: '补齐至少 2 条具体使用场景。', validator: skill => skill.details.whenToUse.length >= 2 },
  { field: 'whatItDoes', label: '详情信息完整', points: 20, tip: '详情说明尽量写清楚能力边界和产出。', validator: skill => skill.details.whatItDoes.trim().length >= 50 },
  { field: 'rawContent', label: '原始内容可追溯', points: 10, tip: '保留可预览的原始内容片段，便于校对。', validator: skill => skill.details.rawContent.trim().length >= 50 },
];

export function calcCompletenessScore(skill: Skill): SkillHealthReport {
  const checks: FieldCheckResult[] = CHECKS.map(check => ({
    field: check.field,
    label: check.label,
    points: check.points,
    tip: check.tip,
    passed: check.validator(skill),
  }));

  const score = checks.reduce((sum, check) => sum + (check.passed ? check.points : 0), 0);
  const passedCount = checks.filter(check => check.passed).length;
  const grade: HealthGrade = score >= 90 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'needs-work' : 'critical';

  return { skillId: skill.id, score, grade, checks, passedCount };
}

export const GRADE_CONFIG: Record<HealthGrade, { label: string; color: string; bg: string; barColor: string }> = {
  excellent: { label: '优秀', color: 'text-success', bg: 'bg-success/10', barColor: '#4ADE80' },
  good: { label: '良好', color: 'text-primary', bg: 'bg-primary/10', barColor: '#38C9B8' },
  'needs-work': { label: '待完善', color: 'text-warning', bg: 'bg-warning/10', barColor: '#F0A830' },
  critical: { label: '待修复', color: 'text-error', bg: 'bg-error/10', barColor: '#F87171' },
};

export function getMostCommonIssue(skills: Skill[]): string {
  const failedCount: Record<string, number> = {};

  for (const skill of skills) {
    for (const check of CHECKS) {
      if (!check.validator(skill)) {
        failedCount[check.label] = (failedCount[check.label] ?? 0) + 1;
      }
    }
  }

  const top = Object.entries(failedCount).sort((a, b) => b[1] - a[1])[0];
  if (!top) return '所有技能都已经达到展示标准。';
  return `${top[1]} 个技能还缺少“${top[0]}”相关信息。`;
}

export function calcSkillEdges(skills: Skill[], threshold = 2): SkillEdge[] {
  const edges: SkillEdge[] = [];

  for (let i = 0; i < skills.length; i += 1) {
    for (let j = i + 1; j < skills.length; j += 1) {
      const left = skills[i];
      const right = skills[j];
      const sharedTags = left.tags.filter(tag => right.tags.includes(tag));
      const triggerOverlap = left.details.triggerWords.some(trigger =>
        right.details.triggerWords.some(other => other.toLowerCase().includes(trigger.toLowerCase().slice(0, 5))),
      )
        ? 1
        : 0;

      const score = sharedTags.length + triggerOverlap;
      if (score >= threshold) edges.push({ sourceId: left.id, targetId: right.id, score, sharedTags });
    }
  }

  return edges;
}

export function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days === 1) return '昨天';
  if (days < 30) return `${days} 天前`;
  return new Date(isoString).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}
