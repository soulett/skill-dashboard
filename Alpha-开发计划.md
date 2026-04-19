# Skill Dashboard Alpha 闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 打通“扫描本地技能 -> 展示真实数据 -> 健康检查 -> 去完善 -> 保存 sidecar metadata”的 Alpha 完整闭环。

**Architecture:** 继续保留当前 React + Vite 前端，但新增一个本地 Express 数据层负责扫描真实目录、创建并维护 `skill-dashboard-data/metadata.json`、返回合并后的 `Skill` 数据。前端通过统一 API 接口读取真实数据，健康检查和右侧编辑面板都基于合并结果工作。

**Tech Stack:** React 19, TypeScript, Vite, Express, Node `fs/promises`, `tsx`, existing `npm run lint`

---

## File Structure

本次实现建议锁定这些文件边界，避免把逻辑继续堆进现有大文件：

- Create: `D:\AI-Coding\skill dashboard\server\types.ts`
  - 后端内部使用的 metadata 类型、扫描配置类型
- Create: `D:\AI-Coding\skill dashboard\server\config.ts`
  - 扫描根目录、metadata 路径、支持扩展名
- Create: `D:\AI-Coding\skill dashboard\server\metadata-store.ts`
  - `metadata.json` 的创建、读取、写入、原子更新
- Create: `D:\AI-Coding\skill dashboard\server\skill-parser.ts`
  - 从真实文件解析最小 `Skill`
- Create: `D:\AI-Coding\skill dashboard\server\skill-scanner.ts`
  - 递归扫描目录、过滤 skill 文件、产出基础 `Skill[]`
- Create: `D:\AI-Coding\skill dashboard\server\skill-service.ts`
  - 合并原始扫描结果和 sidecar metadata、统计数据、metadata patch 保存
- Create: `D:\AI-Coding\skill dashboard\server\index.ts`
  - Express 路由：`GET /api/skills`、`GET /api/stats`、`POST /api/scan`、`PATCH /api/skills/:id/metadata`
- Create: `D:\AI-Coding\skill dashboard\src/api/client.ts`
  - 前端真实 API 请求封装
- Create: `D:\AI-Coding\skill dashboard\src/api/index.ts`
  - mock / real 开关统一入口
- Modify: `D:\AI-Coding\skill dashboard\src\types.ts`
  - 增加 Alpha 所需 metadata patch / API 返回类型
- Modify: `D:\AI-Coding\skill dashboard\src\App.tsx`
  - 切换到统一 `api`，接入真实扫描和刷新
- Modify: `D:\AI-Coding\skill dashboard\src\components\RightPanel.tsx`
  - 保存走真实 metadata patch
- Modify: `D:\AI-Coding\skill dashboard\src\components\pages\HealthCheck.tsx`
  - 基于真实合并数据重新刷新
- Modify: `D:\AI-Coding\skill dashboard\package.json`
  - 增加本地 server 启动脚本
- Modify: `D:\AI-Coding\skill dashboard\README.md`
  - 更新本地运行说明

---

### Task 1: 建立 Alpha 数据层骨架

**Files:**
- Create: `D:\AI-Coding\skill dashboard\server\types.ts`
- Create: `D:\AI-Coding\skill dashboard\server\config.ts`
- Create: `D:\AI-Coding\skill dashboard\server\index.ts`
- Modify: `D:\AI-Coding\skill dashboard\package.json`

- [ ] **Step 1: 定义后端内部类型**

在 `D:\AI-Coding\skill dashboard\server\types.ts` 写入：

```ts
import type { Category, Skill } from '../src/types';

export interface SkillMetadataPatch {
  description?: string;
  category?: Category;
  tags?: string[];
  whenToUse?: string[];
}

export interface SkillMetadataFile {
  version: number;
  updatedAt: string;
  skills: Record<string, SkillMetadataPatch>;
}

export interface ScanContext {
  scanRoots: string[];
  metadataFilePath: string;
}

export interface ParsedSkillFile extends Skill {
  relativeKey: string;
}
```

- [ ] **Step 2: 定义本地配置**

