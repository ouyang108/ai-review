import parse from 'parse-diff';

/**
 * PR review 中不需要分析的文件匹配规则：
 * - 文档类：md、mdx、txt
 * - 依赖配置/锁文件：package.json、package-lock.json、yarn.lock、pnpm-lock.yaml、bun.lockb
 * - 二进制/媒体文件：图片、字体、视频、音频
 * - 构建产物：min.js、min.css、.map
 * - 测试快照：*.snap
 * - git 配置：.gitignore、.gitattributes
 * - 格式化/lint 规则：.prettierrc*、.eslintrc*、.editorconfig
 * - 自动生成文件：*.generated.ts、*.g.ts
 */
const EXCLUDED_PATTERNS = [
  /\.(md|mdx|txt)$/i,
  /^(package\.json|package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb)$/,
  /\.(png|jpg|jpeg|gif|svg|ico|webp|bmp|tiff|ttf|woff|woff2|eot|mp4|mp3|wav)$/i,
  /\.(min\.js|min\.css|js\.map|css\.map)$/i,
  /\.snap$/i,
  /^\.git(ignore|attributes)$/,
  /^\.prettier.*|^\.eslintrc.*|^\.editorconfig$/,
  /\.(generated|g)\.(ts|js|tsx|jsx)$/i,
];

/** 判断文件路径是否应被排除 */
function isExcluded(filePath: string | null | undefined): boolean {
  if (!filePath) return false;
  // 只取文件名部分进行匹配锁文件规则，完整路径用于扩展名规则
  const filename = filePath.split('/').pop() ?? filePath;
  return EXCLUDED_PATTERNS.some((pattern, index) =>
    // 第二条规则（锁文件）只匹配文件名，其余匹配完整路径
    index === 1 ? pattern.test(filename) : pattern.test(filePath),
  );
}

/** 单行变更信息 */
export interface DiffLine {
  type: 'add' | 'del' | 'normal'; // 行类型：新增、删除、上下文
  content: string; // 行内容（不含前缀符号）
  lineNumber?: number; // 行号（add/normal 取新文件行号，del 取旧文件行号）
}

/** 单个 hunk（变更块）信息 */
export interface DiffHunk {
  oldStart: number; // 旧文件起始行号
  oldLines: number; // 旧文件影响行数
  newStart: number; // 新文件起始行号
  newLines: number; // 新文件影响行数
  lines: DiffLine[]; // 该块内的所有行
}

/** 单个文件的 diff 信息 */
export interface FileDiff {
  from: string | null; // 旧文件路径（新增文件为 null）
  to: string | null; // 新文件路径（删除文件为 null）
  isNew: boolean; // 是否为新增文件
  isDeleted: boolean; // 是否为删除文件
  additions: number; // 新增行数
  deletions: number; // 删除行数
  hunks: DiffHunk[]; // 变更块列表
}

/**
 * 将 unified diff 字符串解析为结构化 JSON 对象
 * @param diff - unified diff 格式的字符串
 * @returns 结构化的文件变更数组
 */
export function parseDiff(diff: string): FileDiff[] {
  const parsed = parse(diff);

  return parsed
    .filter((file) => !isExcluded(file.to) && !isExcluded(file.from))
    .map((file) => {
      const hunks: DiffHunk[] = file.chunks.map((chunk) => {
        const lines: DiffLine[] = chunk.changes.map((change) => {
          if (change.type === 'add') {
            return {
              type: 'add',
              content: change.content.replace(/^\+/, ''), // 去除行首 + 号
              lineNumber: change.ln,
            };
          } else if (change.type === 'del') {
            return {
              type: 'del',
              content: change.content.replace(/^-/, ''), // 去除行首 - 号
              lineNumber: change.ln,
            };
          } else {
            return {
              type: 'normal',
              content: change.content.replace(/^ /, ''), // 去除行首空格
              lineNumber: change.ln2, // 上下文行取新文件行号
            };
          }
        });

        return {
          oldStart: chunk.oldStart,
          oldLines: chunk.oldLines,
          newStart: chunk.newStart,
          newLines: chunk.newLines,
          lines,
        };
      });

      return {
        from: file.from ?? null,
        to: file.to ?? null,
        isNew: file.new ?? false,
        isDeleted: file.deleted ?? false,
        additions: file.additions,
        deletions: file.deletions,
        hunks,
      };
    });
}
