import { mockApi } from '../mock';
import { realApi } from './client';

const USE_MOCK = false;

export const api = USE_MOCK
  ? {
      getSkills: mockApi.getSkills,
      getStats: mockApi.getStats,
      triggerScan: mockApi.triggerScan,
      updateSkillMetadata: async (
        id: string,
        payload: { description?: string; category?: string; tags?: string[]; whenToUse?: string[] },
      ) =>
        mockApi.updateSkill(id, {
          ...(payload.description !== undefined ? { description: payload.description } : {}),
          ...(payload.category !== undefined ? { category: payload.category as never } : {}),
          ...(payload.tags !== undefined ? { tags: payload.tags } : {}),
          ...(payload.whenToUse !== undefined ? { details: { whenToUse: payload.whenToUse } } : {}),
        }),
    }
  : realApi;
