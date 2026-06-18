# 项目上下文

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4

## 目录结构

```
├── public/                 # 靜态资源
├── scripts/                # 构建与启动脚本
│   ├── build.sh            # 构建脚本
│   ├── dev.sh              # 开发环境启动脚本
│   ├── prepare.sh          # 预处理脚本
│   └── start.sh            # 生产环境启动脚本
├── src/
│   ├── app/                # 页面路由与布局
│   │   └── page.tsx        # 主页面 - 打托装柜计算器
│   ├── components/         # 业务组件
│   │   ├── InputForm.tsx   # 输入表单（支持单产品/多SKU）
│   │   ├── LayerEditor.tsx # 层编辑器（2D俯视图）
│   │   ├── SolutionPreview.tsx # 方案预览（3D等轴视图）
│   │   ├── ContainerPreview.tsx # 装柜示意图（集装箱俯视图）
│   │   ├── WarningPanel.tsx # 预警提示组件
│   │   ├── PDFExport.tsx   # PDF导出组件
│   │   ├── ReportCanvas.tsx # 报告画布
│   │   └ ui/              # Shadcn UI 组件库
│   ├── hooks/              # 自定义 Hooks
│   ├── lib/                # 工具库
│   │   ├── palletize.ts    # 打托排版算法核心
│   │   └ utils.ts         # 通用工具函数 (cn)
│   └── server.ts           # 自定义服务端入口
├── next.config.ts          # Next.js 配置
├── package.json            # 项目依赖管理
└ tsconfig.json            # TypeScript 配置
```

- 项目文件（如 app 目录、pages 目录、components 等）默认初始化到 `src/` 目录下。

## 核心功能模块

### 打托装柜计算器 (src/lib/palletize.ts)

核心算法模块，提供：
- **单产品打托计算**: `calculatePalletPlan()` - 计算最优摆放方向、层数、利用率
- **多SKU装柜计算**: `calculateMultiSKU()` - 多产品汇总托盘需求
- **集装箱装柜计算**: `calculateContainerLoad()` - 集装箱利用率分析
- **预警检查**: `checkWarnings()` - 高度/重量/载重/门高预警

预设数据：
- `PALLET_PRESETS`: 12种标准托盘规格
- `TRUCK_PRESETS`: 8种车辆/集装箱规格
- `CONTAINER_PRESETS`: 20GP/40GP/40HC/45HC详细参数

### 界面组件

| 组件 | 功能 |
|------|------|
| InputForm | 产品录入（单产品/多SKU）、托盘参数、集装箱选择 |
| LayerEditor | 2D俯视图，可视化层排列 |
| SolutionPreview | 3D等轴视图，托盘堆叠效果 |
| ContainerPreview | 集装箱俯视图，托盘装载示意 |
| WarningPanel | 预警提示（超高/超重/超载/门高） |
| PDFExport | PDF报告导出 |

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。
**常用命令**：
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 安装所有依赖：`pnpm install`
- 移除依赖：`pnpm remove <package>`

## 开发规范

### 编码规范

- 默认按 TypeScript `strict` 心智写代码；优先复用当前作用域已声明的变量、函数、类型和导入，禁止引用未声明标识符或拼错变量名。
- 禁止隐式 `any` 和 `as any`；函数参数、返回值、解构项、事件对象、`catch` 错误在使用前应有明确类型或先完成类型收窄，并清理未使用的变量和导入。

### next.config 配置规范

- 配置的路径不要写死绝对路径，必须使用 path.resolve(__dirname, ...)、import.meta.dirname 或 process.cwd() 动态拼接。

### Hydration 问题防范

1. 严禁在 JSX 渲染逻辑中直接使用 typeof window、Date.now()、Math.random() 等动态数据。**必须使用 'use client' 并配合 useEffect + useState 确保动态内容仅在客户端挂载后渲染**；同时严禁非法 HTML 嵌套（如 <p> 嵌套 <div>）。
2. **禁止使用 head 标签**，优先使用 metadata，详见文档：https://nextjs.org/docs/app/api-reference/functions/generate-metadata
   1. 三方 CSS、字体等资源可在 `globals.css` 中顶部通过 `@import` 引入或使用 next/font
   2. preload, preconnect, dns-prefetch 通过 ReactDOM 的 preload、preconnect、dns-prefetch 方法引入
   3. json-ld 可阅读 https://nextjs.org/docs/app/guides/json-ld

## UI 设计与组件规范 (UI & Styling Standards)

- 模板默认预装核心组件库 `shadcn/ui`，位于`src/components/ui/`目录下
- Next.js 项目**必须默认**采用 shadcn/ui 组件、风格和规范，**除非用户指定用其他的组件和规范。**