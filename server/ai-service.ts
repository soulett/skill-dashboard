interface SuggestFieldFixesInput {
  skillTitle: string;
  rawContent: string;
  failedFields: string[];
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
  const model = process.env.SILICONFLOW_MODEL?.trim() || 'Pro/zai-org/GLM-5.1';
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
