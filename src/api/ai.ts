import type { Skill, SkillEdge } from '../types';

export interface AISkillSuggestion {
  description?: string;
  category?: string;
  tags?: string[];
  whenToUse?: string[];
  triggerWords?: string[];
}

export interface AIFieldSuggestion {
  field: string;
  suggestion: string | string[];
  explanation: string;
}

export interface EcosystemAnalysis {
  summary: string;
  strengths: string[];
  gaps: string[];
  powerSkillIds: string[];
  suggestions: Array<{ name: string; category: string; reason: string }>;
  insight: string;
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export async function extractSkillMetadata(rawContent: string): Promise<AISkillSuggestion> {
  await sleep(300);

  const normalized = rawContent.toLowerCase();
  const isDesign = normalized.includes('design') || normalized.includes('ux');
  const isData = normalized.includes('data') || normalized.includes('sql') || normalized.includes('analysis');

  return {
    description: '根据原始内容自动整理出的演示版摘要，适合继续人工校对后保存。',
    category: isDesign ? '产品设计' : isData ? '数据分析' : '效率流程',
    tags: ['demo', 'auto-fill', 'skill'],
    whenToUse: ['信息不完整但需要先补齐展示卡片时', '想快速把旧资料转成可浏览技能时', '准备发布 demo 前统一润色元信息时'],
    triggerWords: ['autofill', 'metadata', 'skill cleanup'],
  };
}

export async function suggestFieldFixes(skillTitle: string, rawContent: string, failedFields: string[]): Promise<AIFieldSuggestion[]> {
  await sleep(400);

  const suggestions: AIFieldSuggestion[] = [];

  for (const field of failedFields) {
    if (field === 'description') {
      suggestions.push({
        field,
        suggestion: `${skillTitle} 用于把零散能力整理成清晰、可搜索、可演示的技能卡片。`,
        explanation: '根据标题生成了一条更适合首页展示的描述。',
      });
    }

    if (field === 'tags') {
      suggestions.push({
        field,
        suggestion: ['skill', 'demo', 'workflow'],
        explanation: '补了一组适合检索和聚合的基础标签。',
      });
    }

    if (field === 'whenToUse') {
      suggestions.push({
        field,
        suggestion: ['准备上线 demo 前补齐展示信息时', '要整理历史技能资料时', '希望统一能力库口径时'],
        explanation: '生成了 3 条更贴近演示场景的适用场景。',
      });
    }

    if (field === 'rawContent') {
      suggestions.push({
        field,
        suggestion: `---
name: ${skillTitle.toLowerCase().replace(/\s+/g, '-')}
description: demo placeholder
---

# ${skillTitle}

- Add a polished summary
- Add use cases
- Keep this block reviewable`,
        explanation: '生成了一段适合演示版的原始内容模板。',
      });
    }
  }

  if (!rawContent && !suggestions.length) {
    suggestions.push({
      field: 'description',
      suggestion: `${skillTitle} 适合在演示阶段快速补齐能力说明并统一内容口径。`,
      explanation: '在缺少原始内容时，使用标题做了保守推断。',
    });
  }

  return suggestions;
}

export async function analyzeSkillEcosystem(skills: Skill[], edges: SkillEdge[]): Promise<EcosystemAnalysis> {
  await sleep(450);

  const categoryCount: Record<string, number> = {};
  const degree: Record<string, number> = {};

  skills.forEach(skill => {
    categoryCount[skill.category] = (categoryCount[skill.category] ?? 0) + 1;
  });

  edges.forEach(edge => {
    degree[edge.sourceId] = (degree[edge.sourceId] ?? 0) + 1;
    degree[edge.targetId] = (degree[edge.targetId] ?? 0) + 1;
  });

  const sortedCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);
  const topSkillIds = Object.entries(degree).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id);
  const missingCategories = ['编程开发', '内容创作', '数据分析', '产品设计', '效率流程', '商业营销'].filter(category => !categoryCount[category]);

  return {
    summary: `当前技能库已经形成一套可演示的能力地图，覆盖 ${Object.keys(categoryCount).length} 个分类、${skills.length} 个技能。整体更偏向“个人 AI 工作台”，适合展示发现、管理与扩充技能资产的产品方向。`,
    strengths: [
      `分类覆盖较完整，当前最强的是“${sortedCategories[0]?.[0] ?? '编程开发'}”方向。`,
      `已有 ${edges.length} 条技能关联线，说明技能之间存在可视化关系。`,
      '首页、详情、健康检查和市场页已经能构成一个完整演示闭环。',
    ],
    gaps: [
      missingCategories.length ? `仍缺少 ${missingCategories.join('、')} 类的更强代表技能。` : '各主分类都有覆盖，但“其他”类还可以继续收敛。',
      '部分技能的元信息还不够标准化，影响健康分数和搜索体验。',
      '当前仍是演示数据，真实扫描与写回能力尚未接入。',
    ],
    powerSkillIds: topSkillIds.length ? topSkillIds : skills.slice(0, 3).map(skill => skill.id),
    suggestions: [
      { name: 'Prompt Library Manager', category: '效率流程', reason: '补强技能资产管理主线' },
      { name: 'Landing Page Critic', category: '产品设计', reason: '增强首页展示打磨能力' },
      { name: 'Figma to React', category: '编程开发', reason: '提升设计到实现链路' },
      { name: 'Content Calendar', category: '商业营销', reason: '补齐增长运营侧能力' },
    ],
    insight: '如果你的目标是先把 demo 上线，优先继续强化“可展示感”和“资产管理感”，而不是马上接真实后端。',
  };
}
