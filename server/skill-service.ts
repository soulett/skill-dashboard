import type { Skill, SourceScanSummary, StatsData } from '../src/types';
import { SOURCE_SCAN_ROOTS } from './config';
import { ensureMetadataFile, saveSkillMetadataPatch } from './metadata-store';
import { scanSingleRoot, scanSkillRoots } from './skill-scanner';
import type { ScanContext, SkillMetadataPatch } from './types';

function resolveStatus(skill: Skill): Skill['status'] {
  const hasDescription = skill.description.trim().length > 0 && skill.description !== '待补充描述';
  const hasWhenToUse = skill.details.whenToUse.length > 0;
  const hasTags = skill.tags.length > 0;

  return hasDescription && (hasWhenToUse || hasTags) ? 'active' : 'unrecognized';
}

function mergeSkill(base: Skill, patch?: SkillMetadataPatch): Skill {
  const description = patch?.displayDescription ?? patch?.description ?? base.description;
  const title = patch?.displayTitle ?? base.title;
  const merged: Skill = {
    ...base,
    title,
    originalTitle: base.title,
    description,
    ...(patch?.category ? { category: patch.category } : {}),
    ...(patch?.tags ? { tags: patch.tags } : {}),
    details: {
      ...base.details,
      whatItDoes: description,
      ...(patch?.whenToUse ? { whenToUse: patch.whenToUse } : {}),
    },
  };

  return {
    ...merged,
    status: resolveStatus(merged),
  };
}

async function scanWithFallback(context: ScanContext): Promise<Skill[]> {
  const primary = await scanSkillRoots(context.scanRoots);
  return primary.length > 0 ? primary : await scanSkillRoots(context.fallbackScanRoots);
}

export async function getRawSkills(context: ScanContext): Promise<Skill[]> {
  return scanWithFallback(context);
}

export async function getMergedSkills(context: ScanContext): Promise<Skill[]> {
  const [metadata, parsed] = await Promise.all([
    ensureMetadataFile(context.metadataFilePath),
    scanWithFallback(context),
  ]);

  return parsed.map(skill => mergeSkill(skill, metadata.skills[skill.id]));
}

export async function getRawSkill(context: ScanContext, skillId: string): Promise<Skill | null> {
  const parsed = await getRawSkills(context);
  return parsed.find(skill => skill.id === skillId) ?? null;
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

export async function getSourceScanSummary(): Promise<SourceScanSummary> {
  const scannedAt = new Date().toISOString();
  const statuses = await Promise.all(
    SOURCE_SCAN_ROOTS.map(async target => {
      const results = await Promise.all(target.paths.map(scanSingleRoot));
      const skillCount = results.reduce((sum, item) => sum + item.skills.length, 0);
      const hasDetected = results.some(item => item.state === 'detected');
      const hasEmpty = results.some(item => item.state === 'empty');
      const mergedStatus: SourceScanSummary['sources'][number]['status'] = hasDetected ? 'detected' : hasEmpty ? 'empty' : 'unreachable';

      return {
        source: target.source,
        label: target.label,
        paths: [...target.paths],
        status: mergedStatus,
        skillCount,
        lastScannedAt: scannedAt,
        message:
          mergedStatus === 'detected'
            ? '已识别'
            : mergedStatus === 'empty'
              ? '目录存在，暂未发现技能'
              : '未找到目录或无访问权限',
      };
    }),
  );

  return {
    sources: statuses,
    totalDetectedSkills: statuses.reduce((sum, item) => sum + item.skillCount, 0),
    scannedAt,
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
