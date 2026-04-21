import type { ApiResponse, ScanResult, Skill, SkillMetadataPatch, SourceScanSummary, StatsData } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

function buildUrl(path: string): string {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(buildUrl(path), {
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
  getSourceScanSummary: () => request<SourceScanSummary>('/api/source-scan-summary'),
  triggerScan: () => request<ScanResult>('/api/scan', { method: 'POST' }),
  updateSkillMetadata: (id: string, payload: SkillMetadataPatch) =>
    request<Skill>(`/api/skills/${encodeURIComponent(id)}/metadata`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  localizeSkill: (id: string) =>
    request<Skill>(`/api/skills/${encodeURIComponent(id)}/localize`, {
      method: 'POST',
    }),
  localizeAllSkills: () =>
    request<{ skills: Skill[]; total: number; updatedCount: number; skippedCount: number }>('/api/localize-all', {
      method: 'POST',
    }),
};
