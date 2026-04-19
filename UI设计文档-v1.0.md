# Skill Dashboard — UI 设计文档 v1.0

> **版本**: v1.0
> **日期**: 2026-04-13
> **设计定位**: 个人 AI 能力中枢 · 编辑部式 Dashboard · 轻微未来感
> **状态**: 可用于代码生成

---

## 1. 视觉定位

### 1.1 整体气质描述

这个产品的界面应该给人一种**"个人指挥室"**的感觉——不是公司后台，不是工具软件，而是某个非常有品味的人整理自己 AI 资产的私人空间。

它有编辑部的结构感：内容被分类、被标注、被有序陈列，每张卡片都像杂志目录里的条目，有名称、有一句话摘要、有分类标签。翻开它就像翻开一本整理好的专业工具书。

它有轻微的未来感：配色偏冷暗，用少量亮色点缀关键信息，像控制台读数一样精准。但不夸张，不堆 glow 效果，不做成游戏 HUD。

整体原则：**内容是主角，设计是容器。** 设计为内容服务，而不是用视觉炫技压过内容本身。

### 1.2 视觉关键词

- **档案室感**（Archival）— 东西被整理过、有据可查、有层次
- **编辑部感**（Editorial）— 卡片像专栏条目，有标题、摘要、分类
- **控制台感**（Console）— 冷色调深色背景、精准的数据呈现
- **低调未来感**（Understated Futurism）— 不是赛博朋克，是克制的科技质感
- **个人所有感**（Owned）— 这是你的能力地图，不是产品介绍页

### 1.3 参考气质

- Raycast（深色 + 清晰层次 + 命令行质感）
- Linear（内容密度 + 操作效率 + 不炫技）
- 《连线》杂志数字版首页（有编辑感的信息排布）
- Vercel Dashboard（深色 + 数据呈现 + 简洁）

---

## 2. 设计 Token

### 2.1 色彩系统

所有颜色以 CSS 变量形式定义，使用时直接引用变量名。

```css
:root {
  /* ── 背景层级（从深到浅） ── */
  --bg-base:       #0C0F1A;  /* 最底层背景，整个页面的底色，深蓝黑 */
  --bg-surface:    #131828;  /* 侧边栏、顶栏等主结构面板背景 */
  --bg-card:       #1A2035;  /* 卡片背景，比面板稍浅一级 */
  --bg-card-hover: #1F2640;  /* 卡片 hover 状态，略亮 */
  --bg-elevated:   #232A45;  /* 弹出层、下拉菜单、高亮区域 */
  --bg-input:      #151C2E;  /* 输入框背景 */
  --bg-code:       #0F1320;  /* 代码预览区背景，接近纯黑 */

  /* ── 文字层级 ── */
  --text-primary:   #E2E8F4;  /* 主标题、主要内容文字，高亮白 */
  --text-secondary: #8A95B0;  /* 描述文字、副标题，中灰蓝 */
  --text-tertiary:  #545E7A;  /* 占位符、禁用文字、时间戳 */
  --text-inverse:   #0C0F1A;  /* 深色背景上的反白文字，用于亮色按钮内 */
  --text-accent:    #38C9B8;  /* 强调文字，链接色，与 accent-primary 同色系 */
  --text-code:      #7DD3C8;  /* 代码预览区内的文字颜色 */

  /* ── 强调色 ── */
  --accent-primary:   #38C9B8;  /* 主强调色：薄荷青，用于激活态、高亮、主按钮 */
  --accent-secondary: #F0A830;  /* 次强调色：琥珀橙，用于推荐标签、警示、亮点 */
  --accent-glow:      rgba(56, 201, 184, 0.15); /* accent-primary 的光晕，用于 focus 环 */

  /* ── 语义色 ── */
  --success:  #4ADE80;  /* 绿色，用于"已识别"、"已激活"状态 */
  --warning:  #F0A830;  /* 橙色，与 accent-secondary 一致，用于"未识别"、注意 */
  --danger:   #F87171;  /* 红色，用于错误、失效状态 */
  --info:     #60A5FA;  /* 蓝色，用于提示信息、中性说明 */

  /* ── 边框与分割线 ── */
  --border-subtle:  rgba(255, 255, 255, 0.06);  /* 最细分割线，几乎不可见 */
  --border-default: rgba(255, 255, 255, 0.10);  /* 标准边框，卡片边框 */
  --border-strong:  rgba(255, 255, 255, 0.18);  /* 强调边框，活跃状态边框 */
  --border-accent:  rgba(56, 201, 184, 0.40);   /* 强调色边框，选中/focus 状态 */
}
```

