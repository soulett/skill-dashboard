# Skill Dashboard - Alpha 真实链路设计说明

> 版本：v0.2 Alpha  
> 目标：从静态 Demo 进入真实可用的本地技能管理闭环

## 1. Alpha 目标

本阶段目标不是继续做更好看的 Demo，而是打通一条真实产品闭环：

`扫描本地技能 -> 展示真实数据 -> 健康检查发现缺口 -> 去完善 -> 保存补充信息`

用户完成这条链路后，应该能看到自己真实安装了哪些 skills，系统能指出信息缺口，用户可以补齐展示信息，并且刷新后不会丢失。

## 2. 交付范围

必须交付：

1. 扫描本地 Codex skills 目录，识别 `SKILL.md`
2. 解析成统一 `Skill` 数据结构并展示到前端
3. 基于真实数据运行健康检查
4. 从健康检查跳到技能详情并进入编辑态
5. 将补充信息写入 sidecar metadata
6. 支持不修改原始 skill 文件的中文展示层

明确不做：

1. 不直接改原始 `SKILL.md`
2. 不做云同步、账号体系、多端同步
3. 不做技能执行或 LLM 调用
4. 不做复杂市场安装管理
5. 不追求兼容所有历史格式，只支持首批明确扫描规则

## 3. 数据来源

最终展示数据来自两层合并：

`原始 SKILL.md 解析结果 + sidecar metadata 覆盖结果`

原始文件提供：

1. 文件路径
2. 文件更新时间
3. 原始内容
4. 可解析出的标题、描述、分类、标签

sidecar metadata 提供：

1. 用户修正后的中文标题
2. 用户修正后的中文描述
3. 用户修正后的分类
4. 用户补充的标签
5. 用户补充的适用场景
6. 自动生成的中文展示信息

## 4. Sidecar Metadata

metadata 文件默认放在：

`skill-dashboard-data/metadata.json`

它属于产品数据层，不属于原始 skill 仓库。这样做的原因是：第一版产品需要形成闭环，但不应该冒险破坏用户已有的 skill 文件。

推荐结构：

```json
{
  "version": 1,
  "updatedAt": "2026-04-20T00:00:00.000Z",
  "skills": {
    ".system/openai-docs/SKILL.md": {
      "displayTitle": "OpenAI 官方文档助手",
      "displayDescription": "查询 OpenAI 官方文档，帮助确认模型、接口和最新能力。",
      "category": "编程开发",
      "tags": ["openai", "api", "文档"],
      "whenToUse": ["接入 OpenAI API 前确认官方用法时"],
      "locale": "zh-CN",
      "translationSource": "auto",
      "translatedAt": "2026-04-20T00:00:00.000Z"
    }
  }
}
```

覆盖优先级：

`sidecar metadata > 原始解析结果 > 文件名兜底推断`

## 5. 中文展示层设计

很多本地 skills 的原始内容是英文。产品应该帮助中文用户理解和检索这些能力，但不能修改原文件。

因此采用“中文展示层”：

1. 原始 `SKILL.md` 保持不变
2. 系统生成中文 `displayTitle`、`displayDescription`、`tags`、`whenToUse`
3. 生成结果保存到 `metadata.json`
4. 前端优先展示中文 metadata
5. 详情页仍保留原始内容，方便用户回看英文源文件

交互规则：

1. 右侧详情提供“中文化”按钮
2. 点击后自动生成中文展示信息并保存到 metadata
3. 用户可以继续编辑中文展示信息
4. 保存只写 metadata，不写原始 `SKILL.md`
5. 首页提供“一键中文化展示信息”，用于批量生成所有本地 skills 的中文展示层

## 6. 分类策略

分类来源优先级：

1. 用户在 metadata 中修正的分类
2. 原始 frontmatter 中的 category
3. 根据路径、标题、描述、正文关键词推断
4. 无法判断时归为“其他”

当前分类枚举：

```ts
type Category =
  | '编程开发'
  | '内容创作'
  | '数据分析'
  | '产品设计'
  | '效率流程'
  | '商业营销'
  | '其他';
```

## 7. API 约定

当前最小 API：

1. `GET /api/skills`：返回合并后的技能列表
2. `GET /api/stats`：返回统计信息
3. `POST /api/scan`：触发重新扫描
4. `PATCH /api/skills/:id/metadata`：保存某个 skill 的 metadata
5. `POST /api/skills/:id/localize`：生成并保存中文展示信息
6. `POST /api/localize-all`：批量生成并保存所有 skills 的中文展示信息

## 8. 当前实现约定

当前默认扫描目录：

`C:\Users\14316\.codex\skills`

如果真实目录没有扫描到内容，则回退到项目样例目录：

`skills-source/`

本地 API 默认端口：

`3210`

前端通过 Vite `/api` 代理访问本地 API。

## 9. 成功标准

1. 首页能展示真实本地 skills
2. 点击“中文化”后，英文 skill 卡片能变成中文展示
3. 中文展示结果刷新后仍保留
4. 原始 `SKILL.md` 不被修改
5. 健康检查基于合并后的数据计算

---

## 10. 版本变更留痕

### 2026-04-21（v0.3）

1. 新增卡片来源标识  
技能卡片显示来源徽标：`Codex / Cursor / Claude / 其他`。

2. 新增来源筛选  
在分类筛选下方增加来源筛选条，支持与分类筛选叠加过滤。

3. 扫描按钮语义固定  
`扫描新技能并更新中文展示` 的产品行为固定为：
- 扫描本地来源目录，更新技能清单
- 同步刷新中文展示 metadata

4. 文档与实现一致性  
本次改动已在 PRD 与 Alpha 链路文档同时登记，保证需求留痕可追踪。
