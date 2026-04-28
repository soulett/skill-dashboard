import type { RecommendationCardItem, Skill } from '../src/types';

interface SuggestFieldFixesInput {
  skillTitle: string;
  rawContent: string;
  failedFields: string[];
}

interface PathHelpInput {
  message: string;
  source?: 'codex' | 'cursor' | 'claude' | 'unknown';
  os?: 'windows' | 'macos' | 'linux' | 'unknown';
  knownPaths?: string[];
  lastError?: string;
}

interface AIFieldSuggestion {
  field: string;
  suggestion: string | string[];
  explanation: string;
  detailedExplanation?: string;
}

interface SiliconFlowResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface PathHelpResponse {
  summary: string;
  nextActions: string[];
  likelyPaths: string[];
  showHiddenSteps: Record<'windows' | 'macos' | 'linux', string[]>;
  confidence: 'low' | 'medium' | 'high';
}

interface AISkillSuggestion {
  description?: string;
  category?: string;
  tags?: string[];
  whenToUse?: string[];
  triggerWords?: string[];
}

interface AIEcosystemSkill {
  id: string;
  title: string;
  category: string;
  tags: string[];
}

interface AIEcosystemEdge {
  sourceId: string;
  targetId: string;
  score: number;
  sharedTags: string[];
}

interface EcosystemAnalysis {
  summary: string;
  strengths: string[];
  gaps: string[];
  powerSkillIds: string[];
  suggestions: Array<{ name: string; category: string; reason: string }>;
  insight: string;
}

const TAG_TRANSLATION: Record<string, string> = {
  api: '接口',
  plugin: '插件',
  plugins: '插件',
  codex: 'Codex',
  workflow: '流程',
  automation: '自动化',
  script: '脚本',
  scripts: '脚本',
  config: '配置',
  configuration: '配置',
  setup: '初始化',
  marketplace: '市场发布',
  metadata: '元信息',
  json: 'JSON',
  skill: '技能',
};

function getEnvConfig() {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase();
  const apiKey = process.env.AI_API_KEY?.trim() || process.env.SILICONFLOW_API_KEY?.trim();
  const defaultBaseUrl = provider === 'deepseek' ? 'https://api.deepseek.com' : 'https://api.siliconflow.cn/v1';
  const baseUrl = (process.env.AI_BASE_URL?.trim() || process.env.SILICONFLOW_BASE_URL?.trim() || defaultBaseUrl).replace(/\/+$/, '');
  const model =
    process.env.AI_MODEL_PRIMARY?.trim() ||
    process.env.AI_MODEL?.trim() ||
    process.env.SILICONFLOW_MODEL?.trim() ||
    (provider === 'deepseek' ? 'deepseek-chat' : 'Pro/zai-org/GLM-5.1');
  return { apiKey, baseUrl, model };
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // continue
  }

  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i)?.[1] ?? text.match(/```([\s\S]*?)```/i)?.[1];
  if (!fenced) return null;

  try {
    return JSON.parse(fenced);
  } catch {
    return null;
  }
}

