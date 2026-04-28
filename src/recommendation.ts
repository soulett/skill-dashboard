import { getSkillSourceMeta, inferSkillSource } from './utils';
import type { RecommendationCardItem, RecommendationScene, SceneRecommendationResult, SeedSkillRecord, Skill } from './types';
import { buildRuleReasonBlocks } from './recommendation-reason';

function normalizeText(value: string | undefined | null): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[`"'.,/\\()[\]{}:+*?!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePath(value: string | undefined | null): string {
  return normalizeText(value).replace(/\\/g, '/');
}

function normalizeTokenList(values: string[]): string[] {
  return values.map(item => normalizeText(item)).filter(Boolean);
}

function prettifyTag(tag: string): string {
  const trimmed = tag.trim();
  if (!trimmed) return '';

  const replacements: Record<string, string> = {
    prd: 'PRD',
    spec: 'Spec',
    research: '研究',
    docs: '文档',
    api: 'API',
    html: 'HTML',
    css: 'CSS',
    react: 'React',
    frontend: '前端',
    'frontend-design': '前端设计',
    portfolio: '作品集',
    review: '评审',
    analysis: '分析',
    workflow: '流程',
    roadmap: '路线图',
  };

  return replacements[trimmed.toLowerCase()] ?? trimmed;
}

function buildRecommendationReason(seed: SeedSkillRecord): string {
  const curatedTags = seed.tags_curated.map(prettifyTag).filter(Boolean).slice(0, 2);
  const fallbackTagReason = curatedTags.length > 0 ? `更贴近当前任务，重点覆盖 ${curatedTags.join(' / ')}。` : '';

  const templates = seed.recommended_reason_templates.map(item => item.trim()).filter(Boolean);

  const specificTemplate =
    templates.find(item => item.startsWith('标签与当前任务高度相关：')) ??
    templates.find(item => !item.startsWith('适合当前“') && !item.startsWith('来自本地')) ??
    templates[0];

  if (!specificTemplate) {
    return fallbackTagReason || seed.capability_summary;
  }

  if (specificTemplate.startsWith('标签与当前任务高度相关：')) {
    const raw = specificTemplate.replace('标签与当前任务高度相关：', '').trim();
    const parts = raw
      .split('/')
      .map(item => prettifyTag(item))
      .map(item => item.trim())
      .filter(Boolean)
      .slice(0, 2);
    if (parts.length > 0) {
      return `更贴近当前任务，重点覆盖 ${parts.join(' / ')}。`;
    }
  }

  if (specificTemplate.startsWith('适合当前“')) {
    return fallbackTagReason || `${specificTemplate.replace('适合当前“', '适合当前 ').replace('”场景', ' 场景。')}`;
  }

  return specificTemplate.endsWith('。') ? specificTemplate : `${specificTemplate}。`;
}

function getHealthMeta(status: SeedSkillRecord['health_status_basic']) {
  if (status === 'complete') {
    return {
      label: '信息完整',
      className: 'bg-success/12 text-success border-success/30',
    };
  }

  if (status === 'partial') {
    return {
      label: '待补充',
      className: 'bg-warning/12 text-warning border-warning/30',
    };
  }

  return {
    label: '信息不足',
    className: 'bg-error/12 text-error border-error/30',
  };
}

function buildSkillLookup(skills: Skill[]) {
  const byPath = new Map<string, Skill>();
  const byTitle = new Map<string, Skill>();

  for (const skill of skills) {
    const normalizedPath = normalizePath(skill.sourcePath);
    if (normalizedPath) byPath.set(normalizedPath, skill);

    const titleCandidates = [
      skill.title,
      skill.originalTitle,
      skill.fileName.replace(/\.[^.]+$/, ''),
      skill.sourcePath.split('/').pop()?.replace(/\.[^.]+$/, ''),
    ];

    for (const title of titleCandidates) {
      const normalized = normalizeText(title);
      if (normalized && !byTitle.has(normalized)) byTitle.set(normalized, skill);
    }
  }

  return { byPath, byTitle };
}

function matchSkill(seed: SeedSkillRecord, skills: Skill[], lookup: ReturnType<typeof buildSkillLookup>): Skill | null {
  const pathMatch = lookup.byPath.get(normalizePath(seed.source_path));
  if (pathMatch) return pathMatch;

  const titleCandidates = [seed.display_title, seed.title_normalized, seed.skill_id.split('/').pop() ?? ''];

  for (const title of titleCandidates) {
    const titleMatch = lookup.byTitle.get(normalizeText(title));
    if (titleMatch) return titleMatch;
  }

  const seedPathLeaf = normalizeText(seed.source_path.split('/').pop()?.replace(/\.[^.]+$/, ''));
  if (seedPathLeaf) {
    const titleMatch = lookup.byTitle.get(seedPathLeaf);
    if (titleMatch) return titleMatch;
  }

  const normalizedTags = new Set(normalizeTokenList([...seed.tags_curated, ...seed.tags_rule]));
  const normalizedSceneHints = new Set(normalizeTokenList(seed.scenes_hint));

  const candidate = skills.find(skill => {
    const skillTags = normalizeTokenList(skill.tags);
    const hasTagOverlap = skillTags.some(tag => normalizedTags.has(tag));
    const hasSceneOverlap = normalizeTokenList(skill.details.whenToUse).some(scene => normalizedSceneHints.has(scene));
    return hasTagOverlap || hasSceneOverlap;
  });

  return candidate ?? null;
}

function scoreSeedForScene(seed: SeedSkillRecord, scene: RecommendationScene): number {
  let score = 0;

  const normalizedSceneLabel = normalizeText(scene.label);
  const normalizedSceneDescription = normalizeText(scene.description);
  const normalizedTags = new Set(normalizeTokenList([...seed.tags_rule, ...seed.tags_curated]));
  const normalizedScenesHint = new Set(normalizeTokenList(seed.scenes_hint));
  const normalizedDescription = normalizeText(`${seed.description_short} ${seed.capability_summary} ${seed.category_refined ?? ''}`);

  if (normalizedScenesHint.has(normalizedSceneLabel)) score += 8;
  if (normalizedScenesHint.has(normalizedSceneDescription)) score += 2;

  for (const category of scene.query.categories) {
    const normalizedCategory = normalizeText(category);
    if (normalizeText(seed.category_l1) === normalizedCategory || normalizeText(seed.category_refined ?? '').includes(normalizedCategory)) {
      score += 3;
    }
  }

  for (const tag of scene.query.tags) {
    const normalizedTag = normalizeText(tag);
    if (normalizedTags.has(normalizedTag)) score += 3;
  }

  for (const keyword of scene.query.keywords) {
    const normalizedKeyword = normalizeText(keyword);
    if (normalizedDescription.includes(normalizedKeyword)) score += 2;
  }

  if (seed.install_status === 'installed') score += 2;
  if (seed.health_status_basic === 'complete') score += 2;
  if (seed.health_status_basic === 'partial') score += 1;

  return score;
}

function toRecommendationCard(seed: SeedSkillRecord, scene: RecommendationScene, matchedSkill: Skill | null): RecommendationCardItem {
  const source = matchedSkill ? inferSkillSource(matchedSkill.sourcePath) : inferSkillSource(seed.source_path);
  const sourceMeta = getSkillSourceMeta(source);
  const healthMeta = getHealthMeta(seed.health_status_basic);
  const reasonBlocks = buildRuleReasonBlocks(seed, scene);

  return {
    id: seed.skill_id,
    title: seed.display_title || matchedSkill?.title || seed.title_normalized,
    description: matchedSkill?.description || seed.description_short,
    recommendationReason: buildRecommendationReason(seed),
    evidenceLabel: '规则匹配 + AI增强',
    reasonBlocks,
    sourceLabel: sourceMeta.label,
    sourceClassName: sourceMeta.chipClass,
    healthLabel: healthMeta.label,
    healthClassName: healthMeta.className,
    tags: (matchedSkill?.tags.length ? matchedSkill.tags : seed.tags_curated).slice(0, 3),
    matchedSkillId: matchedSkill?.id ?? null,
  };
}

export function buildSceneRecommendationResult(
  scene: RecommendationScene,
  registrySkills: SeedSkillRecord[],
  currentSkills: Skill[],
): SceneRecommendationResult {
  const lookup = buildSkillLookup(currentSkills);

  const ranked = registrySkills
    .map(seed => {
      const matchedSkill = matchSkill(seed, currentSkills, lookup);
      const score = scoreSeedForScene(seed, scene) + (matchedSkill ? 4 : 0);
      return { seed, matchedSkill, score };
    })
    .filter(item => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);

  return {
    scene,
    items: ranked.map(item => toRecommendationCard(item.seed, scene, item.matchedSkill)),
    coverage: {
      matchedCount: ranked.filter(item => item.matchedSkill).length,
      incompleteCount: ranked.filter(item => item.seed.health_status_basic !== 'complete').length,
      totalCandidates: ranked.length,
    },
  };
}