### 2.2 字体系统

#### 字体选择

```css
/* 引入方式（Google Fonts） */
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --font-display: 'DM Serif Display', 'Georgia', serif;
    /* 用途：Hero 大标题、产品名称、页面级标题 */
    /* 气质：有温度的编辑部风格，不是冷硬的 tech 字体 */

  --font-body: 'DM Sans', 'Helvetica Neue', sans-serif;
    /* 用途：正文、卡片标题、标签、按钮、导航 */
    /* 气质：现代、清晰、友好，中英文混排表现好 */

  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
    /* 用途：代码块、原始 skill 内容预览、文件路径、技术标识符 */
    /* 气质：专业感，区分"技术内容"和"叙述内容" */
}
```

#### 字号层级

```css
:root {
  /* 字号 */
  --text-display:  2.5rem;    /* 40px — Hero 区产品标题 */
  --text-h1:       1.875rem;  /* 30px — 页面级大标题 */
  --text-h2:       1.375rem;  /* 22px — 区块标题 */
  --text-h3:       1.125rem;  /* 18px — 卡片标题、侧边栏分组标题 */
  --text-body:     0.9375rem; /* 15px — 正文、描述文字 */
  --text-sm:       0.8125rem; /* 13px — 标签、元信息、次要文字 */
  --text-xs:       0.6875rem; /* 11px — 时间戳、角标、最小提示 */
  --text-mono:     0.8125rem; /* 13px — 代码预览区固定字号 */

  /* 行高 */
  --leading-tight:  1.25;  /* 标题用，紧凑 */
  --leading-normal: 1.5;   /* 正文用，舒适阅读 */
  --leading-relaxed:1.7;   /* 长段落用，详情页描述文字 */
  --leading-code:   1.6;   /* 代码块行高 */

  /* 字重 */
  --weight-light:   300;
  --weight-regular: 400;
  --weight-medium:  500;
  --weight-semibold:600;
}
```

#### 中英文混排建议

- 中文标题使用 `font-weight: 500`（DM Sans 在中文字重 500 下表现比 600 更协调）
- 中英混排段落，英文 `letter-spacing: -0.01em`，中文 `letter-spacing: 0.02em`
- 代码、文件路径、skill_id 等技术内容强制使用 `var(--font-mono)`
- 不要在正文中用斜体，斜体留给 Hero 区 DM Serif Display 的装饰性用途

---

### 2.3 间距与尺寸

```css
:root {
  /* ── Spacing Scale（基础单位 4px） ── */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;

  /* ── 圆角 ── */
  --radius-sm:   4px;   /* 标签、角标、小按钮 */
  --radius-md:   8px;   /* 输入框、普通按钮、筛选 chip */
  --radius-lg:   12px;  /* 卡片、面板、下拉菜单 */
  --radius-xl:   16px;  /* 右侧详情面板、Modal */
  --radius-full: 9999px; /* 圆形头像、圆形图标按钮、pill 标签 */

  /* ── 阴影 ── */
  --shadow-card:
    0 1px 3px rgba(0, 0, 0, 0.3),
    0 4px 12px rgba(0, 0, 0, 0.2);
    /* 卡片默认阴影，轻量 */

  --shadow-card-hover:
    0 4px 16px rgba(0, 0, 0, 0.4),
    0 1px 4px rgba(0, 0, 0, 0.3);
    /* 卡片 hover 阴影，略深 */

  --shadow-panel:
    -4px 0 24px rgba(0, 0, 0, 0.5),
    0 0 0 1px var(--border-default);
    /* 右侧详情面板阴影 */

  --shadow-dropdown:
    0 8px 32px rgba(0, 0, 0, 0.5),
    0 0 0 1px var(--border-default);
    /* 下拉菜单、浮层阴影 */

  --shadow-focus:
    0 0 0 3px var(--accent-glow);
    /* 聚焦状态光晕，用于所有可交互元素 */

  /* ── 边框规范 ── */
  --border-width-default: 1px;
  --border-style-default: solid;

  /* ── 布局尺寸 ── */
  --sidebar-width:      220px;  /* 左侧导航栏固定宽度 */
  --detail-panel-width: 420px;  /* 右侧详情面板宽度 */
  --topbar-height:       56px;  /* 顶部导航栏高度 */
  --content-max-width: 1280px;  /* 内容区最大宽度 */
  --card-min-width:      240px; /* 卡片最小宽度 */
  --card-max-width:      320px; /* 卡片最大宽度 */

  /* ── 页面边距 ── */
  --page-padding-x: 24px;   /* 内容区左右内边距 */
  --page-padding-y: 24px;   /* 内容区上下内边距 */
}
```