function normalizeSimpleTag(tag: string): string {
  const cleaned = tag.trim().replace(/^#/, '').toLowerCase();
  if (!cleaned) return '';
  return TAG_TRANSLATION[cleaned] ?? tag.trim();
}

function splitSuggestionList(value: string): string[] {
  return value
    .split(/\r?\n|[;,，；、/]|(?:\d+\s*[.)、])/g)
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeSuggestion(item: unknown, fallbackField: string): AIFieldSuggestion | null {
  if (!item || typeof item !== 'object') return null;
  const candidate = item as Record<string, unknown>;
  const field = typeof candidate.field === 'string' && candidate.field.trim() ? candidate.field.trim() : fallbackField;
  const suggestion = candidate.suggestion;
  const explanationRaw = typeof candidate.explanation === 'string' && candidate.explanation.trim() ? candidate.explanation.trim() : '基于技能上下文生成。';
  const explanation = explanationRaw.slice(0, 60);
  const detailedExplanationRaw =
    typeof candidate.detailedExplanation === 'string' && candidate.detailedExplanation.trim()
      ? candidate.detailedExplanation.trim()
      : '';
  const detailedExplanation = detailedExplanationRaw.slice(0, 220);

  if (field === 'tags' || field === 'whenToUse') {
    const fromString =
      typeof suggestion === 'string' && suggestion.trim()
        ? splitSuggestionList(suggestion).map(tag => (field === 'tags' ? normalizeSimpleTag(tag) : tag))
        : [];
    const fromArray = Array.isArray(suggestion)
      ? suggestion
          .filter(value => typeof value === 'string')
          .map(value => (field === 'tags' ? normalizeSimpleTag(value) : value))
          .map(value => value.trim())
          .filter(Boolean)
      : [];
    const merged = [...new Set([...fromString, ...fromArray])].slice(0, 6);
    if (merged.length > 0) {
      return { field, suggestion: merged, explanation, detailedExplanation };
    }
    return null;
  }

  if (typeof suggestion === 'string' && suggestion.trim()) {
    return { field, suggestion: suggestion.trim(), explanation, detailedExplanation };
  }

  if (Array.isArray(suggestion)) {
    const cleaned = suggestion
      .filter(value => typeof value === 'string')
      .map(value => normalizeSimpleTag(value))
      .map(value => value.trim())
      .filter(Boolean)
      .slice(0, 6);

    if (cleaned.length > 0) return { field, suggestion: cleaned, explanation, detailedExplanation };
  }

  return null;
}

function fallbackSuggestions(skillTitle: string, failedFields: string[]): AIFieldSuggestion[] {
  const result: AIFieldSuggestion[] = [];

  for (const field of failedFields) {
    if (field === 'tags') {
      result.push({
        field,
        suggestion: ['插件开发', '配置文件', '功能扩展'],
        explanation: `${skillTitle} 使用本地兜底建议，便于小白快速理解。`,
        detailedExplanation: '标签是帮助用户搜索和筛选的关键词。用“插件开发、配置文件、功能扩展”这类词，能让用户在分类浏览时更快找到它，也能减少“看了标题但不确定能做什么”的情况。',
      });
    } else if (field === 'description' || field === 'whatItDoes') {
      result.push({
        field,
        suggestion: `${skillTitle}可以帮你把重复操作整理成更省事的固定流程。`,
        explanation: '网络异常时使用本地兜底描述。',
        detailedExplanation: '这个字段是用户第一眼看到的能力简介。重点要说清“它替我省掉了什么麻烦”，而不是写技术实现细节，这样非技术用户也能立刻判断是否值得用。',
      });
    } else if (field === 'whenToUse') {
      result.push({
        field,
        suggestion: ['刚开始搭建时', '要新增功能时', '准备发布前检查时'],
        explanation: '网络异常时使用本地兜底场景。',
        detailedExplanation: '适用场景的作用是告诉用户“什么时候点开它最划算”。写成具体工作时刻（如发布前检查）会比抽象描述更容易代入，也更容易触发真实使用。',
      });
    } else if (field === 'rawContent') {
      result.push({
        field,
        suggestion: `# ${skillTitle}\n\n- 能解决什么问题\n- 适合什么时候用\n- 产出是什么`,
        explanation: '网络异常时使用本地兜底模板。',
        detailedExplanation: '原始内容是可追溯的依据，方便后续继续编辑和迭代。用“问题-场景-产出”的结构，能确保信息完整，避免以后只剩一句口号无法维护。',
      });
    }
  }

  return result;
}

function detectSourceFromText(text: string): 'codex' | 'cursor' | 'claude' | 'unknown' {
  const normalized = text.toLowerCase();
  if (normalized.includes('cursor')) return 'cursor';
  if (normalized.includes('codex')) return 'codex';
  if (normalized.includes('claude')) return 'claude';
  return 'unknown';
}

function detectOsFromText(text: string): 'windows' | 'macos' | 'linux' | 'unknown' {
  const normalized = text.toLowerCase();
  if (normalized.includes('windows') || normalized.includes('win11') || normalized.includes('win10')) return 'windows';
  if (normalized.includes('mac') || normalized.includes('osx') || normalized.includes('macos')) return 'macos';
  if (normalized.includes('linux') || normalized.includes('ubuntu')) return 'linux';
  return 'unknown';
}

function fallbackPathHelp(input: PathHelpInput): PathHelpResponse {
  const text = `${input.message}\n${input.lastError ?? ''}`;
  const source = input.source && input.source !== 'unknown' ? input.source : detectSourceFromText(text);
  const os = input.os && input.os !== 'unknown' ? input.os : detectOsFromText(text);

  const sourcePaths: Record<'codex' | 'cursor' | 'claude' | 'unknown', string[]> = {
    codex: ['~/.codex/skills', 'C:\\Users\\<用户名>\\.codex\\skills'],
    cursor: ['~/.cursor/skills', '~/.cursor/skills-cursor', '<project>/.cursor/skills'],
    claude: ['~/.claude/skills', '<project>/.claude/skills', 'C:\\Users\\<用户名>\\.claude\\skills'],
    unknown: ['~/.codex/skills', '~/.cursor/skills', '~/.claude/skills'],
  };

  const osSteps: Record<'windows' | 'macos' | 'linux', string[]> = {
    windows: ['打开文件资源管理器', '点击“查看”->“显示”->勾选“隐藏的项目”', '进入候选路径后选择对应目录导入'],
    macos: ['打开 Finder', '按 Command + Shift + . 显示隐藏文件', '进入候选路径后选择对应目录导入'],
    linux: ['打开文件管理器', '按 Ctrl + H 显示隐藏文件', '进入候选路径后选择对应目录导入'],
  };

  const likelyPaths = [...new Set([...(input.knownPaths ?? []), ...sourcePaths[source]])].slice(0, 6);
  const nextActions = [
    '先在文件选择器显示隐藏文件',
    `优先尝试 ${source === 'unknown' ? '与你工具对应' : source} 的候选路径`,
    '找到目录后回到页面点击“选择目录导入”',
  ];

  return {
    summary: os === 'unknown' ? '我先给你最可能的目录和通用排查步骤。' : `先按 ${os === 'windows' ? 'Windows' : os === 'macos' ? 'macOS' : 'Linux'} 的隐藏文件步骤操作，再试候选路径。`,
    nextActions,
    likelyPaths,
    showHiddenSteps: osSteps,
    confidence: source === 'unknown' || os === 'unknown' ? 'medium' : 'high',
  };
}

export async function suggestFieldFixesWithAI(input: SuggestFieldFixesInput): Promise<AIFieldSuggestion[]> {
  const { apiKey, baseUrl, model } = getEnvConfig();
  const { skillTitle, rawContent, failedFields } = input;

  if (!apiKey) return fallbackSuggestions(skillTitle, failedFields);

  const promptPayload = {
    skill_title: skillTitle,
    failed_fields: failedFields,
    raw_content_excerpt: rawContent.slice(0, 6000),
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 1000,
      messages: [
        {
          role: 'system',
          content:
            '你是“技能资料优化助手”。你的输出必须是 JSON 数组，不能有任何额外文字。' +
            '每个元素结构为 {field, suggestion, explanation, detailedExplanation}。' +
            '写作风格必须面向非技术用户：用口语化中文，避免术语堆叠，句子短、直接、好懂。' +
            'explanation 要写成“给用户看的一句话原因”，让用户读完就知道为什么要改。',
        },
        {
          role: 'user',
          content:
            `请根据下列技能信息生成修复建议：\n${JSON.stringify(promptPayload, null, 2)}\n\n` +
            '必须遵守：\n' +
            '1) 只输出 failed_fields 对应项。\n' +
            '2) tags 输出 3-6 个词，优先中文短词，避免过泛词（如 demo、skill、workflow）。\n' +
            '3) whenToUse 输出 2-4 条“生活化/工作化”短场景，面向小白可读。\n' +
            '4) description/whatItDoes 用一句话说清“它帮我省什么事”。\n' +
            '5) explanation 每条不超过 30 个字。\n' +
            '6) detailedExplanation 每条 80-180 字，必须包含：这个字段是什么 + 为什么这样写更好。\n' +
            '7) detailedExplanation 禁止空话，必须给可执行改法示例。\n' +
            '8) 输出必须是可被 JSON.parse 的纯 JSON 数组。',
        },
      ],
    }),
  });

  if (!response.ok) return fallbackSuggestions(skillTitle, failedFields);

  const data = (await response.json()) as SiliconFlowResponse;
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) return fallbackSuggestions(skillTitle, failedFields);

  const parsed = tryParseJson(content);
  if (!Array.isArray(parsed)) return fallbackSuggestions(skillTitle, failedFields);

  const normalized = parsed
    .map((item, index) => normalizeSuggestion(item, failedFields[index] ?? failedFields[0] ?? 'description'))
    .filter((item): item is AIFieldSuggestion => item !== null)
    .filter(item => failedFields.includes(item.field));

  return normalized.length > 0 ? normalized : fallbackSuggestions(skillTitle, failedFields);
}

