import { mockApi } from '../mock';
import { SkillMetadataPatch, SourceScanSummary } from '../types';
import { realApi } from './client';

const USE_MOCK = false;

export const api = USE_MOCK
  ? {
      getSkills: mockApi.getSkills,
      getStats: mockApi.getStats,
      getSourceScanSummary: async () =>
        ({
          success: true,
          data: {
            sources: [
              {
                source: 'codex',
                label: 'Codex',
                paths: ['~/.codex/skills'],
                status: 'detected',
                skillCount: 4,
                lastScannedAt: new Date().toISOString(),
              },
              {
                source: 'cursor',
                label: 'Cursor',
                paths: ['~/.cursor/skills'],
                status: 'empty',
                skillCount: 0,
                lastScannedAt: new Date().toISOString(),
              },
              {
                source: 'claude',
                label: 'Claude',
                paths: ['~/.claude/skills'],
                status: 'unreachable',
                skillCount: 0,
                lastScannedAt: new Date().toISOString(),
              },
            ],
            totalDetectedSkills: 4,
            scannedAt: new Date().toISOString(),
          } satisfies SourceScanSummary,
        }),
      triggerScan: mockApi.triggerScan,
      updateSkillMetadata: async (id: string, payload: SkillMetadataPatch) =>
        mockApi.updateSkill(id, {
          ...(payload.displayTitle !== undefined ? { title: payload.displayTitle } : {}),
          ...(payload.displayDescription !== undefined ? { description: payload.displayDescription } : {}),
          ...(payload.description !== undefined ? { description: payload.description } : {}),
          ...(payload.category !== undefined ? { category: payload.category } : {}),
          ...(payload.tags !== undefined ? { tags: payload.tags } : {}),
          ...(payload.whenToUse !== undefined ? { details: { whenToUse: payload.whenToUse } } : {}),
        }),
      localizeSkill: async (id: string) =>
        mockApi.updateSkill(id, {
          description: '这是一条本地演示生成的中文展示描述，用于模拟不修改原文件的中文化展示层。',
        }),
      localizeAllSkills: async () => {
        const skills = await mockApi.getSkills();
        if (!skills.success) return skills;
        return {
          success: true,
          data: {
            ...skills.data,
            updatedCount: skills.data.total,
            skippedCount: 0,
          },
        };
      },
    }
  : realApi;