---

## 3. 组件规范

### 3.1 页面主容器

**视觉结构**：整个页面为三列布局（左侧边栏 + 主内容区 + 右侧详情面板）。背景为 `--bg-base`，三列有各自独立的背景层级。

```
左侧边栏      主内容区（flex 1）    右侧详情面板（可隐藏）
220px         grow                 420px
--bg-surface  --bg-base            --bg-surface
```

**关键 CSS**：

```css
.app-layout {
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;
  grid-template-rows: var(--topbar-height) 1fr;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-base);
}

/* 详情面板打开时 */
.app-layout.detail-open {
  grid-template-columns: var(--sidebar-width) 1fr var(--detail-panel-width);
}
```

---

### 3.2 顶部导航栏（Topbar）

**视觉结构**：

```
┌───────────────────────────────────────────────────────────────┐
│ [⬡ 图标] Skill OS    ┆    [🔍 搜索框 · 占位: 搜索技能...]    [⚙] │
│ 高度: 56px · 背景: --bg-surface · 底部边框: --border-subtle    │
└───────────────────────────────────────────────────────────────┘
```

**关键 CSS 特征**：

```css
.topbar {
  height: var(--topbar-height);          /* 56px */
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  padding: 0 var(--page-padding-x);
  gap: var(--space-4);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(12px);           /* 毛玻璃效果，仅这里使用 */
}

.topbar-logo {
  font-family: var(--font-display);
  font-size: 1.25rem;
  color: var(--text-primary);
  letter-spacing: -0.02em;
  white-space: nowrap;
}

.topbar-logo span {
  color: var(--accent-primary);          /* "OS" 字样用强调色 */
}
```

---

### 3.3 左侧导航栏（Sidebar）

**视觉结构**：

```
┌──────────────────┐
│ ▸ 总览           │  ← 导航项，激活时左侧有 2px accent 线
│                  │
│ 分类             │  ← 分组标题，小写字号，--text-tertiary
│ ─────            │
│   写作  (5)      │
│   代码  (8)      │  ← 带数字角标
│   分析  (6)      │
│   其他  (4)      │
│                  │
│ ─────────────    │
│ ⟳ 重新扫描       │  ← 底部工具区
└──────────────────┘
```

**状态变化**：
- 默认：背景 `transparent`，文字 `--text-secondary`
- hover：背景 `var(--bg-elevated)`，文字 `--text-primary`
- 激活：左边 2px 实线 `var(--accent-primary)`，背景 `rgba(56,201,184,0.08)`，文字 `--text-primary`

**关键 CSS**：

```css
.sidebar {
  width: var(--sidebar-width);
  background: var(--bg-surface);
  border-right: 1px solid var(--border-subtle);
  padding: var(--space-4) var(--space-3);
  overflow-y: auto;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);             /* 13px */
  font-weight: var(--weight-medium);
  color: var(--text-secondary);
  cursor: pointer;
  border-left: 2px solid transparent;
  transition: all 150ms ease;
}

.sidebar-nav-item.active {
  border-left-color: var(--accent-primary);
  background: rgba(56, 201, 184, 0.08);
  color: var(--text-primary);
}

.sidebar-section-label {
  font-size: var(--text-xs);             /* 11px */
  font-weight: var(--weight-semibold);
  color: var(--text-tertiary);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: var(--space-4) var(--space-3) var(--space-1);
}

.sidebar-badge {
  margin-left: auto;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}
```

---

### 3.4 能力统计卡片（Hero Stats）

位于主内容区顶部，展示整体能力资产概况。横排 3-4 个数据块。

**视觉结构**：

```
┌────────────────────────────────────────────────────┐
│  Hero 区 — 个人能力总览                              │
│  副标题：你已装备 23 个 AI 技能，覆盖 5 个领域        │
├──────────┬──────────┬──────────┬───────────────────┤
│  23      │   5      │   4      │   最近扫描         │
│  Skills  │  分类    │  新增    │   3分钟前          │
└──────────┴──────────┴──────────┴───────────────────┘
```