在 `D:\AI-Coding\skill dashboard\server\config.ts` 写入：

```ts
import path from 'node:path';
import type { ScanContext } from './types';

const workspaceRoot = path.resolve(process.cwd());
const dataDir = path.join(workspaceRoot, 'skill-dashboard-data');

export const scanContext: ScanContext = {
  scanRoots: [
    path.join(workspaceRoot, 'skills-source'),
  ],
  metadataFilePath: path.join(dataDir, 'metadata.json'),
};

export const SUPPORTED_SKILL_FILES = new Set(['SKILL.md', 'skill.md']);
```

备注：`skills-source` 先作为开发期真实目录。后续再接用户真实目录配置。

- [ ] **Step 3: 建 Express 服务入口骨架**

在 `D:\AI-Coding\skill dashboard\server\index.ts` 写入：

```ts
import express from 'express';

const app = express();
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { ok: true } });
});

const port = 3001;
app.listen(port, '127.0.0.1', () => {
  console.log(`Skill Dashboard API listening on http://127.0.0.1:${port}`);
});
```

- [ ] **Step 4: 增加 server 启动脚本**

在 `D:\AI-Coding\skill dashboard\package.json` 的 `scripts` 中加入：

```json
{
  "server": "tsx server/index.ts",
  "dev:client": "vite --port=3000 --host=0.0.0.0"
}
```

保留现有 `dev`、`build`、`lint`，不要一次性重写。

- [ ] **Step 5: 运行类型检查**

Run: `npm run lint`  
Expected: PASS

- [ ] **Step 6: 启动本地 API 骨架**

Run: `npm run server`  
Expected: terminal 输出 `Skill Dashboard API listening on http://127.0.0.1:3001`

---

### Task 2: 实现 sidecar metadata 创建与读写

**Files:**
- Create: `D:\AI-Coding\skill dashboard\server\metadata-store.ts`
- Modify: `D:\AI-Coding\skill dashboard\server\index.ts`

- [ ] **Step 1: 编写 metadata 默认对象**

在 `D:\AI-Coding\skill dashboard\server\metadata-store.ts` 写入：

```ts
import fs from 'node:fs/promises';
import path from 'node:path';
import type { SkillMetadataFile, SkillMetadataPatch } from './types';

export function createEmptyMetadata(): SkillMetadataFile {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    skills: {},
  };
}
```

- [ ] **Step 2: 编写 metadata 确保存在逻辑**

继续在 `metadata-store.ts` 加入：

```ts
export async function ensureMetadataFile(metadataFilePath: string): Promise<SkillMetadataFile> {
  await fs.mkdir(path.dirname(metadataFilePath), { recursive: true });

  try {
    const raw = await fs.readFile(metadataFilePath, 'utf8');
    return JSON.parse(raw) as SkillMetadataFile;
  } catch {
    const empty = createEmptyMetadata();
    await fs.writeFile(metadataFilePath, JSON.stringify(empty, null, 2), 'utf8');
    return empty;
  }
}
```

- [ ] **Step 3: 编写 metadata patch 写入逻辑**

继续在 `metadata-store.ts` 加入：

```ts
export async function saveSkillMetadataPatch(
  metadataFilePath: string,
  skillId: string,
  patch: SkillMetadataPatch,
): Promise<SkillMetadataFile> {
  const current = await ensureMetadataFile(metadataFilePath);
  const next: SkillMetadataFile = {
    ...current,
    updatedAt: new Date().toISOString(),
    skills: {
      ...current.skills,
      [skillId]: {
        ...current.skills[skillId],
        ...patch,
      },
    },
  };

  await fs.writeFile(metadataFilePath, JSON.stringify(next, null, 2), 'utf8');
  return next;
}
```

- [ ] **Step 4: 给服务入口接一个调试路由**

在 `D:\AI-Coding\skill dashboard\server\index.ts` 中临时接入：

```ts
import { scanContext } from './config';
import { ensureMetadataFile } from './metadata-store';

app.get('/api/debug/metadata', async (_req, res) => {
  const data = await ensureMetadataFile(scanContext.metadataFilePath);
  res.json({ success: true, data });
});
```