export async function suggestPathHelpWithAI(input: PathHelpInput): Promise<PathHelpResponse> {
  const { apiKey, baseUrl, model } = getEnvConfig();

  if (!apiKey) return fallbackPathHelp(input);

  const payload = {
    message: input.message,
    source: input.source ?? 'unknown',
    os: input.os ?? 'unknown',
    known_paths: input.knownPaths ?? [],
    last_error: input.lastError ?? '',
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 1200,
      messages: [
        {
          role: 'system',
          content:
            '你是“本地路径定位助手”，面向非技术用户。你必须只输出 JSON 对象，不能输出任何额外文字。' +
            'JSON 结构必须是 {summary,nextActions,likelyPaths,showHiddenSteps,confidence}。' +
            '其中 nextActions 和 likelyPaths 为字符串数组；showHiddenSteps 为 windows/macos/linux 三个数组。',
        },
        {
          role: 'user',
          content:
            `请根据下面信息生成定位建议：\n${JSON.stringify(payload, null, 2)}\n\n` +
            '要求：\n' +
            '1) 先给可执行步骤，后给解释；\n' +
            '2) likelyPaths 最多 6 条，优先高概率路径；\n' +
            '3) 语言简短、口语化、面向小白；\n' +
            '4) confidence 只能是 low/medium/high；\n' +
            '5) 仅输出 JSON。',
        },
      ],
    }),
  });

  if (!response.ok) return fallbackPathHelp(input);

  const data = (await response.json()) as SiliconFlowResponse;
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) return fallbackPathHelp(input);
  const parsed = tryParseJson(content);
  if (!parsed || typeof parsed !== 'object') return fallbackPathHelp(input);

  const candidate = parsed as Partial<PathHelpResponse>;
  const fallback = fallbackPathHelp(input);

  const normalized: PathHelpResponse = {
    summary: typeof candidate.summary === 'string' && candidate.summary.trim() ? candidate.summary.trim() : fallback.summary,
    nextActions: Array.isArray(candidate.nextActions)
      ? candidate.nextActions.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean).slice(0, 5)
      : fallback.nextActions,
    likelyPaths: Array.isArray(candidate.likelyPaths)
      ? candidate.likelyPaths.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean).slice(0, 6)
      : fallback.likelyPaths,
    showHiddenSteps:
      candidate.showHiddenSteps &&
      typeof candidate.showHiddenSteps === 'object' &&
      Array.isArray((candidate.showHiddenSteps as any).windows) &&
      Array.isArray((candidate.showHiddenSteps as any).macos) &&
      Array.isArray((candidate.showHiddenSteps as any).linux)
        ? (candidate.showHiddenSteps as PathHelpResponse['showHiddenSteps'])
        : fallback.showHiddenSteps,
    confidence: candidate.confidence === 'low' || candidate.confidence === 'medium' || candidate.confidence === 'high' ? candidate.confidence : fallback.confidence,
  };

  if (normalized.nextActions.length === 0) normalized.nextActions = fallback.nextActions;
  normalized.likelyPaths = [...new Set([...(input.knownPaths ?? []), ...normalized.likelyPaths, ...fallback.likelyPaths])].slice(0, 6);
  return normalized;
}