**关键 CSS 特征**：

```css
.hero-section {
  padding: var(--space-8) var(--page-padding-x) var(--space-6);
  border-bottom: 1px solid var(--border-subtle);
}

.hero-title {
  font-family: var(--font-display);
  font-size: var(--text-h1);             /* 30px */
  color: var(--text-primary);
  font-style: italic;                    /* DM Serif Display 斜体用于标题，增加编辑部感 */
  margin-bottom: var(--space-1);
}

.stats-row {
  display: flex;
  gap: var(--space-6);
  margin-top: var(--space-6);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.stat-value {
  font-family: var(--font-mono);
  font-size: var(--text-h2);             /* 22px */
  color: var(--accent-primary);
  font-weight: var(--weight-medium);
  letter-spacing: -0.02em;
}

.stat-label {
  font-size: var(--text-xs);             /* 11px */
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
```

---

### 3.5 Skill 卡片

这是产品的核心视觉元素，设计必须准确。

**视觉结构**：

```
┌────────────────────────────────────┐
│ [图标 32px]  标题文字               │  ← 卡片头部
│              [分类标签]             │
├────────────────────────────────────┤
│                                    │
│  一句话描述，不超过两行...           │  ← 描述区
│                                    │
├────────────────────────────────────┤
│ [标签1] [标签2]         更新: 2d前  │  ← 卡片底部
└────────────────────────────────────┘
  边框: 1px --border-default
  hover 时: 边框变 --border-strong
            背景变 --bg-card-hover
            translateY(-2px)
```

**状态变化**：
- 默认：背景 `--bg-card`，边框 `--border-default`，阴影 `--shadow-card`
- hover：背景 `--bg-card-hover`，边框 `--border-strong`，阴影 `--shadow-card-hover`，上移 `2px`
- 选中/激活（对应右侧面板打开）：边框 `--border-accent`，左侧 3px `--accent-primary` 实线

**关键 CSS**：

```css
.skill-card {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);       /* 12px */
  padding: var(--space-4);              /* 16px */
  cursor: pointer;
  transition: transform 200ms ease, box-shadow 200ms ease,
              border-color 200ms ease, background 150ms ease;
  box-shadow: var(--shadow-card);
  position: relative;
  overflow: hidden;
}

.skill-card:hover {
  background: var(--bg-card-hover);
  border-color: var(--border-strong);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
}

.skill-card.active {
  border-color: var(--border-accent);
  border-left: 3px solid var(--accent-primary);
}

.skill-card-header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.skill-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);       /* 8px */
  background: var(--bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.skill-title {
  font-size: var(--text-h3);            /* 18px */
  font-weight: var(--weight-semibold);
  color: var(--text-primary);
  line-height: var(--leading-tight);
}

.skill-description {
  font-size: var(--text-sm);            /* 13px */
  color: var(--text-secondary);
  line-height: var(--leading-normal);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: var(--space-4);
}

.skill-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.skill-timestamp {
  font-family: var(--font-mono);
  font-size: var(--text-xs);            /* 11px */
  color: var(--text-tertiary);
}
```

---

### 3.6 分类标签 / Filter Chip

**视觉结构**：小型胶囊形态，横排于卡片列表上方的筛选栏内。

**状态变化**：
- 默认：背景 `--bg-elevated`，边框 `--border-default`，文字 `--text-secondary`
- hover：边框 `--border-strong`，文字 `--text-primary`
- 激活：背景 `rgba(56,201,184,0.12)`，边框 `--border-accent`，文字 `var(--accent-primary)`

**关键 CSS**：

```css
.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  height: 28px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-full);
  border: 1px solid var(--border-default);
  background: var(--bg-elevated);
  font-size: var(--text-sm);            /* 13px */
  font-weight: var(--weight-medium);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 150ms ease;
  white-space: nowrap;
}

.filter-chip:hover {
  border-color: var(--border-strong);
  color: var(--text-primary);
}

.filter-chip.active {
  background: rgba(56, 201, 184, 0.12);
  border-color: var(--border-accent);
  color: var(--accent-primary);
}

.filter-chip .count {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  opacity: 0.7;
}
```

---

### 3.7 搜索框

