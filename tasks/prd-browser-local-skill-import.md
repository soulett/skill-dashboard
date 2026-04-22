# PRD: 浏览器授权本地目录导入 Skill（MVP）

## 0. 文档状态
- 版本：v0.2（已确认）
- 日期：2026-04-21
- 目标上线节奏：最快 4-6 小时可演示，1-2 天可上线

## 1. Overview
线上版本运行在云端（Vercel + Render），无法直接读取用户本机 `~/.codex` / `~/.cursor` / `~/.claude`。  
本功能通过浏览器 `File System Access API` 让用户手动授权本地目录，实现“导入本地 skill 并中文展示”。

## 2. Goals
- 非技术用户可在网页完成：授权目录 -> 扫描 -> 展示。
- 首次空库时，按钮可直接触发导入，不再“点不动”。
- 不修改原始 `SKILL.md`，只写 sidecar `metadata.json`。

## 3. Confirmed Decisions
- 决策 1（导入范围）：`A`  
只扫描用户手动选择的目录。
- 决策 2（去重规则）：`A*`（增强）  
按内容指纹聚合（主键），保留来源路径；卡片层合并展示，详情可查看多来源。
- 决策 3（中文化触发）：`A`  
每次导入后自动中文化。
- 决策 4（失败展示）：`A`  
顶部提示 + 可展开失败明细。

## 4. User Stories
### US-001: 选择本地目录并授权
**Description:** 作为用户，我希望点击按钮后选择本地技能目录，让网站读取我的真实 skill。  
**Acceptance Criteria:**
- [ ] 首页有“选择本地技能目录”入口
- [ ] 点击后弹系统目录选择器（`showDirectoryPicker`）
- [ ] 用户取消选择时给出温和提示，不报错
- [ ] 浏览器不支持 API 时给出替代引导
- [ ] Verify in browser using dev-browser skill

### US-002: 读取并解析 `SKILL.md`
**Description:** 作为用户，我希望自动识别目录中的技能文件并出现在卡片列表。  
**Acceptance Criteria:**
- [ ] 扫描目录下 `**/SKILL.md`（默认最大深度 4）
- [ ] 提取 `title/description/category/tags/whenToUse/sourcePath`
- [ ] 解析失败不影响其他文件导入
- [ ] 页面显示：成功数、失败数、耗时
- [ ] Verify in browser using dev-browser skill

### US-003: 导入后自动中文展示
**Description:** 作为用户，我希望导入完成后自动获得中文展示信息。  
**Acceptance Criteria:**
- [ ] 导入完成自动触发中文化
- [ ] 成功提示包含“更新条数/跳过条数”
- [ ] 不修改原始 `SKILL.md`
- [ ] Verify in browser using dev-browser skill

### US-004: 多来源合并展示
**Description:** 作为用户，我希望同一个 skill 不重复刷屏，但可看到来自多个平台。  
**Acceptance Criteria:**
- [ ] 相同内容 skill 只显示 1 张主卡
- [ ] 卡片显示来源数量（如 Codex+Claude）
- [ ] 详情中可展开看到全部来源路径
- [ ] Verify in browser using dev-browser skill

### US-005: 失败明细可追踪
**Description:** 作为用户，我希望知道哪些文件失败以及原因。  
**Acceptance Criteria:**
- [ ] 顶部 toast 告知导入结果
- [ ] 可展开失败列表（文件路径 + 原因）
- [ ] 失败列表支持复制/下载（MVP 可先复制）
- [ ] Verify in browser using dev-browser skill

## 5. Functional Requirements
- FR-1：支持 `window.showDirectoryPicker()` 授权目录（Chrome/Edge 优先）。
- FR-2：递归扫描授权目录 `SKILL.md` 并转换为统一 skill 结构。
- FR-3：导入后自动中文化，仅写 sidecar metadata。
- FR-4：支持内容指纹去重聚合，并保留多来源信息。
- FR-5：显示导入摘要（成功/失败/跳过/耗时）。
- FR-6：浏览器不支持或权限失效时，给出明确引导。

## 6. Non-Goals
- 不做后台静默全盘扫描。
- 不做跨设备目录授权同步。
- 不做桌面端（Electron/Tauri）打包。

## 7. Technical Notes
- 前端读取本地文件文本，后端只接收结构化 skill 数据。
- 去重建议：`normalizedContentHash`（主）+ 标题相似度（辅）。
- 数据模型新增：
  - `contentHash`
  - `sources: Array<{ platform, path }>`
  - `sourceCount`

## 8. Success Metrics
- 首次空库用户 3 分钟内成功导入 >=1 个 skill。
- 合法样本导入成功率 >= 90%。
- 导入后 1 次点击可看到中文卡片与来源信息。

## 9. Milestones（MVP）
1. 前端目录授权与遍历（0.5 天）
2. 导入接口与落盘（0.5 天）
3. 去重聚合 + 自动中文化（0.5 天）
4. 失败明细 + 回归测试（0.5 天）