- [ ] **Step 5: 验证 metadata 自动创建**

Run: `npm run server`  
Then open: `http://127.0.0.1:3001/api/debug/metadata`  
Expected: 返回 `version / updatedAt / skills: {}`

- [ ] **Step 6: 确认本地文件落盘**

Check file: `D:\AI-Coding\skill dashboard\skill-dashboard-data\metadata.json`  
Expected content:

```json
{
  "version": 1,
  "updatedAt": "2026-04-19T12:00:00.000Z",
  "skills": {}
}
```

---

### Task 3: 实现真实 skill 扫描与最小解析

**Files:**
- Create: `D:\AI-Coding\skill dashboard\server\skill-parser.ts`
- Create: `D:\AI-Coding\skill dashboard\server\skill-scanner.ts`
- Modify: `D:\AI-Coding\skill dashboard\server\config.ts`

- [ ] **Step 1: 约定开发期真实目录**

在项目根目录手动准备一个目录用于开发联调：

`D:\AI-Coding\skill dashboard\skills-source`

目录下至少准备两个示例 skill：

```md
--- 
title: Git Ops
description: 处理提交、分支、冲突和回滚建议
category: 编程开发
tags: [git, workflow]
---

# Git Ops

处理提交、分支、冲突和回滚建议，让日常 Git 操作更稳更快。
```

```md
# Browser QA

在需要真实浏览器上下文时执行页面检查、截图和流程验证。
```

- [ ] **Step 2: 编写基础解析器**

在 `D:\AI-Coding\skill dashboard\server\skill-parser.ts` 写入最小解析逻辑：

```ts
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Category, Skill } from '../src/types';
import type { ParsedSkillFile } from './types';

const CATEGORIES: Category[] = ['编程开发', '内容创作', '数据分析', '产品设计', '效率流程', '商业营销', '其他'];

function normalizeCategory(value?: string): Category {
  return CATEGORIES.includes(value as Category) ? (value as Category) : '其他';
}

export async function parseSkillFile(root: string, filePath: string): Promise<ParsedSkillFile> {
  const raw = await fs.readFile(filePath, 'utf8');
  const fileName = path.basename(filePath);
  const relativeKey = path.relative(root, filePath).replaceAll('\\', '/');
  const title = raw.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? path.basename(path.dirname(filePath));
  const description = raw.match(/description:\s*(.+)/)?.[1]?.trim() ?? raw.split('\n').find(Boolean)?.slice(0, 50) ?? '待补充描述';
  const category = normalizeCategory(raw.match(/category:\s*(.+)/)?.[1]?.trim());
  const tagsLine = raw.match(/tags:\s*\[(.+)\]/)?.[1] ?? '';
  const tags = tagsLine ? tagsLine.split(',').map(tag => tag.trim()).filter(Boolean) : [];
  const now = new Date().toISOString();

  const skill: ParsedSkillFile = {
    id: relativeKey,
    relativeKey,
    title,
    description,
    category,
    tags,
    status: title && description ? 'active' : 'unrecognized',
    icon: 'Cpu',
    sourcePath: filePath,
    fileName,
    fileType: 'md',
    updatedAt: now,
    scannedAt: now,
    details: {
      whatItDoes: description,
      whenToUse: [],
      triggerWords: tags,
      rawContent: raw,
    },
  };

  return skill;
}
```

- [ ] **Step 3: 编写扫描器**

在 `D:\AI-Coding\skill dashboard\server\skill-scanner.ts` 写入：

```ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { SUPPORTED_SKILL_FILES } from './config';
import { parseSkillFile } from './skill-parser';
import type { ParsedSkillFile } from './types';

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return SUPPORTED_SKILL_FILES.has(entry.name) ? [fullPath] : [];
  }));
  return files.flat();
}

export async function scanSkillRoots(roots: string[]): Promise<ParsedSkillFile[]> {
  const collected = await Promise.all(
    roots.map(async root => {
      try {
        const files = await walk(root);
        return Promise.all(files.map(file => parseSkillFile(root, file)));
      } catch {
        return [];
      }
    }),
  );

  return collected.flat();
}
```

