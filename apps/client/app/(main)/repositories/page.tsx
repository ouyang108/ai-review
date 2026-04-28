import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getRepositories, type RepositoryItem } from '@/lib/repositories';

/** 平台徽章样式 */
const platformClass: Record<string, string> = {
  github: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  gitlab: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
};

/** 格式化为 yyyy-MM-dd */
function formatDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default async function RepositoriesPage() {
  let repositories: RepositoryItem[] = [];

  try {
    const res = await getRepositories();
    repositories = res.data ?? [];
  } catch {
    // 接口不可用时展示空态
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* 页头 */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">仓库管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">已接入 AI 代码审查的代码仓库列表</p>
      </div>

      {/* 仓库表格 */}
      <Card>
        <CardHeader>
          <CardTitle>仓库列表</CardTitle>
          <CardDescription>共 {repositories.length} 个仓库</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>仓库</TableHead>
                <TableHead>平台</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">PR 数</TableHead>
                <TableHead className="text-right">接入时间</TableHead>
                <TableHead className="text-right">最近活动</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repositories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    暂无仓库，Webhook 触发后自动接入
                  </TableCell>
                </TableRow>
              ) : (
                repositories.map((repo) => (
                  <TableRow key={repo.id}>
                    {/* 仓库全名，点击跳转 GitHub/GitLab */}
                    <TableCell>
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-sm hover:underline"
                      >
                        {repo.fullName}
                      </a>
                    </TableCell>

                    {/* 平台徽章 */}
                    <TableCell>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          platformClass[repo.platform.toLowerCase()] ??
                          'bg-muted text-muted-foreground'
                        }`}
                      >
                        {repo.platform}
                      </span>
                    </TableCell>

                    {/* 启用/停用状态 */}
                    <TableCell>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          repo.isActive
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                            : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}
                      >
                        {repo.isActive ? '活跃' : '停用'}
                      </span>
                    </TableCell>

                    {/* PR 总数 */}
                    <TableCell className="text-right tabular-nums">{repo.prCount}</TableCell>

                    {/* 接入时间 */}
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {formatDate(repo.createdAt)}
                    </TableCell>

                    {/* 最近活动时间 */}
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {formatDate(repo.updatedAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
