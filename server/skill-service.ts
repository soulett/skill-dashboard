import type { Skill, StatsData } from '../src/types';
import { ensureMetadataFile, saveSkillMetadataPatch } from './metadata-store';
import { scanSkillRoots } from './skill-scanner';
import type { ScanContext, SkillMetadataPatch } from './types';

function resolveStatus(skill: Skill): Skill['status'] {
  const hasDescription = skill.description.trim().length > 0 && skill.description !== '待补充描述';
  const hasWhenToUse = skill.details.whenToUse.length > 0;
  const hasTags = skill.tags.length > 0;

  return hasDescription && hasWhenToUse && hasTags ? 'active' : 'unrecognized';
}

function mergeSkill(base: Skill, patch?: SkillMetadataPatch): Skill {
  if (!patch) {
    return {
      ...base,
      status: resolveStatus(base),
    };
  }

  const merged: Skill = {
    ...base,
    ...(patch.description ? { description: patch.description } : {}),
    ...(patch.category ? { category: patch.category } : {}),
    ...(patch.tags ? { tags: patch.tags } : {}),
    details: {
      ...base.details,
      ...(patch.description ? { whatItDoes: patch.description } : {}),
      ...(patch.whenToUse ? { whenToUse: patch.whenToUse } : {}),
    },
  };

  return {
    ...merged,
    status: resolveStatus(merged),
  };
}

export async function getMergedSkills(context: ScanContext): Promise<Skill[]> {
  const [metadata, parsed] = await Promise.all([
    ensureMetadataFile(context.metadataFilePath),
    scanSkillRoots(context.scanRoots),
  ]);

  return parsed.map(skill => mergeSkill(skill, metadata.skills[skill.id]));
}

export async function getStats(context: ScanContext): Promise<StatsData> {
  const [skills, metadata] = await Promise.all([
    getMergedSkills(context),
    ensureMetadataFile(context.metadataFilePath),
  ]);

  return {
    totalSkills: skills.length,
    totalCategories: new Set(skills.map(skill => skill.category)).size,
    newSinceLastScan: 0,
    lastScanTime: metadata.updatedAt,
  };
}

export async function triggerScan(context: ScanContext) {
  const skills = await getMergedSkills(context);
  return {
    success: true,
    totalFound: skills.length,
    newCount: 0,
    updatedCount: 0,
    failedCount: 0,
    scannedAt: new Date().toISOString(),
    errors: [],
  };
}

export async function updateSkillMetadata(
  context: ScanContext,
  skillId: string,
  patch: SkillMetadataPatch,
): Promise<Skill | null> {
  await saveSkillMetadataPatch(context.metadataFilePath, skillId, patch);
  const skills = await getMergedSkills(context);
  return skills.find(skill => skill.id === skillId) ?? null;
}
