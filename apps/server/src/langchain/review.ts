/**
 * AI Code Review 工作流（LangChain + LangGraph）
 *
 * 图结构：
 *   START → fetchFileContexts → reviewEachFile → aggregateReview → END
 *
 * 节点说明：
 *  - fetchFileContexts : 通过 GitHub API 拉取修改文件的完整内容，供 LLM 理解上下文
 *  - reviewEachFile    : 逐文件调用 LLM，以 JSON 格式输出 score / issues / summary
 *  - aggregateReview   : 将所有文件 review 汇总，生成最终 Markdown 报告和综合评分
 */

import { StateGraph, Annotation, END, START } from '@langchain/langgraph';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { Octokit } from 'octokit';
import { FileDiff } from './parseDiff';

// ─────────────────────────────────────────────
// 公开接口定义
// ─────────────────────────────────────────────

/** AI 模型配置（对应数据库 AiSettings 模型） */
export interface AiReviewSettings {
  provider: 'openai' | 'anthropic' | 'deepseek' | 'custom';
  apiKey?: string | null;
  model: string;
  baseUrl?: string | null;
  temperature: number;
  maxTokens: number;
  /** 自定义系统提示词，为空时使用内置提示词 */
  systemPrompt?: string | null;
}

/** PR 基本信息，用于丰富 review 上下文 */
export interface PrInfo {
  title: string;
  description?: string;
  author: string;
  sourceBranch: string;
  targetBranch: string;
}

/** GitHub API 上下文，用于获取完整文件内容 */
export interface GithubContext {
  octokit: Octokit;
  owner: string;
  repo: string;
  /** 文件内容基准 ref，通常为 PR head commit SHA */
  ref: string;
}

/** runCodeReview 的入参 */
export interface ReviewInput {
  fileDiffs: FileDiff[];
  aiSettings: AiReviewSettings;
  /** 可选：提供后将拉取完整文件内容作为上下文 */
  githubContext?: GithubContext;
  prInfo?: PrInfo;
}

/** 单个问题条目 */
export interface FileIssue {
  severity: 'critical' | 'major' | 'minor' | 'info';
  line?: number;
  message: string;
  suggestion?: string;
}

/** 单文件 review 结果 */
export interface FileReviewResult {
  filePath: string;
  /** 文件得分 0-100 */
  score: number;
  issues: FileIssue[];
  /** 该文件变更的简要描述 */
  summary: string;
}

/** runCodeReview 的返回值 */
export interface ReviewOutput {
  /** 最终 Markdown 格式的 review 报告 */
  content: string;
  /** 综合评分 0-100 */
  score: number;
  /** 各文件的 review 明细 */
  fileReviews: FileReviewResult[];
}

// ─────────────────────────────────────────────
// LangGraph 状态定义
// ─────────────────────────────────────────────

const ReviewStateAnnotation = Annotation.Root({
  /** 输入：解析后的 diff 列表 */
  fileDiffs: Annotation<FileDiff[]>,
  /** 输入：PR 元数据 */
  prInfo: Annotation<PrInfo | undefined>,
  /** fetchFileContexts 节点写入：文件路径 → 完整文件内容 */
  fileContexts: Annotation<Record<string, string>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({}),
  }),
  /** reviewEachFile 节点追加：逐文件 review 结果 */
  fileReviews: Annotation<FileReviewResult[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
  /** aggregateReview 节点写入：最终 Markdown 报告 */
  finalReview: Annotation<string>,
  /** aggregateReview 节点写入：综合评分 */
  score: Annotation<number>,
});

type ReviewState = typeof ReviewStateAnnotation.State;

// ─────────────────────────────────────────────
// LLM 工厂：根据 provider 创建对应的 LangChain 模型实例
// ─────────────────────────────────────────────

/**
 * 根据 AiReviewSettings 创建对应的 LangChain 聊天模型
 * - anthropic → ChatAnthropic
 * - openai / deepseek / custom → ChatOpenAI（支持自定义 baseURL）
 */
function createLLM(settings: AiReviewSettings): any {
  const { provider, apiKey, model, baseUrl, temperature, maxTokens } = settings;

  if (provider === 'anthropic') {
    return new ChatAnthropic({
      apiKey: apiKey ?? undefined,
      model,
      temperature,
      maxTokens,
    });
  }

  // openai / deepseek / custom 均使用 OpenAI-compatible 接口
  return new ChatOpenAI({
    apiKey: apiKey ?? undefined,
    model,
    temperature,
    maxTokens,
    configuration: baseUrl ? { baseURL: baseUrl } : undefined,
  });
}

// ─────────────────────────────────────────────
// Prompt 常量
// ─────────────────────────────────────────────

