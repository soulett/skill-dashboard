import type { ApiResponse, ImportSkillsResult, ScanResult, Skill, SkillMetadataPatch, SourceScanSummary, StatsData } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

function buildUrl(path: string): string {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      ...init,
    });
  } catch (error) {
    return {
      success: false,
      data: null as unknown as T,
      error: `网络请求失败：${error instanceof Error ? error.message : String(error)}`,
    };
  }

  const rawText = await response.text();

  let parsed: unknown = null;
  if (rawText) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = null;
    }
  }

  if (parsed && typeof parsed === 'object' && 'success' in (parsed as Record<string, unknown>)) {
    const payload = parsed as ApiResponse<T>;
    if (!response.ok && payload.success !== false) {
      return {
        success: false,
        data: null as unknown as T,
        error: payload.error ?? `请求失败（${response.status}）`,
      };
    }
    return payload;
  }

  const fallbackError =
    response.status === 413
      ? '导入内容过大，请改为选择更小的 skills 子目录后重试。'
      : !response.ok
        ? `请求失败（${response.status}）`
        : '服务返回了非 JSON 响应，请确认后端服务与 API 地址配置。';

  return {
    success: false,
    data: null as unknown as T,
    error: fallbackError,
  };
}

export const realApi = {
  getSkills: () => request<{ skills: Skill[]; total: number }>('/api/skills'),
  getStats: () => request<StatsData>('/api/stats'),
  getSourceScanSummary: () => request<SourceScanSummary>('/api/source-scan-summary'),
  triggerScan: () => request<ScanResult>('/api/scan', { method: 'POST' }),
  importSkills: (skills: Skill[]) =>
    request<ImportSkillsResult>('/api/import-skills', {
      method: 'POST',
      body: JSON.stringify({ skills }),
    }),
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
