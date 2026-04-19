import type { ApiResponse, ScanResult, Skill, SkillMetadataPatch, StatsData } from '../types';

async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  return response.json() as Promise<ApiResponse<T>>;
}

export const realApi = {
  getSkills: () => request<{ skills: Skill[]; total: number }>('/api/skills'),
  getStats: () => request<StatsData>('/api/stats'),
  triggerScan: () => request<ScanResult>('/api/scan', { method: 'POST' }),
  updateSkillMetadata: (id: string, payload: SkillMetadataPatch) =>
    request<Skill>(`/api/skills/${encodeURIComponent(id)}/metadata`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};
