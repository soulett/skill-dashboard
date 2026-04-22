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
  detailedExplanation?: string;
}

export interface EcosystemAnalysis {
  summary: string;
  strengths: string[];
  gaps: string[];
  powerSkillIds: string[];
  suggestions: Array<{ name: string; category: string; reason: string }>;
  insight: string;
}

export interface AIPathHelpResult {
  summary: string;
  nextActions: string[];
  likelyPaths: string[];
  showHiddenSteps: {
    windows: string[];
    macos: string[];
    linux: string[];
  };
  confidence: 'low' | 'medium' | 'high';
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

async function request<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) return null;
    const payload = (await response.json()) as { success?: boolean; data?: T };
    return payload.success ? (payload.data ?? null) : null;
  } catch {
    return null;
  }
}

export async function extractSkillMetadata(rawContent: string): Promise<AISkillSuggestion> {
  await sleep(200);

  const normalized = rawContent.toLowerCase();
  const isDesign = normalized.includes('design') || normalized.includes('ux');
  const isData = normalized.includes('data') || normalized.includes('sql') || normalized.includes('analysis');

  return {
    description: '根据原始内容自动整理出的展示摘要，建议人工校对后再保存。',
    category: isDesign ? '产品设计' : isData ? '数据分析' : '效率流程',
    tags: ['assistant', 'workflow', 'automation'],
    whenToUse: ['信息不完整但需要先补齐展示卡片时', '想快速把旧资料转成可浏览技能时'],
    triggerWords: ['autofill', 'metadata', 'cleanup'],
  };
}

function fallbackSuggestions(skillTitle: string, failedFields: string[]): AIFieldSuggestion[] {
  const suggestions: AIFieldSuggestion[] = [];

  for (const field of failedFields) {
    if (field === 'description') {
      suggestions.push({
        field,
        suggestion: `${skillTitle} 用于在真实任务中快速调用关键能力，并产出可复用结果。`,
        explanation: '网络异常时使用本地兜底描述。',
        detailedExplanation: '这是技能的“一句话介绍”，用户先看它再决定是否继续点开。写法要聚焦“它帮我省什么事”，让不懂技术的用户也能马上理解价值。',
      });
    }

    if (field === 'tags') {
      suggestions.push({
        field,
        suggestion: ['automation', 'assistant', 'task'],
        explanation: '网络异常时使用本地兜底标签。',
        detailedExplanation: '标签用于搜索和筛选，决定这个技能能不能被快速找到。建议用和任务结果强相关的词，避免过于泛化的词，能明显提升检索命中率。',
      });
    }

    if (field === 'whenToUse') {
      suggestions.push({
        field,
        suggestion: ['要快速完成同类任务时', '需要统一执行口径时', '希望减少重复步骤时'],
        explanation: '网络异常时使用本地兜底场景。',
        detailedExplanation: '适用场景不是功能清单，而是“什么时候该用它”。把场景写成真实工作时刻，用户能更快判断这项技能是否适合当下任务。',
      });
    }

    if (field === 'rawContent') {
      suggestions.push({
        field,
        suggestion: `# ${skillTitle}\n\n- Purpose: clarify capability\n- Input: context\n- Output: reusable result`,
        explanation: '网络异常时使用本地兜底模板。',
        detailedExplanation: '原始内容是技能可追溯的来源，便于后续继续迭代。按“目的-输入-输出”组织能让信息完整，减少后期维护时的理解成本。',
      });
    }
  }

  return suggestions;
}

export async function suggestFieldFixes(skillTitle: string, rawContent: string, failedFields: string[]): Promise<AIFieldSuggestion[]> {
  const aiResult = await request<AIFieldSuggestion[]>('/api/ai/suggest-field-fixes', {
    skillTitle,
    rawContent,
    failedFields,
  });

  if (aiResult && aiResult.length > 0) {
    return aiResult;
  }

  return fallbackSuggestions(skillTitle, failedFields);
}

export async function analyzeSkillEcosystem(skills: Skill[], edges: SkillEdge[]): Promise<EcosystemAnalysis> {
  await sleep(320);

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
    summary: `当前技能库覆盖 ${Object.keys(categoryCount).length} 个分类，共 ${skills.length} 个技能，已经具备可演示的能力资产视图。`,
    strengths: [
      `分类覆盖较完整，当前最强方向是“${sortedCategories[0]?.[0] ?? '编程开发'}”。`,
      `已有 ${edges.length} 条技能关联线，技能之间具备可视化关系。`,
      '首页、详情、健康检查和市场页已形成完整体验闭环。',
    ],
    gaps: [
      missingCategories.length ? `仍缺少 ${missingCategories.join('、')} 类的代表技能。` : '主要分类已覆盖，可继续提升分类精度和标签质量。',
      '部分技能元信息仍可继续精炼，尤其是标签和适用场景。',
      '后续可接入真实在线分析以提升推荐质量。',
    ],
    powerSkillIds: topSkillIds.length ? topSkillIds : skills.slice(0, 3).map(skill => skill.id),
    suggestions: [
      { name: 'Prompt Library Manager', category: '效率流程', reason: '增强技能资产管理主线' },
      { name: 'Landing Page Critic', category: '产品设计', reason: '强化展示页打磨能力' },
      { name: 'Figma to React', category: '编程开发', reason: '补强设计到实现链路' },
      { name: 'Content Calendar', category: '商业营销', reason: '补齐增长运营能力' },
    ],
    insight: '当前阶段建议继续强化“可展示感 + 可管理感”，把体验闭环先做深，再扩展复杂后端能力。',
  };
}

export async function askPathHelp(input: {
  message: string;
  source?: 'codex' | 'cursor' | 'claude' | 'unknown';
  os?: 'windows' | 'macos' | 'linux' | 'unknown';
  knownPaths?: string[];
  lastError?: string;
}): Promise<AIPathHelpResult> {
  const aiResult = await request<AIPathHelpResult>('/api/ai/path-help', input);
  if (aiResult) return aiResult;

  return {
    summary: '我先给你通用排查步骤，你按顺序试一下。',
    nextActions: ['先显示隐藏文件', '再尝试常见路径', '最后回到页面选择目录导入'],
    likelyPaths: input.knownPaths?.slice(0, 6) ?? [],
    showHiddenSteps: {
      windows: ['文件资源管理器 -> 查看 -> 显示 -> 隐藏的项目'],
      macos: ['Finder 按 Command + Shift + .'],
      linux: ['文件管理器按 Ctrl + H'],
    },
    confidence: 'medium',
  };
}
