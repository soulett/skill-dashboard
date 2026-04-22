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
  const apiKey = process.env.SILICONFLOW_API_KEY?.trim();
  const baseUrl = (process.env.SILICONFLOW_BASE_URL?.trim() || 'https://api.siliconflow.cn/v1').replace(/\/+$/, '');
  const model = process.env.AI_MODEL?.trim() || process.env.SILICONFLOW_MODEL?.trim() || 'Pro/zai-org/GLM-5.1';
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
            '写作风格必须面向非技术用户：用口语化中文，避免术语堆叠，句子短、直接、好懂。',
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
            '7) 输出必须是可被 JSON.parse 的纯 JSON 数组。',
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
