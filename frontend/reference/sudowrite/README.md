# Sudowrite Editor UI 设计参考

> 来源: https://editor.sudowrite.com/app/project/aXBrGEMVVFER5W5gxj1i#doc=sVQM2AVkbqgnWzD7miZS
> 截取时间: 2026-03-31

## 文件清单

| 文件 | 说明 |
|------|------|
| `screenshot_editor.png` | 编辑器主界面截图（含三栏布局） |
| `screenshot_storybible.png` | Story Bible 展开后截图（Braindump/Genre/Style/Synopsis） |
| `screenshot_storybible_bottom.png` | Story Bible 底部截图（Characters/Worldbuilding/Outline） |
| `index.css` | 主题 CSS（颜色变量、主题切换系统） |
| `index.bundled.css` | 构建后完整 CSS（TailwindCSS + 组件样式，~300KB） |

---

## 技术栈

- **前端框架**: React SPA（Create React App 构建）
- **CSS 方案**: TailwindCSS + CSS Variables（主题系统）+ styled-components
- **UI 字体**: Inter, Poppins, Roboto (Sans-serif)
- **正文字体**: Lora, Merriweather, GT Super Text (Serif)
- **等宽字体**: Fira Mono, IBM Plex Mono
- **特殊字体**: Quattro (iA Writer), OpenDyslexic（无障碍）
- **图标**: SVG 内联

---

## 整体布局结构

采用 **经典三栏式布局**，顶部有全局 AI 工具栏：

```
┌──────────────────────────────────────────────────────────────────────┐
│ ← Back │ ✏ Write ▼  ✨ Rewrite ▼  📝 Describe ▼  🧠 Brainstorm │ 💎 More Tools ▼ │ Words:93  Saved✓  ⬆ ? ⚙ │
├──────────┼──────────────────────────────────────────┼────────────────┤
│          │ 🔍 ↩ ↪ B I U S ✏ ≡ Aa H1 ··· 💬 📋 🕐 ⬆             │ « │ History  Chat │ 🕐 + │
│ My First │                                          │                │
│ Project  │  Chapter 1 ···                            │                │
│  «       │                                          │   Start a      │
│ + New    │  Cavendish Ernst's calloused hands        │  conversation  │
│ ↓ Import │  gripped the wooden churn, muscles        │                │
│          │  straining as he pumped the plunger       │  Ask questions │
│ 📄Chapter│  up and down with practiced               │  about your    │
│   1  ◀   │  efficiency...                            │  project, get  │
│          │                                          │  writing       │
│          │                                          │  suggestions   │
│          │                                          │  ...           │
│          │                                          │                │
│          │  ┌── Story Bible ────────────────────┐   │────────────────│
│          │  │ ▸ Braindump                        │   │ [Ask a         │
│ Story    │  │ ▸ Genre                            │   │  question...]  │
│ Bible 🔘 │  │ ▸ Style (Featured/Match/Custom)   │   │ Standard ▼  ▶  │
│ 🗑 Trash  │  │ ▸ Synopsis  [✨ Generate Synopsis] │   │                │
│          │  │ ▸ Characters [+ Add Character]     │   │ 💬Support      │
│          │  │ ▸ Worldbuilding [+ Add Element]    │   │ 💎Upgrade      │
│          │  │ ▸ Outline [✨ Generate Novel Outline]│  │                │
│          │  │   All chapters▼ 3rd person▼ Auto▼  │   │                │
│          │  │   Past tense▼                      │   │                │
│          │  └────────────────────────────────────┘   │                │
└──────────┴──────────────────────────────────────────┴────────────────┘
```

---

## 1. 顶部 AI 工具栏 (Top Bar)

### 左侧
- **← Back** — 返回项目列表

### AI 工具按钮（居中）
- **✏ Write** ▼ — AI 写作，带展开箭头
- **✨ Rewrite** ▼ — AI 改写，带展开箭头
- **📝 Describe** ▼ — AI 描述，带展开箭头
- **🧠 Brainstorm** — AI 头脑风暴
- **💎 More Tools** ▼ — 更多工具，带展开箭头

### 右侧状态区
- **Words: 93** — 实时字数统计
- **Saved ✓** — 自动保存状态（绿色勾号）
- **⬆** — 分享/导出
- **?** — 帮助
- **⚙** — 设置

### 样式
- 背景：淡紫色渐变（从 `/assets/sorbet-background.png`）
- 按钮：白色背景胶囊形，带浅灰边框 `border-radius: 20px`
- 字体：Inter, 14px, font-weight: 500
- 图标：紫色/彩色 SVG

---