/** 单文件 review 系统提示词（要求 LLM 返回 JSON） */
const FILE_REVIEW_SYSTEM_PROMPT = `你是一位资深软件工程师，正在对一个 Pull Request 进行代码审查。

请分析提供的代码差异（如有完整文件上下文也一并分析），并以**纯 JSON 格式**返回审查结果，结构如下：
{
  "score": <整数 0-100>,
  "summary": "<一段话描述本次变更的内容及整体质量>",
  "issues": [
    {
      "severity": "<critical|major|minor|info>",
      "line": <行号整数，不适用时为 null>,
      "message": "<问题的清晰描述>",
      "suggestion": "<具体的修复建议或改进方案>"
    }
  ]
}

严重级别定义：
- critical : 阻断合并 —— 安全漏洞、数据丢失、程序崩溃、核心功能异常
- major    : 应当修复 —— 逻辑错误、重大设计缺陷、缺少错误处理
- minor    : 建议修复 —— 可读性、命名规范、代码风格、轻微性能问题
- info     : 观察意见 —— 值得关注的模式、可替代的实现方式

审查重点：
1. 正确性与逻辑 —— 错误、边界情况、差一错误、null/undefined 处理
2. 安全性 —— 注入攻击、鉴权绕过、敏感数据泄露、输入校验
3. 性能 —— O(n²) 循环、N+1 查询、不必要的重渲染、内存泄漏
4. 错误处理 —— 未处理的 Promise 拒绝、错误被吞掉、缺少 try/catch
5. 代码质量 —— 可读性、命名规范、DRY 原则违反、过高复杂度
6. 最佳实践 —— SOLID 原则、框架约定、类型安全

请勿用 markdown 代码块包裹结果，直接返回原始 JSON。`;

/** 汇总节点系统提示词 */
const AGGREGATE_SYSTEM_PROMPT = `你是一位资深技术负责人，正在为一个 Pull Request 撰写最终审查报告。

请根据各文件的审查结果，用 **Markdown 格式**综合生成完整的 PR 审查报告。

请严格使用以下结构：

# PR 审查报告

## 总结
[2-3 句话描述本次 PR 的内容及整体评估]

## 评分：{N}/100
[一句话解释此评分的依据]

## 严重问题
[列表 —— 如无则写"无"]

## 重要问题
[列表 —— 如无则写"无"]

## 轻微问题与建议
[列表 —— 如无则写"无"]

## 亮点
[本次 PR 中做得好的地方]

## 文件明细
[每个审查文件一条，注明文件路径和简要说明]

---
*AI 代码审查 —— 合并前请仔细评估所有建议*

请保持建设性、具体的语气，在相关处注明文件路径和行号。`;

// ─────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────

/**
 * 将 FileDiff 格式化为带行号的 diff 文本，供 LLM 理解
 * 保留 hunk header 以传达变更位置信息
 */
