import os from 'node:os';
import path from 'node:path';
import type { ScanContext } from './types';

const workspaceRoot = path.resolve(process.cwd());
const dataDir = path.join(workspaceRoot, 'skill-dashboard-data');
const defaultCodexSkillsRoot = path.join(os.homedir(), '.codex', 'skills');
const defaultCursorSkillsRoot = path.join(os.homedir(), '.cursor', 'skills');
const defaultCursorSkillsCursorRoot = path.join(os.homedir(), '.cursor', 'skills-cursor');
const workspaceCursorSkillsRoot = path.join(workspaceRoot, '.cursor', 'skills');
const defaultClaudeSkillsRoot = path.join(os.homedir(), '.claude', 'skills');
const demoSkillsRoot = path.join(workspaceRoot, 'skills-source');

export const SOURCE_SCAN_ROOTS = [
  { source: 'codex', label: 'Codex', paths: [defaultCodexSkillsRoot] },
  {
    source: 'cursor',
    label: 'Cursor',
    paths: [defaultCursorSkillsRoot, defaultCursorSkillsCursorRoot, workspaceCursorSkillsRoot],
  },
  { source: 'claude', label: 'Claude', paths: [defaultClaudeSkillsRoot] },
] as const;

function parseScanRoots(value?: string): string[] {
  if (!value) {
    return [
      defaultCodexSkillsRoot,
      defaultCursorSkillsRoot,
      defaultCursorSkillsCursorRoot,
      workspaceCursorSkillsRoot,
      defaultClaudeSkillsRoot,
    ];
  }

  return value
    .split(';')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => path.resolve(item));
}

export const scanContext: ScanContext = {
  scanRoots: parseScanRoots(process.env.SKILL_DASHBOARD_SCAN_ROOTS),
  fallbackScanRoots: [demoSkillsRoot],
  metadataFilePath: path.join(dataDir, 'metadata.json'),
  importedSkillsFilePath: path.join(dataDir, 'imported-skills.json'),
  eventsFilePath: path.join(dataDir, 'events.sqlite'),
};

export const SUPPORTED_SKILL_FILES = new Set(['SKILL.md', 'skill.md']);
