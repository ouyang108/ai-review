# AI Code Review 平台 — 项目文档

> 基于 LangChain + LangGraph + NestJS + Next.js 的企业级 AI 代码审查平台，支持 GitHub Webhook 自动触发、多 AI 提供商接入、结构化审查报告生成。

---

## 目录

- [项目概述](#项目概述)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [环境变量](#环境变量)
- [架构设计](#架构设计)
- [模块详解 — 后端](#模块详解--后端)
  - [AI Code Review 工作流（核心）](#ai-code-review-工作流核心)
  - [Diff 解析模块](#diff-解析模块)
  - [GitHub Webhook 模块](#github-webhook-模块)
  - [AI 配置模块](#ai-配置模块)
  - [数据库模型](#数据库模型)
  - [拦截器与异常处理](#拦截器与异常处理)
- [模块详解 — 前端](#模块详解--前端)
- [API 接口](#api-接口)
- [数据流程](#数据流程)
- [部署](#部署)

---

## 项目概述

本平台通过监听 GitHub Pull Request 事件，自动调用 AI 大语言模型对代码变更进行逐文件审查，最终生成包含评分、问题列表和改进建议的 Markdown 报告。

**核心能力：**

- 接收 GitHub Webhook，实时触发 PR 代码审查
- 支持 Anthropic、OpenAI、DeepSeek、自定义兼容接口等多种 AI 提供商
- 基于 LangGraph StateGraph 编排多步骤工作流（获取上下文 → 逐文件审查 → 汇总报告）
- 结构化输出：每文件评分（0-100）、问题严重级别分类、具体修复建议
- 完整的数据持久化（审查历史、PR 记录、仪表盘统计）

---

## 技术栈

### 后端（`apps/server`）

| 类别       | 技术                                     | 版本    |
| ---------- | ---------------------------------------- | ------- |
| 框架       | NestJS                                   | 11.0.1  |
| 数据库     | PostgreSQL + Prisma                      | 7.8.0   |
| AI 工作流  | LangChain + LangGraph                    | 1.x     |
| AI 提供商  | @langchain/anthropic / @langchain/openai | 1.x     |
| GitHub API | Octokit                                  | 5.x     |
| Diff 解析  | parse-diff                               | 0.12.0  |
| 验证       | class-validator + class-transformer      | 0.15.x  |
| 运行时     | Node.js                                  | ≥18.0.0 |

### 前端（`apps/client`）

| 类别      | 技术                 | 版本   |
| --------- | -------------------- | ------ |
| 框架      | Next.js (App Router) | 16.2.4 |
| UI 运行时 | React                | 19.2.4 |
| 样式      | Tailwind CSS         | 4.x    |
| 组件库    | shadcn/ui (Radix UI) | 4.x    |
| 图标      | lucide-react         | —      |
| 通知      | sonner               | 2.x    |
| 代码质量  | Biome                | 2.x    |

### 工程化

| 类别      | 工具                |
| --------- | ------------------- |
| Monorepo  | pnpm workspace      |
| 提交规范  | Commitlint + cz-git |
| Git Hooks | simple-git-hooks    |
| 包管理    | pnpm ≥8.0.0         |

---

## 项目结构

```
project-template-main/
├── apps/
│   ├── server/                    # NestJS 后端
│   │   ├── prisma/
│   │   │   └── schema.prisma      # 数据库 Schema
│   │   └── src/
│   │       ├── langchain/         # AI Code Review 工作流（核心）
│   │       │   ├── parseDiff.ts   # Unified Diff 解析器
│   │       │   └── review.ts      # LangGraph 工作流编排
│   │       ├── github/            # GitHub Webhook 处理模块
│   │       ├── ai-setting/        # AI 配置 CRUD 模块
│   │       ├── prisma/            # Prisma 数据库服务
│   │       ├── interceptor/       # 响应拦截 & 异常过滤
│   │       ├── common/            # 公共装饰器
│   │       ├── constant/          # 全局常量
│   │       ├── app.module.ts      # 根模块
│   │       └── main.ts            # 启动入口（端口 3002）
│   └── client/                    # Next.js 前端
│       └── app/
│           ├── layout.tsx         # 根布局
│           ├── page.tsx           # 入口（重定向到 /home）
│           └── (main)/            # 路由组（侧边栏布局）
│               ├── home/          # 首页
│               └── settings/      # 设置页（AI/GitHub/通知）
├── packages/
│   └── shared/                    # 跨应用共享代码
├── pnpm-workspace.yaml
└── package.json
```

---

## 快速开始

### 环境要求

- Node.js ≥ 18.0.0
- pnpm ≥ 8.0.0
- PostgreSQL 数据库

### 安装依赖

```bash
pnpm install
```

### 数据库初始化

```bash
cd apps/server
npx prisma migrate dev
npx prisma generate
```

### 启动开发服务器

```bash
# 同时启动前后端
pnpm dev

# 仅启动后端（端口 3002）
cd apps/server && pnpm dev

# 仅启动前端（端口 3000）
cd apps/client && pnpm dev
```

---

## 环境变量

### 后端（`apps/server/.env`）

```env
# 数据库连接
DATABASE_URL="postgresql://user:password@localhost:5432/ai_review"

# GitHub Webhook 密钥（与 GitHub 仓库 Webhook 配置保持一致）
GITHUB_WEBHOOK_SECRET="your_webhook_secret"

# GitHub Personal Access Token（用于拉取 PR diff 和文件内容）
GITHUB_TOKEN="ghp_xxxxxxxxxxxx"
```

### 前端（`apps/client/.env.local`）

```env
# 后端 API 地址
NEXT_PUBLIC_API_URL=http://localhost:3002/api/v1
```

---

## 架构设计

### 整体架构

```
GitHub PR 事件
      │
      ▼
GitHub Webhook ──POST──▶ /api/v1/github
                              │
                    GithubService.create()
                              │
                    ┌─────────┴──────────┐
                    │  获取 PR diff       │
                    │  (Octokit API)     │
                    └─────────┬──────────┘
                              │
                    parseDiff(rawDiff)
                              │
                    runCodeReview(input)
                              │
                    ┌─────────▼──────────────────────────────┐
                    │        LangGraph StateGraph             │
                    │                                         │
                    │  START                                  │
                    │    │                                    │
                    │    ▼                                    │
                    │  fetchFileContexts                      │
                    │  (GitHub API 拉取完整文件内容)            │
                    │    │                                    │
                    │    ▼                                    │
                    │  reviewEachFile                         │
                    │  (逐文件 LLM 审查 → JSON 结构化输出)      │
                    │    │                                    │
                    │    ▼                                    │
                    │  aggregateReview                        │
                    │  (汇总 → Markdown 报告 + 综合评分)        │
                    │    │                                    │
                    │   END                                   │
                    └─────────────────────────────────────────┘
                              │
                    ReviewOutput
                    { content, score, fileReviews }
```

### 响应格式（统一封装）

所有 API 响应由全局拦截器统一包装：

```json
{
  "timestamp": "2026-04-24T10:00:00.000Z",
  "path": "/api/v1/ai-setting",
  "message": "success",
  "code": 200,
  "success": true,
  "data": { ... }
}
```

---

## 模块详解 — 后端

---

### AI Code Review 工作流（核心）

> 文件：`apps/server/src/langchain/review.ts`

这是整个平台最核心的模块，使用 **LangGraph StateGraph** 将 AI 代码审查编排为三个有序节点的工作流，支持多 AI 提供商，输出结构化审查报告。

---

#### 公开接口定义

##### `AiReviewSettings` — AI 模型配置

```typescript
interface AiReviewSettings {
  provider: 'openai' | 'anthropic' | 'deepseek' | 'custom';
  apiKey?: string | null;
  model: string; // 如 "gpt-4o", "claude-3-7-sonnet"
  baseUrl?: string | null; // custom provider 的 API 基础地址
  temperature: number; // 0~2，越高越随机
  maxTokens: number; // 最大输出 token 数
  systemPrompt?: string | null; // 自定义提示词，空时使用内置提示词
}
```

##### `PrInfo` — PR 元数据

```typescript
interface PrInfo {
  title: string;
  description?: string;
  author: string;
  sourceBranch: string;
  targetBranch: string;
}
```

##### `GithubContext` — GitHub API 上下文

```typescript
interface GithubContext {
  octokit: Octokit;
  owner: string;
  repo: string;
  ref: string; // PR head commit SHA，用于拉取指定版本的文件内容
}
```

##### `ReviewInput` — 工作流入参

```typescript
interface ReviewInput {
  fileDiffs: FileDiff[]; // 解析后的 diff 列表
  aiSettings: AiReviewSettings; // AI 模型配置
  githubContext?: GithubContext; // 可选：提供后拉取完整文件内容
  prInfo?: PrInfo; // 可选：PR 信息，丰富审查上下文
}
```

##### `FileIssue` — 单个问题条目

```typescript
interface FileIssue {
  severity: 'critical' | 'major' | 'minor' | 'info';
  line?: number; // 问题所在行号（不适用时为 undefined）
  message: string; // 问题描述
  suggestion?: string; // 修复建议
}
```

严重级别定义：

| 级别       | 含义               | 示例                                 |
| ---------- | ------------------ | ------------------------------------ |
| `critical` | 必须修复，阻断合并 | 安全漏洞、数据丢失、程序崩溃         |
| `major`    | 应当修复           | 逻辑错误、重大设计缺陷、缺少错误处理 |
| `minor`    | 建议修复           | 命名规范、代码风格、轻微性能问题     |
| `info`     | 观察意见           | 值得关注的模式、可替代的实现方式     |

##### `FileReviewResult` — 单文件审查结果

```typescript
interface FileReviewResult {
  filePath: string; // 文件路径
  score: number; // 文件评分 0-100
  issues: FileIssue[]; // 问题列表
  summary: string; // 该文件变更的简要描述
}
```

##### `ReviewOutput` — 工作流返回值

```typescript
interface ReviewOutput {
  content: string; // Markdown 格式最终报告
  score: number; // 综合评分 0-100
  fileReviews: FileReviewResult[]; // 各文件审查明细
}
```

---

#### LangGraph 状态定义

工作流使用 `Annotation.Root` 定义共享状态，各节点读写同一状态对象：

```typescript
const ReviewStateAnnotation = Annotation.Root({
  fileDiffs: Annotation<FileDiff[]>, // 输入：diff 列表
  prInfo: Annotation<PrInfo | undefined>, // 输入：PR 元数据
  fileContexts: Annotation<Record<string, string>>({
    // 节点1 写入：文件路径 → 完整内容
    reducer: (prev, next) => ({ ...prev, ...next }), // 合并策略：增量追加
    default: () => ({}),
  }),
  fileReviews: Annotation<FileReviewResult[]>({
    // 节点2 追加：逐文件结果
    reducer: (prev, next) => [...prev, ...next], // 合并策略：数组追加
    default: () => [],
  }),
  finalReview: Annotation<string>, // 节点3 写入：Markdown 报告
  score: Annotation<number>, // 节点3 写入：综合评分
});
```

**状态流转图：**

```
             fileDiffs (输入)
             prInfo (输入)
                  │
    ┌─────────────▼─────────────┐
    │    fetchFileContexts       │  写入：fileContexts
    └─────────────┬─────────────┘
                  │  读取：fileDiffs, fileContexts
    ┌─────────────▼─────────────┐
    │    reviewEachFile          │  追加：fileReviews
    └─────────────┬─────────────┘
                  │  读取：fileReviews, prInfo
    ┌─────────────▼─────────────┐
    │    aggregateReview         │  写入：finalReview, score
    └─────────────┬─────────────┘
                  │
             ReviewOutput (返回)
```

---

#### 节点1：`fetchFileContexts` — 拉取文件上下文

**职责：** 通过 GitHub API 获取每个修改文件的完整内容，让 LLM 在审查 diff 时拥有更完整的上下文，理解变更在整个文件中的作用。

**关键设计决策：**

1. **截断保护**：文件内容超过 200 行时截断，防止单次请求 token 超限：

   ```typescript
   contexts[filePath] =
     allLines.length > 200
       ? allLines.slice(0, 200).join('\n') + '\n... (file truncated at 200 lines)'
       : decoded;
   ```

2. **跳过删除文件**：已删除的文件不需要拉取当前内容：

   ```typescript
   if (!filePath || fileDiff.isDeleted) continue;
   ```

3. **静默失败**：新文件、权限不足等情况静默跳过，不中断审查流程：

   ```typescript
   } catch {
     // 静默跳过，不影响 review 流程
   }
   ```

4. **Base64 解码**：GitHub API 返回的文件内容为带换行符的 base64，需去除换行后解码：
   ```typescript
   const decoded = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8');
   ```

**输入/输出：**

- 输入：`state.fileDiffs`（diff 列表）+ `githubContext`（GitHub 认证信息）
- 输出：`{ fileContexts: Record<string, string> }`

---

#### 节点2：`reviewEachFile` — 逐文件 LLM 审查

**职责：** 为每个修改文件构造 prompt，调用 LLM，解析 JSON 格式的审查结果。

**Prompt 构成（用户消息）：**

```
1. diff 内容（带行号和 hunk header）
2. 完整文件内容（如有，state.fileContexts 中存在时追加）
3. PR 上下文（标题、作者、分支信息，如有 prInfo 时追加）
```

**系统提示词（内置）要求 LLM 输出纯 JSON：**

```json
{
  "score": 85,
  "summary": "本次变更新增了用户认证中间件",
  "issues": [
    {
      "severity": "major",
      "line": 42,
      "message": "未对 token 进行过期验证",
      "suggestion": "使用 jwt.verify() 并捕获 TokenExpiredError"
    }
  ]
}
```

审查重点（内置提示词约束 LLM 关注）：

1. **正确性与逻辑** — 错误、边界情况、差一错误、null/undefined 处理
2. **安全性** — 注入攻击、鉴权绕过、敏感数据泄露、输入校验
3. **性能** — O(n²) 循环、N+1 查询、不必要的重渲染、内存泄漏
4. **错误处理** — 未处理的 Promise 拒绝、错误被吞掉、缺少 try/catch
5. **代码质量** — 可读性、命名规范、DRY 原则违反、过高复杂度
6. **最佳实践** — SOLID 原则、框架约定、类型安全

**关键设计决策：**

1. **顺序执行（非并发）**：逐文件顺序调用 LLM，规避 API 速率限制：

   ```typescript
   for (const fileDiff of state.fileDiffs) {
     // 顺序调用，不使用 Promise.all
   }
   ```

2. **JSON 解析容错**：兼容 LLM 带 markdown 代码块的响应和裸 JSON（见 `parseJsonResponse`）

3. **单文件失败降级**：单文件 LLM 调用失败不影响其他文件：
   - JSON 解析失败：原始响应作为 summary，评分默认 70
   - LLM 调用异常：记录错误信息，评分默认 50

4. **自定义提示词**：`aiSettings.systemPrompt` 非空时完全替换内置提示词

**评分边界保护：**

```typescript
score: Math.max(0, Math.min(100, Number(parsed.score) || 80));
```

**输入/输出：**

- 输入：`state.fileDiffs`、`state.fileContexts`、`state.prInfo`
- 输出：`{ fileReviews: FileReviewResult[] }`（追加模式）

---

#### 节点3：`aggregateReview` — 汇总生成报告

**职责：** 将所有文件审查结果发送给 LLM，生成最终 Markdown 格式 PR 审查报告和综合评分。

**发送给 LLM 的信息：**

- PR 元数据（标题、作者、分支，如有）
- 每个文件的：路径、评分、问题列表（含严重级别、行号、描述、修复建议）

**LLM 生成的最终报告结构：**

```markdown
# PR 审查报告

## 总结

[2-3 句话描述本次 PR 的内容及整体评估]

## 评分：{N}/100

[评分依据]

## 严重问题

- 问题列表

## 重要问题

- 问题列表

## 轻微问题与建议

- 问题列表

## 亮点

[本次 PR 中做得好的地方]

## 文件明细

[每个文件的路径和简要说明]

---

_AI 代码审查 —— 合并前请仔细评估所有建议_
```

**综合评分提取：**

```typescript
// 从 "## 评分：N/100" 中正则提取
const scoreMatch = content.match(/##\s*Score:\s*(\d+)/i);
const extractedScore = scoreMatch ? parseInt(scoreMatch[1], 10) : null;
// 未提取到时降级为各文件评分的算术平均值
score: Math.max(0, Math.min(100, extractedScore ?? avgFileScore));
```

**降级机制（LLM 调用失败时）：**

调用 `buildFallbackMarkdown()` 程序化生成报告，确保工作流始终返回可读结果：

- 按严重级别分组显示所有问题
- 评分使用各文件算术平均值
- 格式与 LLM 生成版本保持一致

**输入/输出：**

- 输入：`state.fileReviews`、`state.prInfo`
- 输出：`{ finalReview: string, score: number }`

---

#### LLM 工厂函数

根据 `AiReviewSettings.provider` 创建对应的 LangChain 模型实例：

```typescript
function createLLM(settings: AiReviewSettings): BaseChatModel {
  if (provider === 'anthropic') {
    return new ChatAnthropic({ apiKey, model, temperature, maxTokens });
  }
  // openai / deepseek / custom 均使用 OpenAI-compatible 接口
  return new ChatOpenAI({
    apiKey,
    model,
    temperature,
    maxTokens,
    configuration: baseUrl ? { baseURL: baseUrl } : undefined,
  });
}
```

| provider    | 使用的 LangChain 类 | 备注                        |
| ----------- | ------------------- | --------------------------- |
| `anthropic` | `ChatAnthropic`     | Claude 系列模型             |
| `openai`    | `ChatOpenAI`        | GPT 系列模型                |
| `deepseek`  | `ChatOpenAI`        | 兼容 OpenAI 接口            |
| `custom`    | `ChatOpenAI`        | 通过 baseUrl 指向自定义接口 |

---

#### 工作流组装与执行

```typescript
export async function runCodeReview(input: ReviewInput): Promise<ReviewOutput> {
  const llm = createLLM(input.aiSettings);

  // 通过闭包将 llm、githubContext、systemPrompt 注入各节点
  const workflow = new StateGraph(ReviewStateAnnotation)
    .addNode('fetchFileContexts', (state) => fetchFileContextsNode(state, input.githubContext))
    .addNode('reviewEachFile', (state) =>
      reviewEachFileNode(state, llm, input.aiSettings.systemPrompt)
    )
    .addNode('aggregateReview', (state) => aggregateReviewNode(state, llm))
    .addEdge(START, 'fetchFileContexts')
    .addEdge('fetchFileContexts', 'reviewEachFile')
    .addEdge('reviewEachFile', 'aggregateReview')
    .addEdge('aggregateReview', END);

  const graph = workflow.compile();

  const result = await graph.invoke({
    fileDiffs: input.fileDiffs,
    prInfo: input.prInfo,
    fileContexts: {},
    fileReviews: [],
    finalReview: '',
    score: 0,
  });

  return {
    content: result.finalReview,
    score: result.score,
    fileReviews: result.fileReviews,
  };
}
```

---

### Diff 解析模块

> 文件：`apps/server/src/langchain/parseDiff.ts`

将 GitHub API 返回的 Unified Diff 字符串解析为结构化的 `FileDiff[]` 数组。

#### 接口定义

```typescript
// 单行变更
interface DiffLine {
  type: 'add' | 'del' | 'normal'; // 新增、删除、上下文行
  content: string;
  lineNumber?: number; // 新文件中的行号（删除行为 undefined）
}

// 变更块（hunk）
interface DiffHunk {
  oldStart: number; // 原文件起始行号
  oldLines: number; // 原文件行数
  newStart: number; // 新文件起始行号
  newLines: number; // 新文件行数
  lines: DiffLine[];
}

// 单文件变更
interface FileDiff {
  from?: string; // 原文件路径（重命名时与 to 不同）
  to?: string; // 新文件路径
  isNew: boolean;
  isDeleted: boolean;
  additions: number; // 新增行数
  deletions: number; // 删除行数
  hunks: DiffHunk[];
}
```

#### 自动过滤规则

以下文件类型会被自动过滤，不参与 AI 审查：

| 类别         | 匹配规则                                                      |
| ------------ | ------------------------------------------------------------- |
| 文档         | `*.md`, `*.mdx`                                               |
| 锁文件       | `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`            |
| 二进制/图片  | `*.png`, `*.jpg`, `*.gif`, `*.svg`, `*.ico`, `*.woff*`        |
| 构建产物     | `dist/`, `.next/`, `build/`, `out/` 目录下的文件              |
| 测试快照     | `*.snap`                                                      |
| 配置文件     | `*.json`（非 `tsconfig`、`package.json`）、`*.yaml`、`*.toml` |
| 自动生成代码 | `generated/` 目录下的文件、`*.generated.ts`                   |

---

### GitHub Webhook 模块

> 文件：`apps/server/src/github/`

#### 触发条件

监听 GitHub Webhook 的 `pull_request` 事件（通过 `X-GitHub-Event` 请求头判断）。

#### 处理流程

```typescript
// github.service.ts
async create(createGithubDto: CreateGithubDto, headers: Record<string, string>) {
  // 1. 验证事件类型
  const eventType = headers['x-github-event'];
  if (!GITHUB_HEADER_TYPES.includes(eventType)) return;

  // 2. 初始化 Octokit
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  // 3. 获取 PR diff（application/vnd.github.diff 媒体类型）
  const diffResponse = await octokit.rest.pulls.get({
    owner, repo, pull_number,
    mediaType: { format: 'diff' },
  });

  // 4. 解析 diff
  const fileDiffs = parseDiff(diffResponse.data as unknown as string);

  // 5. 执行 AI 审查工作流
  const result = await runCodeReview({
    fileDiffs,
    aiSettings,        // 从数据库读取当前 AI 配置
    githubContext: { octokit, owner, repo, ref: head_sha },
    prInfo: { title, author, sourceBranch, targetBranch },
  });
}
```

#### Webhook 配置要求

在 GitHub 仓库设置中配置 Webhook：

- **Payload URL**：`https://your-domain.com/api/v1/github`
- **Content type**：`application/json`
- **Secret**：与 `GITHUB_WEBHOOK_SECRET` 环境变量一致
- **Events**：勾选 `Pull requests`

---

### AI 配置模块

> 文件：`apps/server/src/ai-setting/`

管理 AI 审查相关的配置（模型提供商、API Key、参数等），持久化到数据库 `AiSettings` 表。

#### 接口

| 方法  | 路径                     | 说明             |
| ----- | ------------------------ | ---------------- |
| GET   | `/api/v1/ai-setting`     | 获取当前 AI 配置 |
| POST  | `/api/v1/ai-setting`     | 创建 AI 配置     |
| PATCH | `/api/v1/ai-setting/:id` | 更新 AI 配置     |

#### DTO 字段

```typescript
class CreateAiSettingDto {
  provider: AiProvider; // 'openai' | 'anthropic' | 'deepseek' | 'custom'
  apiKey?: string;
  model: string;
  baseUrl?: string; // custom provider 时必填
  temperature: number; // 0~2
  maxTokens: number;
  systemPrompt?: string; // 自定义系统提示词
  customName?: string; // custom provider 的显示名称
}
```

---

### 数据库模型

> 文件：`apps/server/prisma/schema.prisma`

#### 核心模型关系

```
AiSettings (1)
GithubSettings (1)
NotificationSettings (1)

Repository (n) ──1:n──▶ PullRequest (n) ──1:n──▶ Review (n)

DashboardSnapshot (n)   // 定期快照，不关联其他表
```

#### `AiSettings` — AI 配置

```prisma
model AiSettings {
  id           Int        @id @default(autoincrement())
  provider     AiProvider              // openai | anthropic | deepseek | custom
  apiKey       String?
  model        String
  baseUrl      String?
  temperature  Float      @default(0.3)
  maxTokens    Int        @default(2000)
  systemPrompt String?
  customName   String?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
}
```

#### `PullRequest` — PR 记录

```prisma
model PullRequest {
  id            Int           @id @default(autoincrement())
  repositoryId  Int
  prNumber      Int
  title         String
  author        String
  sourceBranch  String
  targetBranch  String
  prUrl         String
  status        ReviewStatus  @default(pending)
  score         Float?
  triggerSource TriggerSource @default(github_webhook)
  repository    Repository    @relation(...)
  reviews       Review[]
  @@unique([repositoryId, prNumber])   // 同一仓库同一 PR 唯一
}
```

#### `Review` — 审查结果

```prisma
model Review {
  id            Int          @id @default(autoincrement())
  pullRequestId Int
  aiProvider    String       // 记录审查时使用的 provider
  aiModel       String       // 记录审查时使用的 model
  content       String       // Markdown 格式报告
  score         Float?       // 综合评分 0-100
  status        ReviewStatus
  errorMessage  String?      // 审查失败时的错误信息
  pullRequest   PullRequest  @relation(...)
}
```

#### 枚举

```prisma
enum ReviewStatus {
  pending    // 等待审查
  reviewing  // 审查中
  passed     // 通过（score 达标）
  rejected   // 拒绝（score 未达标）
  error      // 审查失败
}

enum TriggerSource {
  github_webhook  // GitHub PR 触发
  gitlab_ci       // GitLab CI 触发
  manual          // 手动触发
  api             // API 调用触发
}

enum AiProvider {
  openai
  anthropic
  deepseek
  custom
}
```

---

### 拦截器与异常处理

> 文件：`apps/server/src/interceptor/`

#### 响应拦截器（`interceptor.ts`）

所有成功响应统一包装为：

```typescript
{
  timestamp: string,   // ISO 时间戳
  path: string,        // 请求路径
  message: 'success',
  code: number,        // HTTP 状态码
  success: true,
  data: T              // 原始响应数据
}
```

#### 异常过滤器（`exceptionFilter.ts`）

所有 HTTP 异常统一包装为：

```typescript
{
  timestamp: string,
  path: string,
  message: string,     // 异常消息
  code: number,        // HTTP 状态码
  success: false,
  data: null
}
```

---

## 模块详解 — 前端

> 目录：`apps/client/`

### 路由结构

| 路径        | 组件                           | 说明                         |
| ----------- | ------------------------------ | ---------------------------- |
| `/`         | `app/page.tsx`                 | 重定向到 `/home`             |
| `/home`     | `app/(main)/home/page.tsx`     | 首页（仪表盘）               |
| `/settings` | `app/(main)/settings/page.tsx` | 设置页（AI/GitHub/通知配置） |

### 主布局

`app/(main)/layout.tsx` 实现左侧导航 + 右侧内容的全屏布局：

```
┌─────────────────────────────┐
│  侧边栏         │  内容区域  │
│  (sidebar-nav) │  (outlet) │
│                │           │
│  - 首页        │           │
│  - 设置        │           │
└─────────────────────────────┘
```

### API 客户端（`lib/api.ts`）

封装 `fetch`，自动注入 `NEXT_PUBLIC_API_URL` 基础地址：

```typescript
// 获取 AI 配置
getAiSetting(): Promise<AiSettingsResponse>

// 更新 AI 配置
updateAiSettings(id: number, data: Partial<AiSettingsForm>): Promise<void>
```

---

## API 接口

### 完整端点列表

| 方法    | 路径                     | 说明                           |
| ------- | ------------------------ | ------------------------------ |
| `GET`   | `/api/v1/ai-setting`     | 获取 AI 配置                   |
| `POST`  | `/api/v1/ai-setting`     | 创建 AI 配置                   |
| `PATCH` | `/api/v1/ai-setting/:id` | 更新 AI 配置                   |
| `POST`  | `/api/v1/github`         | GitHub Webhook 入口            |
| `GET`   | `/`                      | 健康检查（返回 "Hello World"） |

### 请求示例：更新 AI 配置

```bash
curl -X PATCH http://localhost:3002/api/v1/ai-setting/1 \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "anthropic",
    "apiKey": "sk-ant-xxx",
    "model": "claude-3-7-sonnet-20250219",
    "temperature": 0.3,
    "maxTokens": 4000
  }'
```

### 请求示例：模拟 GitHub Webhook

```bash
curl -X POST http://localhost:3002/api/v1/github \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: pull_request" \
  -d '{
    "action": "opened",
    "number": 42,
    "pull_request": {
      "title": "feat: 新增用户认证",
      "user": { "login": "developer" },
      "head": { "ref": "feat/auth", "sha": "abc123" },
      "base": { "ref": "main" },
      "body": "实现了 JWT 认证中间件"
    },
    "repository": {
      "name": "my-repo",
      "owner": { "login": "my-org" }
    }
  }'
```

---

## 数据流程

### 完整 PR 审查流程

```
1. 开发者提交 Pull Request 到 GitHub

2. GitHub 发送 Webhook 事件
   POST /api/v1/github
   Headers: X-GitHub-Event: pull_request

3. GithubService 验证事件类型
   仅处理 GITHUB_HEADER_TYPES 中的事件（pull_request）

4. 通过 Octokit 获取 PR diff
   GET /repos/{owner}/{repo}/pulls/{number}
   Accept: application/vnd.github.diff

5. parseDiff(rawDiff) → FileDiff[]
   过滤文档、锁文件、构建产物等不需要审查的文件

6. 从数据库读取 AiSettings（当前配置）

7. runCodeReview(input) 执行 LangGraph 工作流

   7.1 fetchFileContexts
       对每个修改文件（非删除）：
       GET /repos/{owner}/{repo}/contents/{path}?ref={sha}
       解码 base64 → 截断到 200 行

   7.2 reviewEachFile（顺序执行）
       对每个文件：
       构造 Prompt（diff + 完整文件内容 + PR 信息）
       → 调用 LLM（ChatAnthropic 或 ChatOpenAI）
       → 解析 JSON 响应
       → 得到 FileReviewResult { score, issues, summary }

   7.3 aggregateReview
       整合所有 FileReviewResult
       → 调用 LLM 生成最终 Markdown 报告
       → 提取综合评分（正则匹配 ## Score: N/100）
       → LLM 失败时降级为程序化 Markdown

8. 返回 ReviewOutput
   { content: string, score: number, fileReviews: FileReviewResult[] }

9. 持久化到数据库
   更新 PullRequest.status / score
   创建 Review 记录（content, score, aiProvider, aiModel）
```

---

## 部署

### Docker Compose 启动

```bash
docker-compose up -d
```

`docker-compose.yml` 包含：

- PostgreSQL 数据库服务
- 后端服务（端口 3002）
- 前端服务（端口 3000）

### 生产构建

```bash
# 构建前端
pnpm build:client

# 构建后端
pnpm build:server

# 启动后端
cd apps/server && node dist/main.js
```

### Webhook 公网访问

本地开发时，可使用 [ngrok](https://ngrok.com) 将本地端口暴露到公网：

```bash
ngrok http 3002
# 将生成的 https://xxx.ngrok.io 配置到 GitHub Webhook Payload URL
# 末尾添加 /api/v1/github
```

---

_文档生成于 2026-04-24_
