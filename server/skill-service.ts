import crypto from 'node:crypto';
import path from 'node:path';
import type { Category, Skill, SourceId, SourceScanSummary, StatsData } from '../src/types';
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

const VALID_CATEGORIES: Category[] = ['编程开发', '内容创作', '数据分析', '产品设计', '效率流程', '商业营销', '其他'];

function sanitizeCategory(category: unknown): Category {
  if (typeof category === 'string' && VALID_CATEGORIES.includes(category as Category)) {
    return category as Category;
  }
  return '其他';
}

function sanitizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean);
}

function sanitizeSkill(skill: Skill): Skill {
  const title = typeof skill.title === 'string' && skill.title.trim() ? skill.title.trim() : 'Untitled Skill';
  const description =
    typeof skill.description === 'string' && skill.description.trim() ? skill.description.trim() : '待补充描述';
  const tags = sanitizeStringArray(skill.tags);
  const whenToUse = sanitizeStringArray(skill.details?.whenToUse);
  const triggerWords = sanitizeStringArray(skill.details?.triggerWords);
  const rawContent = typeof skill.details?.rawContent === 'string' ? skill.details.rawContent : '';

  return {
    ...skill,
    title,
    description,
    category: sanitizeCategory(skill.category),
    tags,
    details: {
      ...skill.details,
      whatItDoes:
        typeof skill.details?.whatItDoes === 'string' && skill.details.whatItDoes.trim()
          ? skill.details.whatItDoes
          : description,
      whenToUse,
      triggerWords,
      rawContent,
    },
  };
}