**视觉结构**：顶栏内居中搜索框，宽度 280-400px，有搜索图标前缀，有键盘快捷键提示后缀（⌘K 或 /）。

**状态变化**：
- 默认：背景 `--bg-input`，边框 `--border-default`，占位符 `--text-tertiary`
- focus：边框 `--border-accent`，外发光 `--shadow-focus`

**关键 CSS**：

```css
.search-input-wrapper {
  position: relative;
  flex: 1;
  max-width: 380px;
}

.search-input {
  width: 100%;
  height: 36px;
  background: var(--bg-input);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: 0 var(--space-8) 0 var(--space-8); /* 给图标留空间 */
  font-family: var(--font-body);
  font-size: var(--text-sm);            /* 13px */
  color: var(--text-primary);
  outline: none;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

.search-input:focus {
  border-color: var(--border-accent);
  box-shadow: var(--shadow-focus);
}

.search-icon {
  position: absolute;
  left: var(--space-2);
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  pointer-events: none;
}

.search-shortcut {
  position: absolute;
  right: var(--space-2);
  top: 50%;
  transform: translateY(-50%);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  background: var(--bg-elevated);
  padding: 2px 5px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
}
```

---

### 3.8 右侧详情面板（Detail Panel）

**视觉结构**：

```
┌──────────────────────────────────────────┐
│  [← 关闭]                    [⧉ 复制]  │  ← 面板顶栏，56px
├──────────────────────────────────────────┤
│                                          │
│  [图标 48px]  Skill 完整名称             │  ← 标题区
│               [分类标签] [状态标签]      │
├──────────────────────────────────────────┤
│  元信息行：分类 · 来源路径 · 3天前更新   │  ← 元数据区，单行
├──────────────────────────────────────────┤
│  这个 Skill 能做什么                     │  ← 各信息区块
│  正文描述...                             │    之间用细分割线
│                                          │    分隔
├──────────────────────────────────────────┤
│  适用场景                                │
│  • 场景 1                               │
│  • 场景 2                               │
├──────────────────────────────────────────┤
│  原始内容 (Skill 源文件)                 │
│  ┌──────────────────────────────────┐   │
│  │  代码/Markdown 预览              │   │  ← 代码区，
│  │  font-mono, --bg-code            │   │    有内滚动
│  └──────────────────────────────────┘   │
└──────────────────────────────────────────┘
```

**关键 CSS**：

```css
.detail-panel {
  width: var(--detail-panel-width);     /* 420px */
  background: var(--bg-surface);
  border-left: 1px solid var(--border-default);
  box-shadow: var(--shadow-panel);
  overflow-y: auto;
  transform: translateX(100%);
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
}

.detail-panel.open {
  transform: translateX(0);
}

.detail-panel-topbar {
  height: var(--topbar-height);         /* 56px */
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
  position: sticky;
  top: 0;
  background: var(--bg-surface);
  z-index: 10;
}

.detail-section {
  padding: var(--space-5) var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
}

.detail-section-title {
  font-size: var(--text-xs);            /* 11px */
  font-weight: var(--weight-semibold);
  color: var(--text-tertiary);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: var(--space-3);
}

.code-preview {
  background: var(--bg-code);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  font-family: var(--font-mono);
  font-size: var(--text-mono);          /* 13px */
  color: var(--text-code);
  line-height: var(--leading-code);
  overflow: auto;
  max-height: 320px;
}
```

---

### 3.9 按钮

#### 主按钮（Primary）

```css
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  height: 36px;
  padding: 0 var(--space-4);
  background: var(--accent-primary);
  color: var(--text-inverse);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  transition: opacity 150ms ease, transform 100ms ease;
}

.btn-primary:hover  { opacity: 0.88; }
.btn-primary:active { transform: scale(0.97); }
.btn-primary:focus  { box-shadow: var(--shadow-focus); outline: none; }
```

#### 次按钮（Secondary）

```css
.btn-secondary {
  /* 同 primary 尺寸，但 */
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-default);
}

.btn-secondary:hover {
  background: var(--bg-elevated);
  border-color: var(--border-strong);
}
```

#### 文本按钮（Ghost）

```css
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: none;
  padding: 0 var(--space-2);
}

.btn-ghost:hover { color: var(--text-primary); }
```

---

### 3.10 状态标签（Status Badge）

**三种语义状态**：

