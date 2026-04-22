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

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

function buildUrl(path: string): string {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

async function request<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const response = await fetch(buildUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) return null;
    const rawText = await response.text();
    let payload: { success?: boolean; data?: T } | null = null;
    if (rawText) {
      try {
        payload = JSON.parse(rawText) as { success?: boolean; data?: T };
      } catch {
        payload = null;
      }
    }
    if (!payload) return null;
    return payload.success ? (payload.data ?? null) : null;
  } catch {
    return null;
  }
}

export async function extractSkillMetadata(rawContent: string): Promise<AISkillSuggestion> {
  const aiResult = await request<AISkillSuggestion>('/api/ai/extract-skill-metadata', { rawContent });
  if (aiResult) return aiResult;

  return {
    description: '根据原始内容自动整理出的展示摘要，建议人工校对后再保存。',
    category: '效率流程',
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
  const aiResult = await request<EcosystemAnalysis>('/api/ai/analyze-ecosystem', { skills, edges });
  if (aiResult) return aiResult;

  return {
    summary: `当前技能库共 ${skills.length} 个技能，AI 分析暂不可用，先展示基础结果。`,
    strengths: ['技能数据已加载，可继续进行分析。'],
    gaps: ['AI 服务暂时不可用，请稍后重试。'],
    powerSkillIds: skills.slice(0, 3).map(skill => skill.id),
    suggestions: [],
    insight: '建议先检查后端 API 与密钥配置，再重新分析。',
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