## 2. 左侧边栏 (Left Sidebar) — ~250px 宽

### 项目名称
- **"My First Project"** — 项目标题
- **«** 折叠按钮

### 文档操作
- **+ New** 按钮 — 新建文档
- **↓ Import** 按钮 — 导入文档
- 两按钮并排，outline 样式

### 文档列表
- 📄 **Chapter 1** — 当前选中
- 选中态：紫色背景 `var(--primary-cta-transparent)` + 紫色文字 `var(--primary-cta)`

### 底部
- **Story Bible** — 带 Toggle 开关（紫色 `var(--primary-cta)`）
- **🗑 Trash** — 回收站

---

## 3. 中央编辑器 (Center Editor) — 弹性宽度

### 编辑器工具栏 (Sticky)
🔍 ↩ ↪ **B** *I* <u>U</u> ~~S~~ ✏ ≡ Aa H1 ··· 💬 📋 🕐 ⬆

### 文档标题
- **"Chapter 1"** — Serif 字体，约 32px
- 旁边有 **···** 更多操作

### 正文编辑区
- 字体：Serif (Lora/Merriweather/GT Super Text)
- 字号：~18px
- 行高：~1.8
- 文字颜色：`var(--grey-0)` (#383838)
- 内容最大宽度：~680px，居中
- 背景：`var(--document-background)` (#fff)

### Story Bible 区域（编辑区下方）
卡片式设计，圆角 `border-radius: 10px`，白色背景

#### 可折叠面板：
1. **🧠 Braindump** — 自由文本区域
2. **👑 Genre** — 文本输入（Examples: Romance, Horror, Fantasy...）
3. **🎭 Style** — 三选一卡片：
   - ☆ **Featured Styles** (Tried and true)
   - ✨ **Match My Style** (Sounds like you)
   - ✏ **Custom** (For the most control)
4. **🔗 Synopsis** — 带 **✨ Generate Synopsis** 紫色按钮
5. **👤 Characters** — 带 **+ Add Character** 链接 + ··· 菜单
6. **🌍 Worldbuilding** — 带 **+ Add Element** 链接 + ··· 菜单
7. **📋 Outline** — 带 **✨ Generate Novel Outline** 紫色按钮
   - 下拉选项：All chapters ▼ | 3rd person ltd. POV ▼ | Auto ▼ | Past tense ▼

---

## 4. 右侧边栏 (Right Sidebar) — ~280-300px 宽

### 折叠按钮
- **»** 可折叠右侧边栏

### 标签页
- **History** | **Chat** — 标签切换
- 右侧：🕐 + 图标按钮

### Chat 面板（空状态）
- **"Start a conversation"** — 标题
- "Ask questions about your project, get writing suggestions, or paste long text for analysis." — 描述

### 底部输入区
- 输入框："Ask a question about your project"
- **Standard ▼** — 模型选择
- **▶** 发送按钮（紫色）

### 底部按钮
- **💬 Support** — 白色背景圆角
- **💎 Upgrade** — 紫色背景 `var(--primary-cta)` + 白色文字

---

## 5. 主题系统 (Theme System)

Sudowrite 支持 **8 个主题**，通过 `body[data-theme]` 属性切换：

### 浅色主题 (Light)
| 主题 | 背景图 | 主色调 |
|------|--------|--------|
| **Sorbet** (默认) | sorbet-background.png | `#4808d1` 紫色 |
| **Moonbeam** | moonbeam-background.png | `#4808d1` 紫色 |
| **Sepia** | sepia-background.png | `#c06800` 琥珀色 |

### 深色主题 (Dark)
| 主题 | 背景图 | 主色调 |
|------|--------|--------|
| **Amber** | amber-background.png | `#c06800` 琥珀 |
| **Forest** | forest-background.png | `#69ac13` 绿色 |
| **Aurora Borealis** | aurora-borealis-background.png | `#07a297` 青色 |
| **Cauldron** | cauldron-background.png | `#6d0abb` 深紫 |
| **Charcoal** | charcoal-background.png | `#5716e3` 蓝紫 |

---

## 6. CSS 变量系统 (Design Tokens)

### 核心颜色变量（以 Sorbet 主题为例）

```css
/* 主色调 */
--primary-cta: #4808d1;
--primary-cta-hover: #6530d8;
--primary-cta-active: #7240dd;
--primary-cta-light: #9b7ae1;
--canvas-cta: #9747ff;

/* 主色调透明度变体 */
--primary-cta-transparent: rgba(72, 8, 209, 0.07);
--primary-cta-transparent-05: rgba(72, 8, 209, 0.05);
--primary-cta-transparent-10: rgba(72, 8, 209, 0.1);
--primary-cta-transparent-15: rgba(72, 8, 209, 0.15);
--primary-cta-transparent-30: rgba(72, 8, 209, 0.3);

/* 菜单/面板颜色 */
--menu-color: #fff;
--menu-color-hover: #efefef;
--menu-color-active: #dddddd;

/* 文档背景 */
--document-background: #fff;
--document-background-hover: #efefef;

/* 灰度系统 */
--grey-0: #383838;   /* 最深 - 正文 */
--grey-1: #686868;   /* 辅助文字 */
--grey-2: #acacac;   /* 占位符/边框 */
--grey-3: #e5e5e5;   /* 边框/分隔线 */
--grey-4: #f3f3f3;   /* 背景 */

/* 功能颜色 */
--danger-color: #ff5862;
--success-color: #10bc5f;
--warning-color: #ffc300;
--cta-text-color: #f6f6f6;

/* 阴影系统 */
--tiny-drop-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.08);
--default-drop-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
--card-drop-shadow: 0px 2px 6px 0px rgba(0, 0, 0, 0.15), 0px 0px 1px 0px rgba(0, 0, 0, 0.25);
```

---

## 7. 字体系统

```css
/* Google Fonts 引入 */
font-family: Fira Mono, Lora, Poppins, Sriracha, Roboto, Merriweather, Esteban, Mansalva;

/* 额外引入 */
font-family: Inter, IBM Plex Mono, MedievalSharp;

/* 自定义字体 */
font-family: Quattro;       /* iA Writer 字体 */
font-family: OpenDyslexic;  /* 无障碍字体 */
font-family: GT Super Text;  /* 衬线正文 */
font-family: GT Super Display; /* 衬线展示 */
```

| 用途 | 字体 | 大小 |
|------|------|------|
| UI 主体 | `Inter, sans-serif` | 14px |
| AI 按钮 | `Inter` | 14px, weight 500 |
| 章节标题 | Serif (GT Super/Lora) | 32px |
| 正文 | Serif (GT Super Text/Lora/Merriweather) | ~18px |
| 代码/等宽 | `IBM Plex Mono` / `Fira Mono` | ~14px |
| 状态文字 | `Inter` | 13px |

---

## 8. 组件样式规范

### 按钮系统（来自 TailwindCSS 类名分析）

```css
/* 主要 CTA 按钮 */
background-color: var(--primary-cta);
color: var(--cta-text-color);
border-radius: 10px;
padding: 9px 14px;
font-weight: 500;

/* 次要按钮 */
background-color: var(--menu-color);
border: 1px solid var(--grey-3);
border-radius: 10px;

/* 圆角系统 */
border-radius: 10px;  /* 标准组件 */
border-radius: 20px;  /* 胶囊按钮 */
border-radius: 8px;   /* 小组件 */
```

### 输入框
```css
background: var(--text-field-background); /* #f7f7f7 */
border: 1px solid var(--grey-3);
border-radius: 10px;
```

### 卡片
```css
background-color: var(--document-background);
border-radius: 10px;
box-shadow: var(--card-drop-shadow);
```

---

## 9. 交互特征清单

1. ✅ 左侧边栏可折叠（« 按钮）
2. ✅ 右侧边栏可折叠（» 按钮）
3. ✅ AI 工具下拉菜单（Write/Rewrite/Describe 展开选项）
4. ✅ Story Bible Toggle 开关
5. ✅ Story Bible 各面板可折叠（Braindump/Genre/Style/Synopsis/Characters/Worldbuilding/Outline）
6. ✅ History/Chat 标签页切换
7. ✅ 编辑器工具栏固定顶部
8. ✅ 实时自动保存 + 状态显示
9. ✅ 实时字数统计
10. ✅ 多主题切换（8 个主题，含明暗）
11. ✅ AI 生成按钮（Generate Synopsis / Generate Novel Outline）
12. ✅ 滚动条自定义样式（thin scrollbar）

---

## 10. 设计亮点总结

1. **极简清爽** — 白色为主，紫色点缀，视觉压力小
2. **三栏分工明确** — 左导航、中编辑、右 AI 交互
3. **AI 工具突出** — 顶部专栏放置 AI 功能，突出核心能力
4. **沉浸式写作** — Serif 字体 + 宽松行距 + 680px 最大宽度
5. **渐变背景** — 使用背景图片（sorbet-background.png）实现柔和渐变
6. **主题系统完善** — 8 个主题，完整的 CSS 变量体系，支持明暗模式
7. **Story Bible** — 独特的世界观管理系统，结构化辅助 AI 理解上下文
