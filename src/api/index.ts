import { mockApi } from '../mock';
import { DashboardEventSummary, PromptRecommendationResult, SkillMetadataPatch, SourceScanSummary } from '../types';
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
      getEventSummary: async () =>
        ({
          success: true,
          data: {
            sampledEvents: 0,
            recommendationViewCount: 0,
            sceneSelectedCount: 0,
            recommendationClickedCount: 0,
            skillDetailOpenedCount: 0,
            sceneClickRate: 0,
            recommendationClickRate: 0,
            detailOpenRate: 0,
            updatedAt: new Date().toISOString(),
          } satisfies DashboardEventSummary,
        }),
      trackEvent: async (_payload: unknown) =>
        ({
          success: true,
          data: {
            id: `mock-${Date.now()}`,
            type: 'home_recommendation_view' as const,
            createdAt: new Date().toISOString(),
          },
        }),
      recommendByPrompt: async (_prompt: string, _topK = 5) =>
        ({
          success: true,
          data: {
            items: [],
            fallbackUsed: true,
          } satisfies PromptRecommendationResult,
        }),
      triggerScan: mockApi.triggerScan,
      importSkills: async () =>
        ({
          success: true,
          data: {
            success: true,
            importedCount: 0,
            totalImportedStored: 0,
            totalSkills: 0,
            scannedAt: new Date().toISOString(),
          },
        }),
      importSource: async source =>
        ({
          success: true,
          data: {
            success: true,
            source,
            mode: 'default',
            importedPath: '~/.codex/skills',
            importedCount: 0,
            totalImportedStored: 0,
            totalSkills: 0,
            scannedAt: new Date().toISOString(),
          },
        }),
      importSourcePath: async (source, inputPath) =>
        ({
          success: true,
          data: {
            success: true,
            source,
            mode: 'manual-path',
            importedPath: inputPath,
            importedCount: 0,
            totalImportedStored: 0,
            totalSkills: 0,
            scannedAt: new Date().toISOString(),
          },
        }),
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