function fallbackExtractSkillMetadata(rawContent: string): AISkillSuggestion {
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

function fallbackEcosystemAnalysis(skills: AIEcosystemSkill[], edges: AIEcosystemEdge[]): EcosystemAnalysis {
  const categoryCount: Record<string, number> = {};
  const degree: Record<string, number> = {};

  for (const skill of skills) {
    categoryCount[skill.category] = (categoryCount[skill.category] ?? 0) + 1;
  }

  for (const edge of edges) {
    degree[edge.sourceId] = (degree[edge.sourceId] ?? 0) + 1;
    degree[edge.targetId] = (degree[edge.targetId] ?? 0) + 1;
  }

  const sortedCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);
  const topSkillIds = Object.entries(degree)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);

  const missingCategories = ['编程开发', '内容创作', '数据分析', '产品设计', '效率流程', '商业营销'].filter(
    category => !categoryCount[category],
  );

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

export async function extractSkillMetadataWithAI(rawContent: string): Promise<AISkillSuggestion> {
  const { apiKey, baseUrl, model } = getEnvConfig();
  if (!apiKey) return fallbackExtractSkillMetadata(rawContent);

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 900,
      messages: [
        {
          role: 'system',
          content:
            '你是技能元信息提取助手。仅输出 JSON 对象，格式为 {description,category,tags,whenToUse,triggerWords}。' +
            '面向非技术用户，中文简洁可读。',
        },
        {
          role: 'user',
          content:
            `请从以下技能内容提取元信息：\n${rawContent.slice(0, 7000)}\n\n` +
            '要求：\n' +
            '1) category 只能从 编程开发/内容创作/数据分析/产品设计/效率流程/商业营销/其他 中选择。\n' +
            '2) tags 与 triggerWords 各给 3-8 个短词。\n' +
            '3) whenToUse 给 2-4 条生活化或工作化场景。\n' +
            '4) 仅输出 JSON。',
        },
      ],
    }),
  });

  if (!response.ok) return fallbackExtractSkillMetadata(rawContent);
  const data = (await response.json()) as SiliconFlowResponse;
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) return fallbackExtractSkillMetadata(rawContent);
  const parsed = tryParseJson(content);
  if (!parsed || typeof parsed !== 'object') return fallbackExtractSkillMetadata(rawContent);
  const candidate = parsed as Record<string, unknown>;

  const normalizeList = (value: unknown, limit = 8): string[] =>
    (Array.isArray(value) ? value : typeof value === 'string' ? splitSuggestionList(value) : [])
      .filter(item => typeof item === 'string')
      .map(item => String(item).trim())
      .filter(Boolean)
      .slice(0, limit);

  const result: AISkillSuggestion = {
    description: typeof candidate.description === 'string' ? candidate.description.trim() : undefined,
    category: typeof candidate.category === 'string' ? candidate.category.trim() : undefined,
    tags: normalizeList(candidate.tags, 8),
    whenToUse: normalizeList(candidate.whenToUse, 4),
    triggerWords: normalizeList(candidate.triggerWords, 8),
  };

  if (!result.description && !result.category && (result.tags?.length ?? 0) === 0 && (result.whenToUse?.length ?? 0) === 0) {
    return fallbackExtractSkillMetadata(rawContent);
  }

  return result;
}