```css
/* 基础结构 */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 20px;
  padding: 0 var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);            /* 11px */
  font-weight: var(--weight-medium);
  font-family: var(--font-mono);
}

/* 已识别 / 已激活 */
.badge-success {
  background: rgba(74, 222, 128, 0.12);
  color: var(--success);
  border: 1px solid rgba(74, 222, 128, 0.25);
}

/* 未识别 / 待确认 */
.badge-warning {
  background: rgba(240, 168, 48, 0.12);
  color: var(--warning);
  border: 1px solid rgba(240, 168, 48, 0.25);
}

/* 推荐 */
.badge-accent {
  background: rgba(56, 201, 184, 0.12);
  color: var(--accent-primary);
  border: 1px solid rgba(56, 201, 184, 0.25);
}
```

状态前的圆点：`width: 6px; height: 6px; border-radius: 50%; background: currentColor;`

---

### 3.11 空状态模块（Empty State）

当搜索无结果或无 skill 时展示。

**视觉结构**：居中，图标 + 标题 + 描述 + 操作按钮，不要用悲伤的图示，用中性的"等待扫描"感。

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-20) var(--space-8);
  text-align: center;
  gap: var(--space-3);
}

.empty-state-icon {
  width: 48px;
  height: 48px;
  opacity: 0.3;
  margin-bottom: var(--space-2);
}

.empty-state-title {
  font-size: var(--text-h3);
  color: var(--text-secondary);
  font-weight: var(--weight-medium);
}

.empty-state-desc {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  max-width: 280px;
  line-height: var(--leading-relaxed);
}
```

---

## 4. 交互规范

### 4.1 基础过渡时长

```css
:root {
  --duration-instant:  80ms;   /* 状态切换、checkbox 勾选 */
  --duration-fast:    150ms;   /* hover 背景色、文字颜色变化 */
  --duration-normal:  200ms;   /* 卡片 hover、按钮 hover */
  --duration-panel:   300ms;   /* 详情面板滑入滑出 */
  --duration-page:    400ms;   /* 页面初次加载卡片出现 */
}
```

### 4.2 Easing 建议

```css
:root {
  --ease-default:  ease;                             /* 一般过渡 */
  --ease-spring:   cubic-bezier(0.16, 1, 0.3, 1);  /* 面板滑入，有弹性感 */
  --ease-smooth:   cubic-bezier(0.4, 0, 0.2, 1);   /* 卡片动效，平滑 */
  --ease-out-back: cubic-bezier(0.34, 1.56, 0.64, 1); /* 元素入场，轻微过冲 */
}
```

### 4.3 各元素交互规范

#### 卡片 Hover

- `transform: translateY(-2px)` — 时长 200ms，ease-smooth
- `box-shadow` 从 `--shadow-card` 过渡到 `--shadow-card-hover` — 同步
- 边框颜色从 `--border-default` 到 `--border-strong` — 150ms

#### 卡片 Active（点击）

- `transform: translateY(0) scale(0.98)` — 时长 80ms
- 松开后回弹到 hover 状态

#### 详情面板 打开/关闭

- 打开：`transform: translateX(0)`，时长 300ms，ease-spring
- 关闭：`transform: translateX(100%)`，时长 250ms，ease-smooth
- 主内容区同步收缩：grid 列宽变化，时长同 300ms

#### 搜索框 Focus

- 边框颜色切换：150ms，--ease-default
- 外发光 `--shadow-focus` 淡入：150ms opacity

#### 筛选 Chip 激活

- 背景色渐变、边框颜色：150ms，--ease-default
- 文字颜色：150ms

#### 按钮 Hover/Active

- hover：opacity 变化 150ms
- active：`scale(0.97)`，80ms，松开后回弹 150ms

### 4.4 页面初次加载动效

卡片以交错方式（staggered）依次淡入上移：

```css
.skill-card {
  opacity: 0;
  transform: translateY(12px);
  animation: card-appear var(--duration-page) var(--ease-out-back) forwards;
}

/* 每张卡片延迟递增 */
.skill-card:nth-child(1) { animation-delay: 0ms;  }
.skill-card:nth-child(2) { animation-delay: 50ms; }
.skill-card:nth-child(3) { animation-delay: 100ms;}
/* 最多延迟到 400ms，超出的卡片不再延迟 */