- [ ] **Step 4: 临时接入调试路由**

在 `D:\AI-Coding\skill dashboard\server\index.ts` 增加：

```ts
import { scanSkillRoots } from './skill-scanner';

app.get('/api/debug/scan', async (_req, res) => {
  const skills = await scanSkillRoots(scanContext.scanRoots);
  res.json({ success: true, data: { skills, total: skills.length } });
});
```

- [ ] **Step 5: 验证扫描结果**

Run: `npm run server`  
Then open: `http://127.0.0.1:3001/api/debug/scan`  
Expected: 返回至少 2 条真实 skill 记录

- [ ] **Step 6: 运行类型检查**

Run: `npm run lint`  
Expected: PASS

---

### Task 4: 实现扫描结果与 metadata 合并服务

**Files:**
- Create: `D:\AI-Coding\skill dashboard\server\skill-service.ts`
- Modify: `D:\AI-Coding\skill dashboard\server\index.ts`

- [ ] **Step 1: 编写合并函数**

在 `D:\AI-Coding\skill dashboard\server\skill-service.ts` 写入：

```ts
import type { Skill, StatsData } from '../src/types';
import { ensureMetadataFile, saveSkillMetadataPatch } from './metadata-store';
import { scanSkillRoots } from './skill-scanner';
import type { ScanContext, SkillMetadataPatch } from './types';

function mergeSkill(base: Skill, patch?: SkillMetadataPatch): Skill {
  if (!patch) return base;
  return {
    ...base,
    ...(patch.description ? { description: patch.description } : {}),
    ...(patch.category ? { category: patch.category } : {}),
    ...(patch.tags ? { tags: patch.tags } : {}),
    details: {
      ...base.details,
      ...(patch.whenToUse ? { whenToUse: patch.whenToUse } : {}),
    },
  };
}
```

- [ ] **Step 2: 编写获取技能列表服务**

继续在 `skill-service.ts` 加入：

```ts
export async function getMergedSkills(context: ScanContext): Promise<Skill[]> {
  const [metadata, parsed] = await Promise.all([
    ensureMetadataFile(context.metadataFilePath),
    scanSkillRoots(context.scanRoots),
  ]);

  return parsed.map(skill => mergeSkill(skill, metadata.skills[skill.id]));
}
```

- [ ] **Step 3: 编写 stats 服务**

继续在 `skill-service.ts` 加入：

```ts
export async function getStats(context: ScanContext): Promise<StatsData> {
  const skills = await getMergedSkills(context);
  return {
    totalSkills: skills.length,
    totalCategories: new Set(skills.map(skill => skill.category)).size,
    newSinceLastScan: 0,
    lastScanTime: new Date().toISOString(),
  };
}
```

- [ ] **Step 4: 编写 metadata 保存服务**

继续在 `skill-service.ts` 加入：

```ts
export async function updateSkillMetadata(
  context: ScanContext,
  skillId: string,
  patch: SkillMetadataPatch,
): Promise<Skill | null> {
  await saveSkillMetadataPatch(context.metadataFilePath, skillId, patch);
  const skills = await getMergedSkills(context);
  return skills.find(skill => skill.id === skillId) ?? null;
}
```

- [ ] **Step 5: 把 Express 路由换成正式 API**

在 `D:\AI-Coding\skill dashboard\server\index.ts` 中加入：

```ts
import { getMergedSkills, getStats, updateSkillMetadata } from './skill-service';

app.get('/api/skills', async (_req, res) => {
  const skills = await getMergedSkills(scanContext);
  res.json({ success: true, data: { skills, total: skills.length } });
});

app.get('/api/stats', async (_req, res) => {
  const stats = await getStats(scanContext);
  res.json({ success: true, data: stats });
});

app.post('/api/scan', async (_req, res) => {
  const skills = await getMergedSkills(scanContext);
  res.json({
    success: true,
    data: {
      success: true,
      totalFound: skills.length,
      newCount: 0,
      updatedCount: 0,
      failedCount: 0,
      scannedAt: new Date().toISOString(),
      errors: [],
    },
  });
});

app.patch('/api/skills/:id/metadata', async (req, res) => {
  const skill = await updateSkillMetadata(scanContext, req.params.id, req.body);
  if (!skill) {
    res.status(404).json({ success: false, error: `Skill not found: ${req.params.id}` });
    return;
  }
  res.json({ success: true, data: skill });
});
```

