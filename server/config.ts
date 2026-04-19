import path from 'node:path';
import type { ScanContext } from './types';

const workspaceRoot = path.resolve(process.cwd());
const dataDir = path.join(workspaceRoot, 'skill-dashboard-data');

export const scanContext: ScanContext = {
  scanRoots: [path.join(workspaceRoot, 'skills-source')],
  metadataFilePath: path.join(dataDir, 'metadata.json'),
};

export const SUPPORTED_SKILL_FILES = new Set(['SKILL.md', 'skill.md']);
