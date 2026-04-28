import type { RecommendationScene, SeedSkillRecord } from './types';

function trimSentence(value: string): string {
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return /[。.!?]$/.test(text) ? text : `${text}。`;
}

function pickHint(seed: SeedSkillRecord): string {
  const firstTag = seed.tags_curated.find(Boolean) ?? seed.tags_rule.find(Boolean);
  if (firstTag) return firstTag;
  return seed.category_refined || seed.category_l1 || '当前任务';
}

export function buildRuleReasonBlocks(seed: SeedSkillRecord, scene: RecommendationScene): [string, string, string] {
  const hint = pickHint(seed);
  const block1 = trimSentence(`适配当前场景“${scene.label}”，优先处理与${hint}相关的任务。`);
  const block2 = trimSentence(seed.capability_summary || seed.description_short || `这条能力更擅长解决${hint}相关问题`);
  const block3 = trimSentence('当任务目标不在本场景或需要跨领域深度推理时，建议结合其他技能一起判断。');
  return [block1, block2, block3];
}

export function mergeAiReasonBlocks(
  ruleBlocks: [string, string, string],
  aiBlocks?: string[] | null,
): [string, string, string] {
  if (!aiBlocks || aiBlocks.length < 3) return ruleBlocks;
  const normalized = aiBlocks.map(item => trimSentence(item || '')).filter(Boolean);
  if (normalized.length < 3) return ruleBlocks;
  return [normalized[0], normalized[1], normalized[2]];
}