- [ ] **Step 6: 手动验证合并 API**

Run: `npm run server`  
Open: `http://127.0.0.1:3001/api/skills`  
Expected: 返回真实扫描的 skill 列表

---

### Task 5: 给前端接统一 API 层

**Files:**
- Create: `D:\AI-Coding\skill dashboard\src\api\client.ts`
- Create: `D:\AI-Coding\skill dashboard\src\api\index.ts`
- Modify: `D:\AI-Coding\skill dashboard\src\types.ts`
- Modify: `D:\AI-Coding\skill dashboard\src\App.tsx`

- [ ] **Step 1: 为前端补充 metadata patch 类型**

在 `D:\AI-Coding\skill dashboard\src\types.ts` 中新增：

```ts
export interface SkillMetadataPatch {
  description?: string;
  category?: Category;
  tags?: string[];
  whenToUse?: string[];
}
```

- [ ] **Step 2: 编写真正的 API client**

在 `D:\AI-Coding\skill dashboard\src\api\client.ts` 写入：

```ts
import type { ApiResponse, ScanResult, Skill, SkillMetadataPatch, StatsData } from '../types';

const API_BASE = 'http://127.0.0.1:3001';

async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  return response.json();
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
```

- [ ] **Step 3: 编写统一 API 出口**

在 `D:\AI-Coding\skill dashboard\src\api\index.ts` 写入：

```ts
import { mockApi } from '../mock';
import { realApi } from './client';

const USE_MOCK = false;

export const api = USE_MOCK
  ? {
      getSkills: mockApi.getSkills,
      getStats: mockApi.getStats,
      triggerScan: mockApi.triggerScan,
      updateSkillMetadata: async (id: string, payload: { description?: string; category?: string; tags?: string[]; whenToUse?: string[] }) => {
        return mockApi.updateSkill(id, {
          ...(payload.description !== undefined ? { description: payload.description } : {}),
          ...(payload.category !== undefined ? { category: payload.category as never } : {}),
          ...(payload.tags !== undefined ? { tags: payload.tags } : {}),
          ...(payload.whenToUse !== undefined ? { details: { whenToUse: payload.whenToUse } } : {}),
        });
      },
    }
  : realApi;
```

- [ ] **Step 4: 把 App 改为调用统一 api**

在 `D:\AI-Coding\skill dashboard\src\App.tsx` 中把：

```ts
import { mockApi } from './mock';
```

替换为：

```ts
import { api } from './api';
```

并把所有 `mockApi.getSkills / getStats / triggerScan` 改成 `api.*`

- [ ] **Step 5: 启动前后端联调**

Run terminal 1: `npm run server`  
Run terminal 2: `npm run dev`

Expected:
- 前端能展示真实扫描数据
- 点击刷新调用真实 `/api/scan`

---

### Task 6: 把右侧编辑保存切到 sidecar metadata

**Files:**
- Modify: `D:\AI-Coding\skill dashboard\src\components\RightPanel.tsx`
- Modify: `D:\AI-Coding\skill dashboard\src\App.tsx`

- [ ] **Step 1: 在 RightPanel 中改用 metadata patch**

把 `RightPanel.tsx` 里的：

```ts
import { mockApi } from '../mock';
```

替换为：

```ts
import { api } from '../api';
```

- [ ] **Step 2: 组装 metadata patch 请求**

把保存逻辑调整为：

```ts
const result = await api.updateSkillMetadata(skill.id, {
  description: draft.description,
  category: draft.category,
  tags: draft.tags,
  whenToUse: draft.details?.whenToUse,
});
```

不要在 Alpha 阶段把 `rawContent` 直接保存到 metadata。

- [ ] **Step 3: 保存成功后继续复用现有 UI 更新逻辑**