function mergeSkill(base: Skill, patch?: SkillMetadataPatch): Skill {
  const description = patch?.displayDescription ?? patch?.description ?? base.description;
  const title = patch?.displayTitle ?? base.title;
  const sanitizedPatchCategory = patch?.category ? sanitizeCategory(patch.category) : undefined;
  const sanitizedPatchTags = patch?.tags ? sanitizeStringArray(patch.tags) : undefined;
  const sanitizedPatchWhenToUse = patch?.whenToUse ? sanitizeStringArray(patch.whenToUse) : undefined;
  const merged: Skill = {
    ...base,
    title,
    originalTitle: base.title,
    description,
    ...(sanitizedPatchCategory ? { category: sanitizedPatchCategory } : {}),
    ...(sanitizedPatchTags ? { tags: sanitizedPatchTags } : {}),
    details: {
      ...base.details,
      whatItDoes: description,
      ...(sanitizedPatchWhenToUse ? { whenToUse: sanitizedPatchWhenToUse } : {}),
    },
  };

  const sanitized = sanitizeSkill(merged);
  return { ...sanitized, status: resolveStatus(sanitized) };
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
  for (const rawSkill of skills) {
    const skill = sanitizeSkill(rawSkill);
    const key = getSkillFingerprint(skill);
    const bucket = grouped.get(key) ?? [];
    bucket.push(skill);
    grouped.set(key, bucket);
  }

  return [...grouped.entries()].map(([fingerprint, items]) => {
    const sorted = [...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
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

function relabelImportedSkills(skills: Skill[], source: SourceId, mode: 'default' | 'manual-path', importedPath: string): Skill[] {
  const normalizedPath = importedPath.replaceAll('\\', '/');
  return skills.map(skill => {
    const sourcePath = `local://${source}/${mode}/${normalizedPath}/${skill.id}`;
    return {
      ...skill,
      sourcePath,
      sourcePaths: [sourcePath],
    };
  });
}

function inferSourceFromPath(sourcePath: string): SourceId | 'unknown' {
  const normalized = sourcePath.replaceAll('\\', '/').toLowerCase();
  if (normalized.startsWith('local://codex/') || normalized.includes('/.codex/')) return 'codex';
  if (normalized.startsWith('local://cursor/') || normalized.includes('/.cursor/')) return 'cursor';
  if (normalized.startsWith('local://claude/') || normalized.includes('/.claude/')) return 'claude';
  return 'unknown';
}

export async function getRawSkills(context: ScanContext): Promise<Skill[]> {
  const imported = await getImportedSkills(context);
  return mergeDuplicateSkills(imported);
}

export async function getMergedSkills(context: ScanContext): Promise<Skill[]> {
  const [metadata, parsed] = await Promise.all([ensureMetadataFile(context.metadataFilePath), getRawSkills(context)]);
  return parsed.map(skill => mergeSkill(skill, metadata.skills[skill.id]));
}

export async function getRawSkill(context: ScanContext, skillId: string): Promise<Skill | null> {
  const parsed = await getRawSkills(context);
  return parsed.find(skill => skill.id === skillId) ?? null;
}

export async function getStats(context: ScanContext): Promise<StatsData> {
  const [skills, metadata] = await Promise.all([getMergedSkills(context), ensureMetadataFile(context.metadataFilePath)]);
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

export async function importSourceFromDefaultRoots(context: ScanContext, source: SourceId) {
  const target = SOURCE_SCAN_ROOTS.find(item => item.source === source);
  if (!target) {
    throw new Error(`Unsupported source: ${source}`);
  }

  const results = await Promise.all(target.paths.map(scanSingleRoot));
  const detectedResult = results.find(item => item.state === 'detected' && item.skills.length > 0);
  if (!detectedResult) {
    const firstReachable = results.find(item => item.state !== 'unreachable');
    const fallbackMessage =
      firstReachable?.state === 'empty'
        ? '默认路径存在，但还没有发现可导入的 SKILL.md。'
        : '没有在默认路径里找到可导入的 skills。';
    throw new Error(fallbackMessage);
  }

  const detectedIndex = results.findIndex(item => item === detectedResult);
  const importedPath = target.paths[detectedIndex] ?? target.paths[0];
  const relabeled = relabelImportedSkills(detectedResult.skills, source, 'default', importedPath);
  const imported = await importSkills(context, relabeled);

  return {
    ...imported,
    source,
    mode: 'default' as const,
    importedPath,
  };
}

export async function importSourceFromManualPath(context: ScanContext, source: SourceId, inputPath: string) {
  const trimmedPath = inputPath.trim();
  if (!trimmedPath) {
    throw new Error('请先输入一个有效路径。');
  }

  const resolvedPath = path.resolve(trimmedPath);
  const result = await scanSingleRoot(resolvedPath);
  if (result.state !== 'detected' || result.skills.length === 0) {
    throw new Error(
      result.state === 'empty'
        ? '这个目录存在，但没有发现可导入的 SKILL.md。请直接选择 skills 目录。'
        : result.message || '这个路径当前不可访问，请检查后再试一次。',
    );
  }

  const relabeled = relabelImportedSkills(result.skills, source, 'manual-path', resolvedPath);
  const imported = await importSkills(context, relabeled);

  return {
    ...imported,
    source,
    mode: 'manual-path' as const,
    importedPath: resolvedPath,
  };
}

export async function getSourceScanSummary(context: ScanContext): Promise<SourceScanSummary> {
  const scannedAt = new Date().toISOString();
  const importedSkills = await getImportedSkills(context);

  const sources = await Promise.all(
    SOURCE_SCAN_ROOTS.map(async target => {
      const results = await Promise.all(target.paths.map(scanSingleRoot));
      const scannedSkills = results.flatMap(item => item.skills);
      const importedBySource = importedSkills.filter(skill => inferSourceFromPath(skill.sourcePath) === target.source);

      const scannedFingerprints = new Set(scannedSkills.map(getSkillFingerprint));
      const importedFingerprints = new Set(importedBySource.map(getSkillFingerprint));

      const scannedSkillCount = scannedFingerprints.size;
      const importedSkillCount = [...importedFingerprints].filter(fingerprint => !scannedFingerprints.has(fingerprint)).length;
      const skillCount = scannedSkillCount + importedSkillCount;

      const hasDetected = results.some(item => item.state === 'detected') || importedSkillCount > 0;
      const hasEmpty = results.some(item => item.state === 'empty');
      const status: SourceScanSummary['sources'][number]['status'] = hasDetected ? 'detected' : hasEmpty ? 'empty' : 'unreachable';

      return {
        source: target.source,
        label: target.label,
        paths: [...target.paths],
        status,
        skillCount,
        scannedSkillCount,
        importedSkillCount,
        lastScannedAt: scannedAt,
        message:
          status === 'detected'
            ? importedSkillCount > 0
              ? '已识别（含已导入）'
              : '已识别'
            : status === 'empty'
              ? '目录存在，暂未发现技能'
              : '未找到目录或无访问权限',
      };
    }),
  );

  return {
    sources,
    totalDetectedSkills: sources.reduce((sum, item) => sum + item.skillCount, 0),
    scannedAt,
  };
}

export async function getConnectedSourceSummary(context: ScanContext): Promise<SourceScanSummary> {
  const scannedAt = new Date().toISOString();
  const importedSkills = await getImportedSkills(context);

  const sources = SOURCE_SCAN_ROOTS.map(target => {
    const importedBySource = importedSkills.filter(skill => inferSourceFromPath(skill.sourcePath) === target.source);
    const importedFingerprints = new Set(importedBySource.map(getSkillFingerprint));
    const importedSkillCount = importedFingerprints.size;
    const status: SourceScanSummary['sources'][number]['status'] = importedSkillCount > 0 ? 'detected' : 'unreachable';

    return {
      source: target.source,
      label: target.label,
      paths: [...target.paths],
      status,
      skillCount: importedSkillCount,
      scannedSkillCount: importedSkillCount,
      importedSkillCount,
      lastScannedAt: scannedAt,
      message: importedSkillCount > 0 ? '已接入' : '尚未接入',
    };
  });

  return {
    sources,
    totalDetectedSkills: sources.reduce((sum, item) => sum + item.skillCount, 0),
    scannedAt,
  };
}

export async function updateSkillMetadata(context: ScanContext, skillId: string, patch: SkillMetadataPatch): Promise<Skill | null> {
  await saveSkillMetadataPatch(context.metadataFilePath, skillId, patch);
  const skills = await getMergedSkills(context);
  return skills.find(skill => skill.id === skillId) ?? null;
}
