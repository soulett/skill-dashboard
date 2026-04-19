import { ApiResponse, MarketplaceItem, ScanResult, Skill, SkillUpdatePayload, StatsData } from './types';
import { SKILLS, STATS_DATA } from './constants';

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const cloneSkill = (skill: Skill): Skill => ({
  ...skill,
  tags: [...skill.tags],
  details: {
    ...skill.details,
    whenToUse: [...skill.details.whenToUse],
    triggerWords: [...skill.details.triggerWords],
  },
});

const db = {
  skills: SKILLS.map(cloneSkill),
};

export const mockApi = {
  async getSkills(params?: { q?: string; category?: string }): Promise<ApiResponse<{ skills: Skill[]; total: number }>> {
    await delay(120);
    let result = [...db.skills];

    if (params?.category && params.category !== 'All') {
      result = result.filter(skill => skill.category === params.category);
    }

    if (params?.q) {
      const q = params.q.toLowerCase();
      result = result.filter(
        skill =>
          skill.title.toLowerCase().includes(q) ||
          skill.description.toLowerCase().includes(q) ||
          skill.tags.some(tag => tag.toLowerCase().includes(q)),
      );
    }

    return { success: true, data: { skills: result.map(cloneSkill), total: result.length } };
  },

  async getStats(): Promise<ApiResponse<StatsData>> {
    await delay(50);
    return {
      success: true,
      data: {
        ...STATS_DATA,
        totalSkills: db.skills.length,
        totalCategories: [...new Set(db.skills.map(skill => skill.category))].length,
      },
    };
  },

  async updateSkill(id: string, payload: SkillUpdatePayload): Promise<ApiResponse<Skill>> {
    await delay(380);
    const index = db.skills.findIndex(skill => skill.id === id);
    if (index === -1) {
      return { success: false, data: null as unknown as Skill, error: `Skill not found: ${id}` };
    }

    const current = db.skills[index];
    const updated: Skill = {
      ...current,
      ...(payload.title !== undefined ? { title: payload.title } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.category !== undefined ? { category: payload.category } : {}),
      ...(payload.tags !== undefined ? { tags: [...payload.tags] } : {}),
      details: {
        ...current.details,
        ...(payload.details?.whenToUse !== undefined ? { whenToUse: [...payload.details.whenToUse] } : {}),
        ...(payload.details?.rawContent !== undefined ? { rawContent: payload.details.rawContent } : {}),
      },
      updatedAt: new Date().toISOString(),
    };

    db.skills[index] = updated;
    return { success: true, data: cloneSkill(updated) };
  },

  async installSkill(item: MarketplaceItem): Promise<ApiResponse<Skill>> {
    await delay(900);
    if (db.skills.some(skill => skill.id === item.id)) {
      return { success: false, data: null as unknown as Skill, error: 'Already installed' };
    }

    const newSkill: Skill = {
      id: item.id,
      title: item.name,
      description: item.description,
      category: item.category,
      tags: [...item.tags],
      status: 'active',
      icon: 'Download',
      sourcePath: `~/.codex/skills/${item.id}/SKILL.md`,
      fileName: 'SKILL.md',
      fileType: 'md',
      updatedAt: new Date().toISOString(),
      scannedAt: new Date().toISOString(),
      details: {
        whatItDoes: item.description,
        whenToUse: ['刚安装后想快速试用时', '当前技能库缺少这类能力时'],
        triggerWords: [...item.tags],
        rawContent: `---
name: ${item.id}
description: ${item.description}
---

# ${item.name}

- Installed from marketplace demo`,
      },
    };

    db.skills.push(newSkill);
    return { success: true, data: cloneSkill(newSkill) };
  },

  async triggerScan(): Promise<ApiResponse<ScanResult>> {
    await delay(1200);
    return {
      success: true,
      data: {
        success: true,
        totalFound: db.skills.length,
        newCount: 0,
        updatedCount: 0,
        failedCount: 1,
        scannedAt: new Date().toISOString(),
        errors: ['legacy-checklist.txt 缺少结构化元信息，已标记为待整理'],
      },
    };
  },
};