@keyframes card-appear {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**注意**：不要给每次搜索/筛选操作加 staggered 动效，只在初始加载时用一次，避免频繁操作体验卡顿。

---

## 5. 响应式规范

### 5.1 PC 端（≥ 1280px）

- 三列布局：左侧边栏 220px + 主内容区（flex 1）+ 详情面板 420px（按需展开）
- 卡片网格：每行 3 列，`grid-template-columns: repeat(3, 1fr)`
- 顶部搜索框：最大宽度 380px
- Hero 区统计数据：横排一行

### 5.2 平板端（768px ～ 1279px）

- 两列布局：侧边栏 **折叠为图标栏**（宽度缩为 56px，只显示图标，hover 展开浮层）
- 卡片网格：每行 2 列
- 右侧详情面板：改为底部抽屉（从下方滑上来，高度 60vh），不再作为第三栏
- Hero 区统计数据：横排，字号略缩小

### 5.3 手机端（< 768px）

- 单列布局：侧边栏**完全隐藏**，改为顶部 Tab 导航栏（写作 / 代码 / 分析 / 全部）
- 卡片网格：单列，每卡片铺满
- 搜索框：独占一行，宽度 100%
- Hero 区：收折为一行数字摘要（"23 skills · 5 分类"）
- 右侧详情面板：全屏模态页面，顶部有返回按钮

---

## 6. 页面级布局建议

### 6.1 首页 / Dashboard 总览

```
┌─────────────────────────────────────────────────────────────────┐
│  TOPBAR（56px）                                                   │
│  [⬡ Skill OS]            [🔍 搜索...     ⌘K]           [⚙]      │
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                   │
│  S           │  Hero 区（padding-top: 32px）                      │
│  I  所有技能  │  标题：你的 AI 能力地图（DM Serif Display 斜体）    │
│  D  ──────   │  副标题：已装备 23 个技能，覆盖 5 个领域             │
│  E  写作 (5) │  统计数字行：23 Skills · 5 分类 · 4 新增 · 3min前  │
│  B  代码 (8) │                                                   │
│  A  分析 (6) ├──────────────────────────────────────────────────┤
│  R  其他 (4) │  筛选栏                                            │
│              │  [全部] [写作] [代码] [分析] [搜索 & 规划] [其他]  │
│  ──────      ├──────────────────────────────────────────────────┤
│  ⟳ 重新扫描  │                                                   │
│              │  卡片网格（3列，gap: 16px）                        │
│              │  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│              │  │ 卡片     │ │ 卡片     │ │ 卡片     │         │
│              │  └──────────┘ └──────────┘ └──────────┘         │
│              │  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│              │  │ 卡片     │ │ 卡片     │ │ 卡片     │         │
│              │  └──────────┘ └──────────┘ └──────────┘         │
│              │                                                   │
└──────────────┴──────────────────────────────────────────────────┘
  220px          flex: 1，padding: 24px
```

---

### 6.2 Skill Library（与 Dashboard 相同，侧边栏选中「所有技能」）

仅变化：当前激活筛选为某个分类标签时，标题区会更新为该分类名称，数字变为该分类数量。其余结构完全一致，不单独做页面。

---

### 6.3 Skill Detail Panel 打开时的布局

```
┌─────────────────────────────────────────────────────────────────────────┐
│  TOPBAR（56px）                                                           │
├──────────────┬──────────────────────────────┬──────────────────────────┤
│              │                              │  DETAIL PANEL（420px）    │
│  SIDEBAR     │  卡片网格（变为2列）           │                          │
│  220px       │                              │  [← 关闭]     [⧉ 复制]   │
│              │  ┌──────────┐ ┌──────────┐  │  ─────────────────────    │
│              │  │ 卡片     │ │ 卡片 ✓  │  │                          │
│              │  │          │ │ (active) │  │  [图标] Skill 完整名称    │
│              │  └──────────┘ └──────────┘  │  [标签] [已识别]          │
│              │  ┌──────────┐ ┌──────────┐  │  ─────────────────────    │
│              │  │ 卡片     │ │ 卡片     │  │  元数据：分类·路径·时间   │
│              │  └──────────┘ └──────────┘  │  ─────────────────────    │
│              │                              │  能做什么                 │
│              │                              │  描述正文...              │
│              │                              │  ─────────────────────    │
│              │                              │  适用场景                 │
│              │                              │  • 场景 1                │
│              │                              │  • 场景 2                │
│              │                              │  ─────────────────────    │
│              │                              │  原始内容                 │
│              │                              │  ┌─────────────────────┐ │
│              │                              │  │ code preview        │ │
│              │                              │  └─────────────────────┘ │
└──────────────┴──────────────────────────────┴──────────────────────────┘
  220px          flex: 1（卡片列数从3变2）        420px
```

**注意**：详情面板打开时，主内容区不隐藏，而是同步收缩（grid 过渡），卡片列数从 3 列变为 2 列，保持可见和可交互。

---

## 7. 风格约束

### 7.1 明确不要做成这样

| 禁止方向 | 具体说明 |
|----------|----------|
| 不要像企业后台管理系统 | 不要蓝白色调、不要表格式布局、不要顶部横向 Tab 导航 |
| 不要像文件浏览器 | 不要列表式文件行、不要左侧树形结构、不要路径面包屑作为核心导航 |
| 不要像普通 prompt 管理器 | 不要文本列表、不要每条一行的"名称 + 描述"表格 |
| 不要紫色渐变套壳 | 不要 `#7C3AED` → `#EC4899` 这类"AI 产品常见配色"，我们用冷暗调 + 薄荷青强调色 |
| 不要过度玻璃拟态 | backdrop-filter 只在 topbar 用一次，卡片和面板不用玻璃效果 |
| 不要所有卡片一个样 | 后续可以用图标颜色、标签颜色区分不同分类，卡片本身要有内容密度 |
| 不要空旷无物 | 每个卡片必须有名称 + 描述 + 标签，不能只有名称 |
| 不要无意义的装饰动效 | 背景粒子特效、渐变光晕循环动画、不停闪烁的元素——全部禁止 |

### 7.2 整体克制原则

- 动效要有目的，只在"用户触发操作"时出现，不要自动循环播放任何动效
- 最多使用 2 个强调色（`--accent-primary` + `--accent-secondary`），不要引入更多颜色
- 留白和密度并存：Hero 区宽松，卡片区密集，形成视觉节奏感
- 字体混用最多 2 个系列（DM Serif Display 做装饰标题，DM Sans 做正文），代码用 JetBrains Mono

---

## 8. 如何把这份设计文档喂给 AI 生成代码

### 8.1 必须原样使用的 Token

以下 CSS 变量值必须完整声明并原样使用，不得自行替换颜色：

- 所有 `--bg-*` 变量（背景层级系统）
- 所有 `--text-*` 变量（文字层级系统）
- `--accent-primary: #38C9B8` 和 `--accent-secondary: #F0A830`
- `--font-display`、`--font-body`、`--font-mono` 三套字体族
- `--duration-*` 和 `--ease-*` 动效变量

**喂给 AI 时的建议提示词开头**：

> "请严格使用以下 CSS 变量系统实现组件，不要自行设定颜色值，所有颜色必须引用变量名..."

### 8.2 不要随意改动的结构

- 三列布局的 grid 结构（侧边栏 + 内容区 + 详情面板）
- 详情面板从右侧滑入的交互逻辑（transform translateX）
- 卡片 `hover` 时 `translateY(-2px)` 的微动效——这是卡片"活"的关键，去掉会很平
- Topbar 的 `backdrop-filter: blur(12px)` ——这是整个界面中唯一一处模糊效果，保留有质感，去掉会显得普通

### 8.3 最重要的视觉层次（按优先级）

1. **色彩层级**：`--bg-base` → `--bg-surface` → `--bg-card` → `--bg-elevated` 四层背景，必须保持区分
2. **字体体系**：DM Serif Display 只用于 Hero 标题，DM Sans 用于一切正文，JetBrains Mono 用于技术内容
3. **强调色克制**：`--accent-primary` 只出现在激活状态、高亮数字、accent 徽章，不要到处用
4. **卡片设计**：必须有"名称 + 描述 + 标签"三层信息，缺少任何一层都会失去"编辑部感"

### 8.4 可以后续微调的部分

- Hero 区统计数字的具体字体大小（可 ±2-4px 调整适配内容量）
- 卡片 `padding` 可以从 `16px` 调整到 `20px`（视内容量决定）
- Filter Chip 的横排改为可换行（当分类 > 8 个时）
- 侧边栏分类项的数量角标格式（可以改为括号内数字 或 右侧小圆点）
- 响应式断点的具体像素值（768px 和 1280px 可根据实际调整）
- 卡片图标的具体 emoji 或 SVG（设计文档中用 emoji 占位，实现时可替换为 lucide-react 图标）
