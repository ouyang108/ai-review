import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getDashboardSnapshot,
  getRecentReviews,
  type DashboardSnapshot,
  type RecentReviewItem,
} from '@/lib/home';

/** 统计卡片数据类型 */
interface StatCard {
  title: string;
  value: string | number;
  description: string;
}

/** 审查状态中文映射 */
const STATUS_LABEL: Record<RecentReviewItem['status'], string> = {
  passed: '通过',
  rejected: '拒绝',
  error: '错误',
};

/** 状态徽章颜色 */
const statusClass: Record<RecentReviewItem['status'], string> = {
  passed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  error: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
};

/** 将快照字段组装为统计卡片列表 */
function buildStats(s: DashboardSnapshot): StatCard[] {
  return [
    { title: '总审查次数', value: s.totalReviews, description: '累计完成的 PR 审查数量' },
    { title: '本月审查', value: s.monthlyReviews, description: '本月已完成审查' },
    { title: '通过率', value: `${s.passRate}%`, description: '审查结果为通过的占比' },
    { title: '平均得分', value: s.avgScore, description: '所有 PR 审查的平均质量分' },
    { title: '待处理', value: s.pendingCount, description: '尚未完成审查的 PR' },
    { title: '接入仓库', value: s.repoCount, description: '已配置 AI 审查的代码仓库数' },
  ];
}

/** 将 ISO 时间字符串转为相对时间描述 */
function timeAgo(isoStr: string): string {
  const diffMs = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

export default async function HomePage() {
  // 并行请求快照和最近审查列表
  const [snapshotRes, reviewsRes] = await Promise.allSettled([
    getDashboardSnapshot(),
    getRecentReviews(5),
  ]);

  const snapshot = snapshotRes.status === 'fulfilled' ? snapshotRes.value.data : null;
  const recentReviews = reviewsRes.status === 'fulfilled' ? reviewsRes.value.data : [];

  const stats = snapshot ? buildStats(snapshot) : [];
  const total = snapshot?.totalReviews ?? 1;

  return (
    <div className="flex flex-col gap-8 p-6">
      {/* 页头 */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">仪表盘</h1>
        <p className="mt-1 text-sm text-muted-foreground">AI 代码审查平台概览 · 数据截至今日</p>
      </div>

      {/* 统计卡片区：6 个指标 */}
      <section aria-label="统计指标">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader>
                <CardDescription>{stat.title}</CardDescription>
                <CardTitle className="text-3xl font-bold tabular-nums">{stat.value}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                <span>{stat.description}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 最近审查活动 */}
      <section aria-label="最近审查活动">
        <Card>
          <CardHeader>
            <CardTitle>最近审查活动</CardTitle>
            <CardDescription>最新 5 条 PR 审查记录</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>仓库</TableHead>
                  <TableHead>PR 标题</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">得分</TableHead>
                  <TableHead className="text-right">时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentReviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      暂无审查记录
                    </TableCell>
                  </TableRow>
                ) : (
                  recentReviews.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {item.repo}
                      </TableCell>
                      <TableCell className="max-w-60 truncate">{item.title}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusClass[item.status]}`}
                        >
                          {STATUS_LABEL[item.status]}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.score == null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          item.score
                        )}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {timeAgo(item.reviewedAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {/* 底部辅助卡片：质量分布 + 审查来源 */}
      <section aria-label="辅助统计" className="grid gap-4 sm:grid-cols-2">
        {/* 质量分布 */}
        <Card>
          <CardHeader>
            <CardTitle>质量分布</CardTitle>
            <CardDescription>按得分区间统计 PR 数量</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {snapshot ? (
                [
                  {
                    label: '优秀 (90–100)',
                    count: snapshot.scoreExcellent,
                    color: 'bg-emerald-500',
                  },
                  { label: '良好 (75–89)', count: snapshot.scoreGood, color: 'bg-blue-500' },
                  { label: '一般 (60–74)', count: snapshot.scoreFair, color: 'bg-amber-400' },
                  { label: '较差 (< 60)', count: snapshot.scorePoor, color: 'bg-red-500' },
                ].map((row) => {
                  const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
                  return (
                    <li key={row.label} className="flex items-center gap-3 text-xs">
                      <span className="w-28 shrink-0 text-muted-foreground">{row.label}</span>
                      <div className="flex-1 overflow-hidden rounded-full bg-muted h-2">
                        <div
                          className={`h-full rounded-full ${row.color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right tabular-nums">{row.count}</span>
                    </li>
                  );
                })
              ) : (
                <li className="text-xs text-muted-foreground">暂无数据</li>
              )}
            </ul>
          </CardContent>
        </Card>

        {/* 审查触发来源 */}
        <Card>
          <CardHeader>
            <CardTitle>审查触发来源</CardTitle>
            <CardDescription>各触发方式的审查量占比</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {snapshot ? (
                [
                  {
                    label: 'GitHub Webhook',
                    count: snapshot.triggerWebhook,
                    color: 'bg-violet-500',
                  },
                  { label: 'GitLab CI', count: snapshot.triggerGitlabCi, color: 'bg-orange-400' },
                  { label: '手动触发', count: snapshot.triggerManual, color: 'bg-sky-500' },
                  { label: 'API 调用', count: snapshot.triggerApi, color: 'bg-pink-500' },
                ].map((row) => {
                  const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
                  return (
                    <li key={row.label} className="flex items-center gap-3 text-xs">
                      <span className="w-28 shrink-0 text-muted-foreground">{row.label}</span>
                      <div className="flex-1 overflow-hidden rounded-full bg-muted h-2">
                        <div
                          className={`h-full rounded-full ${row.color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right tabular-nums">{row.count}</span>
                    </li>
                  );
                })
              ) : (
                <li className="text-xs text-muted-foreground">暂无数据</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