export async function analyzeSkillEcosystemWithAI(input: {
  skills: AIEcosystemSkill[];
  edges: AIEcosystemEdge[];
}): Promise<EcosystemAnalysis> {
  const { apiKey, baseUrl, model } = getEnvConfig();
  if (!apiKey) return fallbackEcosystemAnalysis(input.skills, input.edges);

  const payload = {
    skills: input.skills.slice(0, 300),
    edges: input.edges.slice(0, 1200),
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 1400,
      messages: [
        {
          role: 'system',
          content:
            '你是技能生态分析助手。只输出 JSON 对象，格式必须是 ' +
            '{summary,strengths,gaps,powerSkillIds,suggestions,insight}。' +
            '其中 suggestions 为 [{name,category,reason}]。',
        },
        {
          role: 'user',
          content:
            `请分析以下技能网络数据：\n${JSON.stringify(payload)}\n\n` +
            '要求：\n' +
            '1) strengths/gaps 各给 2-4 条。\n' +
            '2) powerSkillIds 从给定 skills.id 中选择 1-5 个。\n' +
            '3) suggestions 给 2-5 条可补充方向。\n' +
            '4) 语言简洁，面向产品演示场景。\n' +
            '5) 仅输出 JSON。',
        },
      ],
    }),
  });

  if (!response.ok) return fallbackEcosystemAnalysis(input.skills, input.edges);
  const data = (await response.json()) as SiliconFlowResponse;
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) return fallbackEcosystemAnalysis(input.skills, input.edges);
  const parsed = tryParseJson(content);
  if (!parsed || typeof parsed !== 'object') return fallbackEcosystemAnalysis(input.skills, input.edges);

  const candidate = parsed as Partial<EcosystemAnalysis>;
  const fallback = fallbackEcosystemAnalysis(input.skills, input.edges);
  const allSkillIds = new Set(input.skills.map(skill => skill.id));
  const listOfStrings = (value: unknown, limit: number) =>
    (Array.isArray(value) ? value : [])
      .filter(item => typeof item === 'string')
      .map(item => item.trim())
      .filter(Boolean)
      .slice(0, limit);

  const suggestions = (Array.isArray(candidate.suggestions) ? candidate.suggestions : [])
    .map(item => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const name = typeof row.name === 'string' ? row.name.trim() : '';
      const category = typeof row.category === 'string' ? row.category.trim() : '';
      const reason = typeof row.reason === 'string' ? row.reason.trim() : '';
      if (!name || !category || !reason) return null;
      return { name, category, reason };
    })
    .filter((item): item is { name: string; category: string; reason: string } => item !== null)
    .slice(0, 5);

  const result: EcosystemAnalysis = {
    summary: typeof candidate.summary === 'string' && candidate.summary.trim() ? candidate.summary.trim() : fallback.summary,
    strengths: listOfStrings(candidate.strengths, 4),
    gaps: listOfStrings(candidate.gaps, 4),
    powerSkillIds: listOfStrings(candidate.powerSkillIds, 5).filter(id => allSkillIds.has(id)),
    suggestions,
    insight: typeof candidate.insight === 'string' && candidate.insight.trim() ? candidate.insight.trim() : fallback.insight,
  };

  if (result.strengths.length === 0) result.strengths = fallback.strengths;
  if (result.gaps.length === 0) result.gaps = fallback.gaps;
  if (result.powerSkillIds.length === 0) result.powerSkillIds = fallback.powerSkillIds;
  if (result.suggestions.length === 0) result.suggestions = fallback.suggestions;

  return result;
}

interface PromptRecommendInput {
  prompt: string;
  topK?: number;
  skills: Skill[];
}

interface PromptRecommendResult {
  items: RecommendationCardItem[];
  fallbackUsed: boolean;
}

const NARRATIVE_ROLES: Array<'start' | 'detail' | 'collab' | 'qa' | 'delivery'> = ['start', 'detail', 'collab', 'qa', 'delivery'];

