# Skill Dashboard 推荐技能树（前端 JSON 结构）

> 用途：作为 `Skill Dashboard` 首页能力地图、分类筛选、推荐技能卡片的数据源草案。
> 说明：该结构偏展示层，可直接转为 `ts` / `json` 使用。

## 使用建议

- `id`：前端稳定标识
- `name`：一级分类名称
- `summary`：分类一句话说明，可用于首页概览
- `clusters`：二级能力簇，可用于能力地图或分类分组
- `skills`：三级推荐 skill，可用于卡片列表、推荐安装列表、详情页预埋
- `recommended`：是否建议首页优先展示

## JSON 草案

```json
{
  "skillTree": [
    {
      "id": "engineering",
      "name": "编程开发",
      "summary": "把想法变成可运行代码，并持续修复、重构、交付。",
      "recommended": true,
      "clusters": [
        {
          "id": "build",
          "name": "代码生成",
          "summary": "快速生成功能、组件与接口对接代码。",
          "skills": [
            "功能实现助手",
            "组件开发助手",
            "API 集成助手"
          ]
        },
        {
          "id": "understand",
          "name": "代码理解",
          "summary": "帮助用户理解仓库结构、依赖关系和现有逻辑。",
          "skills": [
            "代码解释助手",
            "仓库阅读助手",
            "依赖关系分析助手"
          ]
        },
        {
          "id": "debug",
          "name": "调试修复",
          "summary": "定位问题、分析报错并给出修复方向。",
          "skills": [
            "Bug 分析助手",
            "报错定位助手",
            "性能问题排查助手"
          ]
        },
        {
          "id": "quality",
          "name": "质量保障",
          "summary": "补测试、做 review、检查边界风险。",
          "skills": [
            "测试生成助手",
            "Code Review 助手",
            "边界条件检查助手"
          ]
        },
        {
          "id": "refactor",
          "name": "重构优化",
          "summary": "清理技术债，提升结构清晰度与可维护性。",
          "skills": [
            "代码重构助手",
            "类型系统优化助手",
            "技术债清理助手"
          ]
        }
      ]
    },
    {
      "id": "content",
      "name": "内容创作",
      "summary": "把信息组织成可传播、可阅读、可复用的内容。",
      "recommended": true,
      "clusters": [
        {
          "id": "writing",
          "name": "写作生成",
          "summary": "从提纲到成稿，支持长文、短文案和邮件写作。",
          "skills": [
            "长文写作助手",
            "短文案生成助手",
            "邮件写作助手"
          ]
        },
        {
          "id": "organize",
          "name": "内容整理",
          "summary": "把长资料压缩为摘要、提纲和关键信息。",
          "skills": [
            "摘要总结助手",
            "提纲生成助手",
            "信息压缩助手"
          ]
        },
        {
          "id": "polish",
          "name": "表达优化",
          "summary": "优化语气、结构与标题，让内容更易读。",
          "skills": [
            "改写润色助手",
            "语气统一助手",
            "标题优化助手"
          ]
        },
        {
          "id": "repurpose",
          "name": "多平台改编",
          "summary": "一份内容适配多个平台与传播场景。",
          "skills": [
            "社媒改写助手",
            "博客转短帖助手",
            "一稿多用助手"
          ]
        },
        {
          "id": "creative",
          "name": "创意支持",
          "summary": "帮助用户发散灵感、搭叙事和做选题。",
          "skills": [
            "灵感发散助手",
            "叙事结构助手",
            "选题策划助手"
          ]
        }
      ]
    },
    {
      "id": "analytics",
      "name": "数据分析",
      "summary": "从数据中找到结构、问题和可执行结论。",
      "recommended": true,
      "clusters": [
        {
          "id": "prep",
          "name": "数据准备",
          "summary": "整理字段、处理异常与清洗原始数据。",
          "skills": [
            "数据清洗助手",
            "字段整理助手",
            "异常值检查助手"
          ]
        },
        {
          "id": "query",
          "name": "查询分析",
          "summary": "围绕 SQL、指标和漏斗进行结构化分析。",
          "skills": [
            "SQL 助手",
            "指标分析助手",
            "漏斗分析助手"
          ]
        },
        {
          "id": "insight",
          "name": "解释洞察",
          "summary": "把结果转成趋势、归因和业务解释。",
          "skills": [
            "数据洞察助手",
            "趋势解读助手",
            "异常归因助手"
          ]
        },
        {
          "id": "visualization",
          "name": "可视化支持",
          "summary": "推荐图表和汇报结构，帮助表达分析结果。",
          "skills": [
            "图表推荐助手",
            "报表结构助手",
            "数据讲故事助手"
          ]
        },
        {
          "id": "decision",
          "name": "决策支持",
          "summary": "把分析结果变成实验方向和业务动作。",
          "skills": [
            "实验分析助手",
            "指标拆解助手",
            "业务结论生成助手"
          ]
        }
      ]
    },
    {
      "id": "product",
      "name": "产品设计",
      "summary": "从问题定义到方案表达，把想法做成产品。",
      "recommended": true,
      "clusters": [
        {
          "id": "discover",
          "name": "问题发现",
          "summary": "帮助用户发散方向、识别痛点与定义场景。",
          "skills": [
            "Brainstorming",
            "用户痛点梳理助手",
            "场景定义助手"
          ]
        },
        {
          "id": "analysis",
          "name": "需求分析",
          "summary": "梳理用户、问题、竞品与需求边界。",
          "skills": [
            "Business Analyst",
            "竞品分析助手",
            "需求拆解助手"
          ]
        },
        {
          "id": "define",
          "name": "产品定义",
          "summary": "完成 PRD、收敛 MVP、制定优先级。",
          "skills": [
            "Prd",
            "功能优先级助手",
            "MVP 收敛助手"
          ]
        },
        {
          "id": "ux",
          "name": "体验设计",
          "summary": "梳理流程、信息架构和页面层级。",
          "skills": [
            "用户流程设计助手",
            "信息架构助手",
            "页面结构助手"
          ]
        },
        {
          "id": "visual",
          "name": "视觉表达",
          "summary": "完成界面方向、设计系统和页面文案。",
          "skills": [
            "Frontend Design",
            "设计系统助手",
            "页面文案助手"
          ]
        }
      ]
    },
    {
      "id": "workflow",
      "name": "效率流程",
      "summary": "把零散任务组织成可执行、可复用的流程。",
      "recommended": true,
      "clusters": [
        {
          "id": "planning",
          "name": "任务拆解",
          "summary": "把目标拆成可执行步骤与推进计划。",
          "skills": [
            "Writing Plans",
            "执行步骤拆解助手",
            "项目推进助手"
          ]
        },
        {
          "id": "workflow-design",
          "name": "工作流设计",
          "summary": "将多个能力串成 SOP 或自动化流程。",
          "skills": [
            "Workflow Designer",
            "SOP 设计助手",
            "自动化流程助手"
          ]
        },
        {
          "id": "knowledge",
          "name": "知识整理",
          "summary": "整理 prompts、资料和个人知识入口。",
          "skills": [
            "Prompt Organizer",
            "资料分类助手",
            "个人知识路由助手"
          ]
        },
        {
          "id": "meetings",
          "name": "会议协作",
          "summary": "沉淀纪要、行动项和协作跟进。",
          "skills": [
            "会议纪要助手",
            "行动项提炼助手",
            "跟进事项整理助手"
          ]
        },
        {
          "id": "retrospective",
          "name": "复盘优化",
          "summary": "从已完成工作中提炼经验并改进流程。",
          "skills": [
            "工作复盘助手",
            "效率诊断助手",
            "流程优化助手"
          ]
        }
      ]
    },
    {
      "id": "business",
      "name": "商业营销",
      "summary": "把产品价值说清楚、传播出去并形成转化。",
      "recommended": true,
      "clusters": [
        {
          "id": "market",
          "name": "市场理解",
          "summary": "理解用户、赛道和竞品格局。",
          "skills": [
            "市场调研助手",
            "用户画像助手",
            "竞品定位助手"
          ]
        },
        {
          "id": "positioning",
          "name": "品牌定位",
          "summary": "提炼价值主张、卖点和品牌语言。",
          "skills": [
            "定位文案助手",
            "核心卖点提炼助手",
            "品牌语言助手"
          ]
        },
        {
          "id": "campaign",
          "name": "营销内容",
          "summary": "生成活动文案、广告文案和落地页内容。",
          "skills": [
            "Campaign Writer",
            "落地页文案助手",
            "广告文案助手"
          ]
        },
        {
          "id": "growth",
          "name": "增长实验",
          "summary": "制定增长策略并持续优化转化。",
          "skills": [
            "增长策略助手",
            "A/B 测试助手",
            "转化优化助手"
          ]
        },
        {
          "id": "sales",
          "name": "销售支持",
          "summary": "生成销售材料、话术与答疑内容。",
          "skills": [
            "销售话术助手",
            "FAQ 生成助手",
            "提案材料助手"
          ]
        }
      ]
    }
  ]
}
```

## 前端派生字段建议

如果你要更方便地做 dashboard 展示，可以在前端运行时额外派生这些字段：

```ts
type SkillTreeCategory = {
  id: string
  name: string
  summary: string
  recommended: boolean
  clusterCount: number
  skillCount: number
  heroAccent: string
  clusters: SkillTreeCluster[]
}

type SkillTreeCluster = {
  id: string
  name: string
  summary: string
  skillCount: number
  skills: string[]
}
```

建议派生：

- `clusterCount`：二级能力簇数量
- `skillCount`：该大类下推荐 skills 总数
- `heroAccent`：首页能力地图颜色标识

## 首页推荐展示顺序

```json
[
  "产品设计",
  "编程开发",
  "效率流程",
  "内容创作",
  "数据分析",
  "商业营销"
]
```

理由：

- `产品设计`：最能体现当前 demo 已有 personal skills 的价值
- `编程开发`：最容易让用户理解“skill 是怎么帮忙的”
- `效率流程`：能自然连接到未来 workflow 想象
- 其余三类负责补全能力版图