保留：

```ts
if (result.success) {
  onSkillUpdate(result.data);
  setIsEditing(false);
  setDraft({});
  showToast('演示数据已保存', 'success');
}
```

但把 toast 文案改为：

```ts
showToast('技能补充信息已保存', 'success');
```

- [ ] **Step 4: 联调保存回写**

操作路径：
1. 打开任意 skill
2. 编辑描述 / 分类 / 标签 / 适用场景
3. 点击保存

Expected:
- 右侧面板更新
- 首页卡片更新
- `D:\AI-Coding\skill dashboard\skill-dashboard-data\metadata.json` 出现对应 skill 条目

---

### Task 7: 让健康检查真正基于合并后的真实数据工作

**Files:**
- Modify: `D:\AI-Coding\skill dashboard\src\App.tsx`
- Modify: `D:\AI-Coding\skill dashboard\src\components\pages\HealthCheck.tsx`

- [ ] **Step 1: 确保健康检查拿到的是实时 `skills` 状态**

保留当前 `App.tsx` 里将 `skills` 传给 `HealthCheck` 的方式：

```tsx
<HealthCheck skills={skills} onNavigateToSkill={handleNavigateToSkill} />
```

关键要求：`skills` 必须来自真实 API 合并结果，而不是本地 mock 常量。

- [ ] **Step 2: 保存成功后同步刷新 skills 集合**

保留 `handleSkillUpdate`：

```ts
const handleSkillUpdate = (updatedSkill: Skill) => {
  setSkills(previous => previous.map(skill => (skill.id === updatedSkill.id ? updatedSkill : skill)));
  setAutoEditSkillId(null);
};
```

这样健康检查会自动基于最新 skill 重新计算。

- [ ] **Step 3: 手动回归完整闭环**

回归路径：
1. 启动前后端
2. 打开首页，确认是真实 skill
3. 进入健康检查
4. 找一个字段缺失的 skill
5. 点击 `去完善`
6. 保存补充信息
7. 返回观察健康检查结果是否改善

Expected:
- 右侧打开并自动进入编辑
- 保存后再次进入健康检查时分数变化

---

### Task 8: 收尾脚本与文档

**Files:**
- Modify: `D:\AI-Coding\skill dashboard\README.md`
- Modify: `D:\AI-Coding\skill dashboard\Alpha-真实链路设计说明.md`

- [ ] **Step 1: 更新 README 的运行方式**

把 `README.md` 中的运行说明改成：

```md
## Run Locally

1. Install dependencies:
   `npm install`
2. Start the local API:
   `npm run server`
3. Start the frontend:
   `npm run dev`
4. Open:
   `http://127.0.0.1:3000`
```

- [ ] **Step 2: 在设计文档里补一个“当前实现路径”小节**

在 `Alpha-真实链路设计说明.md` 末尾补：

```md
## 10. 当前实现约定

- 开发期扫描目录：`skills-source/`
- sidecar metadata 路径：`skill-dashboard-data/metadata.json`
- 当前只支持 `SKILL.md`
- 当前只保存 `description / category / tags / whenToUse`
```

- [ ] **Step 3: 最终验证**

Run:
- `npm run lint`
- `npm run build`

Expected:
- 两个命令都通过

---

## Self-Review

### Spec coverage

- 扫描本地技能目录：Task 3
- 展示真实数据：Task 4 + Task 5
- 健康检查基于真实数据：Task 7
- 去完善进入编辑：沿用现有交互，Task 7 回归验证
- sidecar metadata 保存：Task 2 + Task 6

没有遗漏核心闭环要求。

### Placeholder scan

- 没有使用 `TODO / TBD / implement later`
- 每个任务都给了明确文件和命令
- 代码步骤都附了实际代码片段

### Type consistency

- `SkillMetadataPatch` 在前后端分别定义，但字段保持一致
- 前端保存走 `updateSkillMetadata`
- 后端返回仍然是合并后的 `Skill`

---

## Execution Handoff

Plan complete and saved to `D:\AI-Coding\skill dashboard\Alpha-开发计划.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?