function tokenizePrompt(value: string): string[] {
  const normalized = value
    .toLowerCase()
    .replace(/[`"'.,/\\()[\]{}:+*?!]/g, ' ')
    .trim();

  const parts = normalized.match(/[\p{Script=Han}]+|[a-z0-9_-]+/gu) ?? [];
  const tokens: string[] = [];

  for (const part of parts) {
    const item = part.trim();
    if (!item) continue;
    if (/^[a-z0-9_-]+$/.test(item)) {
      if (item.length >= 2) tokens.push(item);
      continue;
    }
    // For Chinese, keep the whole phrase and add 2-char grams for better matching.
    if (item.length >= 2) tokens.push(item);
    for (let i = 0; i < item.length - 1; i += 1) {
      tokens.push(item.slice(i, i + 2));
    }
  }

  return [...new Set(tokens)];
}

function inferSourceMeta(sourcePath: string): { sourceLabel: string; sourceClassName: string } {
  const normalized = sourcePath.toLowerCase().replaceAll('\\', '/');
  if (normalized.includes('/.codex/') || normalized.startsWith('local://codex/')) {
    return { sourceLabel: 'Codex', sourceClassName: 'bg-primary/12 text-primary border-primary/30' };
  }
  if (normalized.includes('/.cursor/') || normalized.startsWith('local://cursor/')) {
    return { sourceLabel: 'Cursor', sourceClassName: 'bg-info/12 text-info border-info/30' };
  }
  if (normalized.includes('/.claude/') || normalized.startsWith('local://claude/')) {
    return { sourceLabel: 'Claude', sourceClassName: 'bg-warning/12 text-warning border-warning/30' };
  }
  return { sourceLabel: 'Other', sourceClassName: 'bg-surface-bright text-on-surface-muted border-outline-subtle' };
}

function inferHealthMeta(skill: Skill): { healthLabel: string; healthClassName: string } {
  if (skill.status === 'active') return { healthLabel: '信息完整', healthClassName: 'bg-success/12 text-success border-success/30' };
  if (skill.status === 'updating') return { healthLabel: '更新中', healthClassName: 'bg-warning/12 text-warning border-warning/30' };
  return { healthLabel: '待补充', healthClassName: 'bg-warning/12 text-warning border-warning/30' };
}

function buildRuleReasonBlocksForPrompt(skill: Skill, prompt: string): [string, string, string] {
  const firstTag = skill.tags[0] ?? '当前任务';
  const title = skill.title || '这条 skill';
  const category = skill.category || '通用';
  const whenToUse = skill.details.whenToUse?.[0] ?? '';
  const hint = [title, category, ...skill.tags, whenToUse].join(' ').toLowerCase();

  let firstLine = `你想做“${prompt}”，${title}能先帮你把第一步搭起来，避免空白开局。`;
  if (hint.includes('prd') || hint.includes('产品') || hint.includes('需求')) {
    firstLine = `你想做“${prompt}”，${title}会先帮你搭好文档骨架，把需求说清楚再往下推进。`;
  } else if (hint.includes('分析') || hint.includes('research') || hint.includes('调研')) {
    firstLine = `你想做“${prompt}”，${title}更适合先把问题和目标拆开，避免一上来就写偏。`;
  } else if (hint.includes('前端') || hint.includes('ui') || hint.includes('react') || hint.includes('界面')) {
    firstLine = `你想做“${prompt}”，${title}可以先落到页面结构和关键交互，方便你快速出第一版。`;
  } else if (hint.includes('测试') || hint.includes('质量') || hint.includes('debug')) {
    firstLine = `你想做“${prompt}”，${title}会先帮你把风险点和检查步骤拉出来，减少后面返工。`;
  } else if (hint.includes('协作') || hint.includes('评审') || hint.includes('共创')) {
    firstLine = `你想做“${prompt}”，${title}先把协作流程对齐，避免多人理解不一致。`;
  }

  return [
    firstLine,
    `这条 skill 是针对“${firstTag}”情景设计的，和你要做的事在核心步骤上匹配度很高。`,
    `如果你的目标更偏离“${firstTag}”，建议再搭配 1-2 条相邻 skill 一起用。`,
  ];
}

function scoreSkillByPrompt(skill: Skill, promptTokens: string[]): number {
  if (promptTokens.length === 0) return 0;
  const haystack = [
    skill.title,
    skill.description,
    skill.category,
    ...skill.tags,
    ...(skill.details.whenToUse ?? []),
    ...(skill.details.triggerWords ?? []),
  ]
    .join(' ')
    .toLowerCase();

  let score = 0;
  for (const token of promptTokens) {
    if (haystack.includes(token)) score += token.length >= 4 ? 5 : 3;
  }
  const titleLower = skill.title.toLowerCase();
  for (const token of promptTokens) {
    if (titleLower.includes(token)) score += 4;
  }
  if (skill.status === 'active') score += 1;
  return score;
}

async function callSiliconFlowModel(
  baseUrl: string,
  apiKey: string,
  model: string,
  timeoutMs: number,
  messages: Array<{ role: 'system' | 'user'; content: string }>,
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 700,
        response_format: { type: 'json_object' },
        messages,
      }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as SiliconFlowResponse;
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function getPromptAiConfig() {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase();
  const apiKey = process.env.AI_API_KEY?.trim() || process.env.SILICONFLOW_API_KEY?.trim() || '';
  const defaultBaseUrl = provider === 'deepseek' ? 'https://api.deepseek.com' : 'https://api.siliconflow.cn/v1';
  const baseUrl = (process.env.AI_BASE_URL?.trim() || process.env.SILICONFLOW_BASE_URL?.trim() || defaultBaseUrl).replace(/\/+$/, '');
  const defaultModel = provider === 'deepseek' ? 'deepseek-v4-flash' : 'Pro/zai-org/GLM-5.1';
  const modelPrimary = process.env.AI_MODEL_PRIMARY?.trim() || process.env.AI_MODEL?.trim() || process.env.SILICONFLOW_MODEL?.trim() || defaultModel;
  let modelFallback = process.env.AI_MODEL_FALLBACK?.trim() || modelPrimary;
  // DeepSeek path: single-model first for stability and latency (avoid serial timeout compounding).
  if (provider === 'deepseek') modelFallback = modelPrimary;
  const timeoutMsRaw = Number(process.env.AI_TIMEOUT_MS ?? 2000);
  const timeoutMs = Number.isFinite(timeoutMsRaw) ? Math.max(timeoutMsRaw, 800) : 2000;
  const timeoutFloor = 800;
  return { provider, apiKey, baseUrl, modelPrimary, modelFallback, timeoutMs: Math.max(timeoutMs, timeoutFloor) };
}

function extractIdsFromLooseText(
  text: string,
  allowedIds: Set<string>,
  titleToId?: Map<string, string>,
): string[] {
  const found: string[] = [];
  for (const id of allowedIds) {
    if (text.includes(id)) found.push(id);
  }
  if (found.length > 0) return found;

  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const candidates: string[] = [];
  for (const line of lines) {
    const cleaned = line.replace(/^[-*+\d.)\s]+/, '').trim();
    if (allowedIds.has(cleaned)) candidates.push(cleaned);
    if (titleToId) {
      const mapped = titleToId.get(cleaned.toLowerCase());
      if (mapped) candidates.push(mapped);
    }
  }
  return [...new Set(candidates)];
}

function resolveCandidateId(
  rawId: string,
  rawTitle: string,
  allowedIds: Set<string>,
  titleToId: Map<string, string>,
): string {
  const id = rawId.trim();
  if (id && allowedIds.has(id)) return id;

  if (id) {
    for (const candidateId of allowedIds) {
      if (candidateId.includes(id) || id.includes(candidateId)) return candidateId;
    }
  }

  const title = rawTitle.trim().toLowerCase();
  if (title) {
    const exact = titleToId.get(title);
    if (exact && allowedIds.has(exact)) return exact;
    for (const [knownTitle, candidateId] of titleToId.entries()) {
      if (knownTitle.includes(title) || title.includes(knownTitle)) {
        if (allowedIds.has(candidateId)) return candidateId;
      }
    }
  }

  return '';
}

function toRecommendationCardFromSkill(skill: Skill, prompt: string): RecommendationCardItem {
  const sourceMeta = inferSourceMeta(skill.sourcePath);
  const healthMeta = inferHealthMeta(skill);
  const reasonBlocks = buildRuleReasonBlocksForPrompt(skill, prompt);
  return {
    id: skill.id,
    title: skill.title,
    description: skill.description,
    recommendationReason: reasonBlocks.join(' '),
    evidenceLabel: '规则匹配 + AI增强',
    reasonBlocks,
    sourceLabel: sourceMeta.sourceLabel,
    sourceClassName: sourceMeta.sourceClassName,
    healthLabel: healthMeta.healthLabel,
    healthClassName: healthMeta.healthClassName,
    tags: skill.tags.slice(0, 3),
    matchedSkillId: skill.id,
  };
}

function roleLine(role: (typeof NARRATIVE_ROLES)[number], prompt: string, title: string): string {
  if (role === 'start') return `你想做“${prompt}”，${title}适合先把骨架搭起来，让任务快速起步。`;
  if (role === 'detail') return `围绕“${prompt}”，${title}更适合补齐关键细节，避免中途返工。`;
  if (role === 'collab') return `如果“${prompt}”涉及多人协作，${title}更适合先拉齐理解和分工。`;
  if (role === 'qa') return `针对“${prompt}”，${title}这条更偏检查与校正，能提前发现风险点。`;
  return `当“${prompt}”进入落地阶段，${title}更适合推动结果输出与交付。`;
}

function rewriteForDistinctNarrative(
  items: RecommendationCardItem[],
  prompt: string,
): RecommendationCardItem[] {
  return items.map((item, index) => {
    const role = NARRATIVE_ROLES[index % NARRATIVE_ROLES.length];
    const tag = item.tags[0] ?? '当前任务';
    const line1 = roleLine(role, prompt, item.title);
    const line2 = `这条 skill 是针对“${tag}”情景设计的，和你当前需求在关键步骤上匹配度较高。`;
    const line3 =
      role === 'delivery'
        ? `建议在前置信息明确后再重点使用它，这样输出会更稳定。`
        : `如果后续目标变化，建议搭配一条相邻类型 skill 一起用。`;
    const reasonBlocks: [string, string, string] = [line1, line2, line3];
    return {
      ...item,
      reasonBlocks,
      recommendationReason: reasonBlocks.join(' '),
    };
  });
}

export async function recommendByPromptWithAI(input: PromptRecommendInput): Promise<PromptRecommendResult> {
  const prompt = input.prompt.trim();
  const topK = Math.max(1, Math.min(input.topK ?? 5, 10));
  const promptTokens = tokenizePrompt(prompt);
  const rankedSkills = [...input.skills]
    .map(skill => ({ skill, score: scoreSkillByPrompt(skill, promptTokens) }))
    .sort((a, b) => b.score - a.score)
    .filter(item => item.score > 0);

  const pool = (rankedSkills.length > 0 ? rankedSkills : input.skills.map(skill => ({ skill, score: 0 }))).slice(0, 12);
  const ruleTop = pool.slice(0, topK).map(item => toRecommendationCardFromSkill(item.skill, prompt));
  if (ruleTop.length === 0) {
    console.warn('[prompt-reco] fallback: no rule candidates');
    return { items: [], fallbackUsed: true };
  }

  const { provider, apiKey, baseUrl, modelPrimary, modelFallback, timeoutMs } = getPromptAiConfig();
  if (!apiKey) {
    console.warn('[prompt-reco] fallback: missing AI_API_KEY/SILICONFLOW_API_KEY');
    return { items: rewriteForDistinctNarrative(ruleTop, prompt), fallbackUsed: true };
  }

  const candidatePayload = pool.map(item => ({
    id: item.skill.id,
    title: item.skill.title,
    description: item.skill.description.slice(0, 120),
    category: item.skill.category,
    tags: item.skill.tags.slice(0, 6),
    score: item.score,
  }));

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    {
      role: 'system',
      content:
        '你是本地 skill 推荐解释器。目标：让每条推荐理由有明显差异，避免同类 skill 说法雷同。' +
        '你只能在候选池中重排，不能返回池外 ID。' +
        '你必须只输出 JSON（无 markdown、无解释）：{"items":[{"id":"...","title":"...","reasonBlocks":["...","...","..."]}]}' +
        '写作硬约束：' +
        '1) reasonBlocks[0] 必须不同句式，不得复用同一开头；' +
        '2) reasonBlocks[0] 必须覆盖不同任务切面（起步/细化/协作/验证/交付），同批不重复；' +
        '3) reasonBlocks[1] 必须引用该 skill 的两个不同信息点，并写成“它更适合【A】场景，尤其在【B】这一步更有优势”；' +
        '4) 同批 5 条里，reasonBlocks[1] 禁止复用相同 A/B 组合；' +
        '5) reasonBlocks[2] 必须给不同的边界或搭配建议，不能都写“建议搭配其他 skill”；' +
        '6) 若无法保证差异度，宁可减少条数，也不要输出重复话术。' +
        '语言要求：面向非技术用户，口语化，不术语堆叠。',
    },
    {
      role: 'user',
      content:
        `用户任务：${prompt}\n候选池：${JSON.stringify(candidatePayload)}\n` +
        `请返回前 ${topK} 个最合适的 id，每条给三段理由 reasonBlocks（为什么推荐/为什么适配/使用边界）。` +
        'id 必须来自候选池的 id 字段，不要编造。' +
        '每条必须包含 id、title、reasonBlocks。' +
        '示例输出：{"items":[{"id":"candidate-id-1","title":"候选标题","reasonBlocks":["你想做“产品prd”，这条先帮你搭文档骨架。","它更适合需求梳理场景，尤其在目标定义这一步更有优势。","进入评审阶段后，建议换协作类 skill。"]}]}',
    },
  ];

  const primaryContent = await callSiliconFlowModel(baseUrl, apiKey, modelPrimary, timeoutMs, messages);
  const shouldTryFallbackModel =
    !primaryContent &&
    modelFallback &&
    modelFallback !== modelPrimary &&
    !(provider === 'deepseek' && modelPrimary.includes('flash'));
  const aiContent = primaryContent || (shouldTryFallbackModel ? await callSiliconFlowModel(baseUrl, apiKey, modelFallback, timeoutMs, messages) : null);

  if (!aiContent) {
    console.warn('[prompt-reco] fallback: model call failed/timeout', {
      modelPrimary,
      modelFallback,
      timeoutMs,
    });
    return { items: rewriteForDistinctNarrative(ruleTop, prompt), fallbackUsed: true };
  }
  const parsed = tryParseJson(aiContent) as { items?: Array<{ id?: string; reasonBlocks?: string[] }> } | null;
  const allowedIds = new Set(pool.map(item => item.skill.id));
  const byId = new Map(ruleTop.map(item => [item.id, item]));
  const titleToId = new Map<string, string>();
  for (const item of pool) {
    titleToId.set(item.skill.title.trim().toLowerCase(), item.skill.id);
  }
  const enhanced: RecommendationCardItem[] = [];
  if (parsed && Array.isArray(parsed.items)) {
    for (const [index, item] of parsed.items.entries()) {
      const idFromItem = typeof item?.id === 'string' ? item.id : '';
      const titleFromItem = typeof (item as any)?.title === 'string' ? String((item as any).title) : '';
      let id = resolveCandidateId(idFromItem, titleFromItem, allowedIds, titleToId);
      if (!id || !allowedIds.has(id)) {
        id = ruleTop[index]?.id ?? '';
      }
      if (!id || !allowedIds.has(id)) continue;
      const base = byId.get(id);
      if (!base) continue;
      const blocks = Array.isArray(item.reasonBlocks)
        ? item.reasonBlocks.filter(part => typeof part === 'string').map(part => part.trim()).filter(Boolean).slice(0, 3)
        : [];
      const reasonBlocks: [string, string, string] =
        blocks.length >= 3
          ? [blocks[0], blocks[1], blocks[2]]
          : blocks.length === 2
            ? [blocks[0], blocks[1], base.reasonBlocks[2]]
            : blocks.length === 1
              ? [blocks[0], base.reasonBlocks[1], base.reasonBlocks[2]]
              : base.reasonBlocks;
      enhanced.push({
        ...base,
        reasonBlocks,
        recommendationReason: reasonBlocks.join(' '),
      });
      if (enhanced.length >= topK) break;
    }
  } else {
    const looseIds = extractIdsFromLooseText(aiContent, allowedIds, titleToId).slice(0, topK);
    for (const id of looseIds) {
      const base = byId.get(id);
      if (!base) continue;
      enhanced.push(base);
    }
    if (enhanced.length > 0) {
      console.warn('[prompt-reco] using loose text id extraction');
    } else {
      console.warn('[prompt-reco] fallback: AI response is not valid JSON items[]');
    }
  }

  if (enhanced.length === 0) {
    console.warn('[prompt-reco] fallback: AI returned no valid in-pool ids');
    // AI did respond, but output was non-compliant; degrade gracefully without showing "AI unavailable".
    return { items: rewriteForDistinctNarrative(ruleTop, prompt), fallbackUsed: false };
  }

  const used = new Set(enhanced.map(item => item.id));
  for (const item of ruleTop) {
    if (enhanced.length >= topK) break;
    if (used.has(item.id)) continue;
    enhanced.push(item);
  }

  return { items: rewriteForDistinctNarrative(enhanced.slice(0, topK), prompt), fallbackUsed: false };
}