function formatDiffForPrompt(fileDiff: FileDiff): string {
  const filePath = fileDiff.to ?? fileDiff.from ?? 'unknown';
  const lines: string[] = [
    `File: ${filePath}`,
    `Changes: +${fileDiff.additions} additions, -${fileDiff.deletions} deletions`,
  ];

  if (fileDiff.isNew) lines.push('Status: New file');
  if (fileDiff.isDeleted) lines.push('Status: Deleted file');
  lines.push('');

  for (const hunk of fileDiff.hunks) {
    // hunk 头部帮助 LLM 定位变更在文件中的位置
    lines.push(
      `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`,
    );
    for (const line of hunk.lines) {
      const prefix =
        line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' ';
      const lineNum =
        line.lineNumber != null ? String(line.lineNumber).padStart(4) : '    ';
      lines.push(`${lineNum} ${prefix} ${line.content}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * 解析 LLM 返回的 JSON 字符串
 * 兼容带 markdown 代码块的响应和裸 JSON
 */
function parseJsonResponse(raw: string): Record<string, unknown> | null {
  // 尝试提取 ```json ... ``` 块
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1] : raw;

  // 提取第一个完整 JSON 对象
  const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (!objectMatch) return null;

  try {
    return JSON.parse(objectMatch[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * LLM 汇总调用失败时，程序化生成降级 Markdown 报告
 * 确保工作流始终返回可读结果
 */
function buildFallbackMarkdown(
  fileReviews: FileReviewResult[],
  prInfo?: PrInfo,
): string {
  const avgScore =
    fileReviews.length > 0
      ? Math.round(
          fileReviews.reduce((s, r) => s + r.score, 0) / fileReviews.length,
        )
      : 0;

  const lines: string[] = ['# PR 审查报告'];

  if (prInfo) {
    lines.push(
      `\n**PR：** ${prInfo.title}  `,
      `**作者：** ${prInfo.author}  `,
      `**分支：** \`${prInfo.sourceBranch}\` → \`${prInfo.targetBranch}\``,
    );
  }

  lines.push(`\n## 评分：${avgScore}/100\n`);

  const bySeverity = (sev: FileIssue['severity']) =>
    fileReviews.flatMap((r) => r.issues.filter((i) => i.severity === sev));

  const renderIssues = (issues: FileIssue[]) =>
    issues.length === 0
      ? ['无']
      : issues.map(
          (i) =>
            `- **第 ${i.line ?? 'N/A'} 行**：${i.message}` +
            (i.suggestion ? `\n  > ${i.suggestion}` : ''),
        );

  lines.push('## 严重问题', ...renderIssues(bySeverity('critical')), '');
  lines.push('## 重要问题', ...renderIssues(bySeverity('major')), '');
  lines.push('## 轻微问题与建议', ...renderIssues(bySeverity('minor')), '');

  lines.push('## 文件明细');
  for (const r of fileReviews) {
    lines.push(`- **${r.filePath}** (${r.score}/100)：${r.summary}`);
  }

  lines.push('\n---\n*AI 代码审查 —— 合并前请仔细评估所有建议*');
  return lines.join('\n');
}

// ─────────────────────────────────────────────
// 图节点实现
// ─────────────────────────────────────────────

/**
 * 节点1: fetchFileContexts
 * 通过 GitHub API 拉取每个修改文件的完整内容作为 LLM 上下文
 * 截断到 200 行以防 token 超限；失败时静默跳过，不影响 review 流程
 */
async function fetchFileContextsNode(
  state: ReviewState,
  githubContext?: GithubContext,
): Promise<Partial<ReviewState>> {
  if (!githubContext) return { fileContexts: {} };

  const { octokit, owner, repo, ref } = githubContext;
  const contexts: Record<string, string> = {};

  for (const fileDiff of state.fileDiffs) {
    // 删除的文件不需要拉取当前内容
    const filePath = fileDiff.to;
    if (!filePath || fileDiff.isDeleted) continue;

    try {
      const response = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref,
      });

      const data = response.data as { content?: string; encoding?: string };
      if (data.content && data.encoding === 'base64') {
        // GitHub API 返回的 base64 包含换行符，需去除后再解码
        const decoded = Buffer.from(
          data.content.replace(/\n/g, ''),
          'base64',
        ).toString('utf-8');
        const allLines = decoded.split('\n');
        // 超过 200 行时截断，避免单次请求 token 超限
        contexts[filePath] =
          allLines.length > 200
            ? allLines.slice(0, 200).join('\n') +
              '\n... (file truncated at 200 lines)'
            : decoded;
      }
    } catch {
      // 新文件 / 权限不足等情况静默跳过，不中断 review 流程
    }
  }

  return { fileContexts: contexts };
}

/**
 * 节点2: reviewEachFile
 * 逐文件构造 prompt → 调用 LLM → 解析 JSON 结果
 * 顺序执行以规避速率限制；单文件失败不影响其他文件
 */
