# 技能市场真实来源调研（v1）

日期：2026-04-22  
范围：用于替换 demo 中虚构 marketplace 数据，改为可追溯的公开来源卡片展示。

## 选型原则

- 优先可公开访问、可验证的仓库或官方页面
- 优先包含 `SKILL.md` / skills 目录或明确的技能集合定位
- 优先多平台兼容（Codex / Claude / Cursor）

## 已接入来源（首批）

- https://github.com/ComposioHQ/awesome-claude-skills
- https://github.com/sickn33/antigravity-awesome-skills
- https://github.com/VoltAgent/awesome-claude-code-subagents
- https://github.com/VoltAgent/awesome-agent-skills
- https://github.com/addyosmani/agent-skills
- https://github.com/travisvn/awesome-claude-skills
- https://github.com/vijaythecoder/awesome-claude-agents
- https://github.com/vadimcomanescu/codex-skills
- https://github.com/mxyhi/ok-skills
- https://cursor.com/marketplace/skills

## 展示策略（前端）

- 市场卡片展示 `来源平台 + 来源链接 + 热度标签 + 趋势说明`
- 保留“安装”按钮用于本地 demo 演示，不直接在线拉取远程仓库内容
- 增加风险提示：热度不等于质量，需结合仓库活跃度与内容质量判断

## 后续计划（v2）

- 增加“真实导入”模式：可读取公开仓库目录并提取 `SKILL.md`
- 增加“更新时间/最近提交”字段
- 增加“仓库健康度”字段（最近提交、issue 响应、license）
