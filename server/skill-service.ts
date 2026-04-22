import crypto from 'node:crypto';
import type { Skill, SourceScanSummary, StatsData } from '../src/types';
import { SOURCE_SCAN_ROOTS } from './config';
import { ensureImportedSkillsFile, ensureMetadataFile, saveImportedSkills, saveSkillMetadataPatch } from './metadata-store';
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

function normalizeRawContent(raw: string): string {
  return raw.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim().toLowerCase();
}

function getSkillFingerprint(skill: Skill): string {
  if (skill.contentHash) return skill.contentHash;
  const normalized = normalizeRawContent(skill.details.rawContent || '');
  if (normalized.length > 0) {
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }
  return `id:${skill.id}`;
}

function mergeDuplicateSkills(skills: Skill[]): Skill[] {
  const grouped = new Map<string, Skill[]>();
  for (const skill of skills) {
    const key = getSkillFingerprint(skill);
    const bucket = grouped.get(key) ?? [];
    bucket.push(skill);
    grouped.set(key, bucket);
  }

  return [...grouped.entries()].map(([fingerprint, items]) => {
    const sorted = [...items].sort((a, b) => {
      const left = new Date(a.updatedAt).getTime();
      const right = new Date(b.updatedAt).getTime();
      return right - left;
    });

    const primary = sorted[0];
    const sourcePaths = [...new Set(items.map(item => item.sourcePath))];
    return {
      ...primary,
      contentHash: fingerprint,
      sourcePaths,
      sourceCount: sourcePaths.length,
      sourcePath: sourcePaths[0],
    };
  });
}

async function getImportedSkills(context: ScanContext): Promise<Skill[]> {
  const imported = await ensureImportedSkillsFile(context.importedSkillsFilePath);
  return imported.skills;
}

export async function getRawSkills(context: ScanContext): Promise<Skill[]> {
  const [scanned, imported] = await Promise.all([scanWithFallback(context), getImportedSkills(context)]);
  return mergeDuplicateSkills([...scanned, ...imported]);
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

export async function importSkills(context: ScanContext, incoming: Skill[]) {
  const imported = await getImportedSkills(context);
  const merged = mergeDuplicateSkills([...imported, ...incoming]);
  await saveImportedSkills(context.importedSkillsFilePath, merged);
  const skills = await getMergedSkills(context);

  return {
    success: true,
    importedCount: incoming.length,
    totalImportedStored: merged.length,
    totalSkills: skills.length,
    scannedAt: new Date().toISOString(),
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