async function reviewEachFileNode(
  state: ReviewState,
  llm: BaseChatModel,
  customSystemPrompt?: string | null,
): Promise<Partial<ReviewState>> {
  const fileReviews: FileReviewResult[] = [];
  const systemPrompt = FILE_REVIEW_SYSTEM_PROMPT;

  for (const fileDiff of state.fileDiffs) {
    const filePath = fileDiff.to ?? fileDiff.from ?? 'unknown';
    const diffText = formatDiffForPrompt(fileDiff);
    const fullFileContent = state.fileContexts[filePath];

    // ── 构建用户消息 ────────────────────────────
    const parts: string[] = [
      `Review the following code changes:\n\`\`\`diff\n${diffText}\n\`\`\``,
    ];

    if (fullFileContent) {
      // 完整文件内容帮助 LLM 理解变更在整个文件中的位置和作用
      parts.push(
        `\nFull file context (state after this PR's changes):\n\`\`\`\n${fullFileContent}\n\`\`\``,
      );
    }

    if (state.prInfo) {
      parts.push(
        `\nPR context:\n- Title: ${state.prInfo.title}\n- Author: ${state.prInfo.author}\n- Branch: \`${state.prInfo.sourceBranch}\` → \`${state.prInfo.targetBranch}\``,
      );
      if (state.prInfo.description) {
        parts.push(`- Description: ${state.prInfo.description}`);
      }
    }

    try {
      const response = await llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(customSystemPrompt?.trim() || ''),
        new HumanMessage(parts.join('\n')),
      ]);

      const raw = typeof response.content === 'string' ? response.content : '';
      const parsed = parseJsonResponse(raw);

      if (parsed) {
        const issues = (
          Array.isArray(parsed.issues) ? parsed.issues : []
        ) as FileIssue[];
        fileReviews.push({
          filePath,
          score: Math.max(0, Math.min(100, Number(parsed.score) || 80)),
          issues,
          summary: String(parsed.summary || ''),
        });
      } else {
        // JSON 解析失败时将原始响应作为 summary 保留
        fileReviews.push({
          filePath,
          score: 70,
          issues: [],
          summary: raw.slice(0, 500),
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      fileReviews.push({
        filePath,
        score: 50,
        issues: [{ severity: 'info', message: `Review failed: ${message}` }],
        summary: 'Could not generate review for this file due to an error.',
      });
    }
  }

  return { fileReviews };
}

/**
 * 节点3: aggregateReview
 * 将所有文件 review 结果送入 LLM，生成最终 Markdown 报告和综合评分
 * LLM 调用失败时降级为程序化 Markdown，确保工作流不中断
 */
async function aggregateReviewNode(
  state: ReviewState,
  llm: BaseChatModel,
): Promise<Partial<ReviewState>> {
  if (state.fileReviews.length === 0) {
    return {
      finalReview:
        '# PR Review\n\nNo reviewable files were found in this pull request.',
      score: 100,
    };
  }

  // 文件平均分，用于 LLM 调用失败时的降级评分
  const avgFileScore = Math.round(
    state.fileReviews.reduce((s, r) => s + r.score, 0) /
      state.fileReviews.length,
  );

  // ── 格式化各文件 review 供 LLM 汇总 ────────────
  const perFileText = state.fileReviews
    .map((r) => {
      const issueLines =
        r.issues.length > 0
          ? r.issues
              .map(
                (i) =>
                  `  - [${i.severity.toUpperCase()}] ${i.line != null ? `Line ${i.line}: ` : ''}${i.message}` +
                  (i.suggestion ? `\n    Fix: ${i.suggestion}` : ''),
              )
              .join('\n')
          : '  No issues found.';
      return `### ${r.filePath} (Score: ${r.score}/100)\n${r.summary}\n\nIssues:\n${issueLines}`;
    })
    .join('\n\n');

  const prHeader = state.prInfo
    ? `PR: "${state.prInfo.title}" by ${state.prInfo.author} (${state.prInfo.sourceBranch} → ${state.prInfo.targetBranch})\n\n`
    : '';

  const userMessage = `${prHeader}Per-file review results:\n\n${perFileText}\n\nPlease synthesize the final PR review.`;

  try {
    const response = await llm.invoke([
      new SystemMessage(AGGREGATE_SYSTEM_PROMPT),
      new HumanMessage(userMessage),
    ]);

    const content =
      typeof response.content === 'string' ? response.content : '';

    // 从 "## Score: N/100" 中提取综合评分
    const scoreMatch = content.match(/##\s*Score:\s*(\d+)/i);
    const extractedScore = scoreMatch ? parseInt(scoreMatch[1], 10) : null;

    return {
      finalReview: content,
      score: Math.max(0, Math.min(100, extractedScore ?? avgFileScore)),
    };
  } catch {
    // LLM 调用失败时降级
    return {
      finalReview: buildFallbackMarkdown(state.fileReviews, state.prInfo),
      score: avgFileScore,
    };
  }
}

// ─────────────────────────────────────────────
// 主导出函数
// ─────────────────────────────────────────────

/**
 * 运行 AI Code Review 工作流
 *
 * 使用 LangGraph StateGraph 编排三个节点：
 *   1. fetchFileContexts — 拉取完整文件内容（可选，需提供 githubContext）
 *   2. reviewEachFile    — 逐文件 LLM review，输出结构化 JSON
 *   3. aggregateReview  — 汇总生成最终 Markdown 报告 + 综合评分
 *
 * @param input 包含 fileDiffs、aiSettings、可选的 githubContext 和 prInfo
 * @returns 最终 Markdown 报告、综合评分和各文件 review 明细
 */
export async function runCodeReview(input: ReviewInput): Promise<ReviewOutput> {
  const llm = createLLM(input.aiSettings);
  const customSystemPrompt = input.aiSettings.systemPrompt;

  // 通过闭包将 llm、githubContext、systemPrompt 注入各节点
  const workflow = new StateGraph(ReviewStateAnnotation)
    .addNode('fetchFileContexts', (state) =>
      fetchFileContextsNode(state, input.githubContext),
    )
    .addNode('reviewEachFile', (state) =>
      reviewEachFileNode(state, llm, customSystemPrompt),
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
