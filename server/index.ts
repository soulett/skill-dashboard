import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import { scanContext } from './config';
import { analyzeSkillEcosystemWithAI, extractSkillMetadataWithAI, suggestFieldFixesWithAI, suggestPathHelpWithAI } from './ai-service';
import { generateChineseMetadata } from './localizer';
import { ensureMetadataFile } from './metadata-store';
import { scanSkillRoots } from './skill-scanner';
import { getMergedSkills, getRawSkill, getRawSkills, getSourceScanSummary, getStats, importSkills, triggerScan, updateSkillMetadata } from './skill-service';

const app = express();

const corsOrigin = process.env.CORS_ORIGIN?.trim();
app.use(
  cors(
    corsOrigin
      ? {
          origin: corsOrigin.split(',').map(item => item.trim()).filter(Boolean),
        }
      : undefined,
  ),
);
app.use(express.json({ limit: '12mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { ok: true } });
});

app.get('/api/debug/metadata', async (_req, res) => {
  const data = await ensureMetadataFile(scanContext.metadataFilePath);
  res.json({ success: true, data });
});

app.get('/api/debug/scan', async (_req, res) => {
  const skills = await scanSkillRoots(scanContext.scanRoots);
  res.json({ success: true, data: { skills, total: skills.length } });
});

app.get('/api/skills', async (_req, res) => {
  const skills = await getMergedSkills(scanContext);
  res.json({ success: true, data: { skills, total: skills.length } });
});

app.get('/api/stats', async (_req, res) => {
  const stats = await getStats(scanContext);
  res.json({ success: true, data: stats });
});

app.get('/api/source-scan-summary', async (_req, res) => {
  const summary = await getSourceScanSummary(scanContext);
  res.json({ success: true, data: summary });
});

app.post('/api/scan', async (_req, res) => {
  const result = await triggerScan(scanContext);
  res.json({ success: true, data: result });
});

app.post('/api/import-skills', async (req, res) => {
  const skills = req.body?.skills;
  if (!Array.isArray(skills)) {
    res.status(400).json({ success: false, error: 'Invalid request body: skills[] is required' });
    return;
  }

  const result = await importSkills(scanContext, skills);
  res.json({ success: true, data: result });
});

app.patch('/api/skills/:id/metadata', async (req, res) => {
  const skill = await updateSkillMetadata(scanContext, req.params.id, req.body);
  if (!skill) {
    res.status(404).json({ success: false, error: `Skill not found: ${req.params.id}` });
    return;
  }

  res.json({ success: true, data: skill });
});

app.post('/api/skills/:id/localize', async (req, res) => {
  const rawSkill = await getRawSkill(scanContext, req.params.id);
  if (!rawSkill) {
    res.status(404).json({ success: false, error: `Skill not found: ${req.params.id}` });
    return;
  }

  const skill = await updateSkillMetadata(scanContext, req.params.id, generateChineseMetadata(rawSkill));
  res.json({ success: true, data: skill });
});

app.post('/api/localize-all', async (_req, res) => {
  const rawSkills = await getRawSkills(scanContext);
  const metadata = await ensureMetadataFile(scanContext.metadataFilePath);
  let updatedCount = 0;
  let skippedCount = 0;

  const isSamePatch = (skillId: string, nextPatch: ReturnType<typeof generateChineseMetadata>) => {
    const prev = metadata.skills[skillId];
    if (!prev) return false;

    return (
      prev.displayTitle === nextPatch.displayTitle &&
      prev.displayDescription === nextPatch.displayDescription &&
      prev.description === nextPatch.description &&
      prev.category === nextPatch.category &&
      JSON.stringify(prev.tags ?? []) === JSON.stringify(nextPatch.tags ?? []) &&
      JSON.stringify(prev.whenToUse ?? []) === JSON.stringify(nextPatch.whenToUse ?? []) &&
      prev.locale === nextPatch.locale &&
      prev.translationSource === nextPatch.translationSource
    );
  };

  for (const skill of rawSkills) {
    const patch = generateChineseMetadata(skill);
    if (isSamePatch(skill.id, patch)) {
      skippedCount += 1;
      continue;
    }
    await updateSkillMetadata(scanContext, skill.id, patch);
    updatedCount += 1;
  }

  const skills = await getMergedSkills(scanContext);
  res.json({ success: true, data: { skills, total: skills.length, updatedCount, skippedCount } });
});

app.post('/api/ai/suggest-field-fixes', async (req, res) => {
  try {
    const { skillTitle, rawContent, failedFields } = req.body ?? {};
    if (!skillTitle || !Array.isArray(failedFields)) {
      res.status(400).json({ success: false, error: 'Invalid request body' });
      return;
    }

    const suggestions = await suggestFieldFixesWithAI({
      skillTitle: String(skillTitle),
      rawContent: String(rawContent ?? ''),
      failedFields: failedFields.map((field: unknown) => String(field)),
    });

    res.json({ success: true, data: suggestions });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to generate suggestions' });
  }
});

app.post('/api/ai/path-help', async (req, res) => {
  try {
    const { message, source, os, knownPaths, lastError } = req.body ?? {};
    if (!message || typeof message !== 'string') {
      res.status(400).json({ success: false, error: 'Invalid request body: message is required' });
      return;
    }

    const result = await suggestPathHelpWithAI({
      message: String(message),
      source: typeof source === 'string' ? (source as 'codex' | 'cursor' | 'claude' | 'unknown') : 'unknown',
      os: typeof os === 'string' ? (os as 'windows' | 'macos' | 'linux' | 'unknown') : 'unknown',
      knownPaths: Array.isArray(knownPaths) ? knownPaths.map(item => String(item)) : [],
      lastError: typeof lastError === 'string' ? lastError : '',
    });

    res.json({ success: true, data: result });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to generate path help' });
  }
});

app.post('/api/ai/extract-skill-metadata', async (req, res) => {
  try {
    const { rawContent } = req.body ?? {};
    if (typeof rawContent !== 'string' || !rawContent.trim()) {
      res.status(400).json({ success: false, error: 'Invalid request body: rawContent is required' });
      return;
    }

    const result = await extractSkillMetadataWithAI(rawContent);
    res.json({ success: true, data: result });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to extract metadata' });
  }
});

app.post('/api/ai/analyze-ecosystem', async (req, res) => {
  try {
    const { skills, edges } = req.body ?? {};
    if (!Array.isArray(skills) || !Array.isArray(edges)) {
      res.status(400).json({ success: false, error: 'Invalid request body: skills[] and edges[] are required' });
      return;
    }

    const result = await analyzeSkillEcosystemWithAI({
      skills: skills.map((item: any) => ({
        id: String(item?.id ?? ''),
        title: String(item?.title ?? ''),
        category: String(item?.category ?? '其他'),
        tags: Array.isArray(item?.tags) ? item.tags.map((tag: unknown) => String(tag)) : [],
      })),
      edges: edges.map((item: any) => ({
        sourceId: String(item?.sourceId ?? ''),
        targetId: String(item?.targetId ?? ''),
        score: Number(item?.score ?? 0),
        sharedTags: Array.isArray(item?.sharedTags) ? item.sharedTags.map((tag: unknown) => String(tag)) : [],
      })),
    });

    res.json({ success: true, data: result });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to analyze ecosystem' });
  }
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err?.type === 'entity.too.large') {
    res.status(413).json({ success: false, error: '导入内容过大，请缩小目录范围后重试（例如只选 skills 目录）。' });
    return;
  }

  console.error('Unhandled API error:', err);
  res.status(500).json({ success: false, error: '服务暂时不可用，请稍后重试。' });
});

const port = Number(process.env.PORT ?? 3210);
const host = process.env.HOST ?? '0.0.0.0';
app.listen(port, host, () => {
  console.log(`Skill Dashboard API listening on http://${host}:${port}`);
});
