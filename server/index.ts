import express from 'express';
import { scanContext } from './config';
import { ensureMetadataFile } from './metadata-store';
import { scanSkillRoots } from './skill-scanner';
import { getMergedSkills, getStats, triggerScan, updateSkillMetadata } from './skill-service';

const app = express();

app.use(express.json());

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

app.post('/api/scan', async (_req, res) => {
  const result = await triggerScan(scanContext);
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

const port = 3210;
app.listen(port, '127.0.0.1', () => {
  console.log(`Skill Dashboard API listening on http://127.0.0.1:${port}`);
});
