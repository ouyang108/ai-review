import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

/** 统计卡片数据类型 */
interface StatCard {
  title: string
  value: string | number
  description: string
  /** 相比上期的变化描述，如 "+12%" */
  trend?: string
  /** 趋势方向：up=正向 down=负向 neutral=中性 */
  trendDir?: "up" | "down" | "neutral"
}

/** 最近活动记录类型 */
interface ActivityItem {
  id: number
  repo: string
  pr: string
  status: "通过" | "拒绝" | "待审"
  score: number
  time: string
}

/** 顶部统计指标：仅展示静态 mock 数据，后续对接真实 API 时替换 */
const stats: StatCard[] = [
  {
    title: "总审查次数",
    value: 1_248,
    description: "累计完成的 PR 审查数量",
    trend: "+18%",
    trendDir: "up",
  },
  {
    title: "本月审查",
    value: 134,
    description: "本月已完成审查",
    trend: "+6%",
    trendDir: "up",
  },
  {
    title: "通过率",
    value: "76.4%",
    description: "审查结果为通过的占比",
    trend: "-2.1%",
    trendDir: "down",
  },
  {
    title: "平均得分",
    value: "83.2",
    description: "所有 PR 审查的平均质量分",
    trend: "+1.4",
    trendDir: "up",
  },
  {
    title: "待处理",
    value: 23,
    description: "尚未完成审查的 PR",
    trend: "较昨日 +5",
    trendDir: "neutral",
  },
  {
    title: "接入仓库",
    value: 18,
    description: "已配置 AI 审查的代码仓库数",
    trend: "+2 本月",
    trendDir: "up",
  },
]

/** 最近审查活动 mock 数据 */
const recentActivity: ActivityItem[] = [
  { id: 1, repo: "acme/frontend", pr: "feat: 新增用户中心页面", status: "通过", score: 91, time: "10 分钟前" },
  { id: 2, repo: "acme/backend", pr: "fix: 修复登录接口鉴权漏洞", status: "拒绝", score: 42, time: "32 分钟前" },
  { id: 3, repo: "acme/mobile", pr: "refactor: 重构支付模块", status: "通过", score: 85, time: "1 小时前" },
  { id: 4, repo: "acme/infra", pr: "chore: 升级 CI 依赖", status: "待审", score: 0, time: "2 小时前" },
  { id: 5, repo: "acme/frontend", pr: "style: 统一组件样式规范", status: "通过", score: 78, time: "3 小时前" },
]

/** 状态徽章颜色映射 */
const statusClass: Record<ActivityItem["status"], string> = {
  通过: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  拒绝: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  待审: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
}

/** 趋势文字颜色 */
const trendClass: Record<NonNullable<StatCard["trendDir"]>, string> = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-red-500 dark:text-red-400",
  neutral: "text-muted-foreground",
}

export default function HomePage() {
  return (
    <div className="flex flex-col gap-8 p-6">
      {/* 页头 */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">仪表盘</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI 代码审查平台概览 · 数据截至今日
        </p>
      </div>

      {/* 统计卡片区：6 个指标，两行排列 */}
      <section aria-label="统计指标">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader>
                <CardDescription>{stat.title}</CardDescription>
                {/* 数值放在 Title 里保持层级清晰 */}
                <CardTitle className="text-3xl font-bold tabular-nums">
                  {stat.value}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
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
                {recentActivity.map((item) => (
                  <TableRow key={item.id}>
                    {/* 仓库名使用等宽字体区分 */}
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {item.repo}
                    </TableCell>
                    <TableCell className="max-w-60 truncate">{item.pr}</TableCell>
                    <TableCell>
                      {/* 状态徽章 */}
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusClass[item.status]}`}
                      >
                        {item.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {/* 待审状态无得分 */}
                      {item.status === "待审" ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        item.score
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {item.time}
                    </TableCell>
                  </TableRow>
                ))}
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
              {[
                { label: "优秀 (90–100)", count: 312, color: "bg-emerald-500" },
                { label: "良好 (75–89)", count: 481, color: "bg-blue-500" },
                { label: "一般 (60–74)", count: 274, color: "bg-amber-400" },
                { label: "较差 (< 60)", count: 181, color: "bg-red-500" },
              ].map((row) => {
                /* 以总量 1248 计算进度条宽度百分比 */
                const pct = Math.round((row.count / 1248) * 100)
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
                )
              })}
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
              {[
                { label: "GitHub Webhook", count: 876, color: "bg-violet-500" },
                { label: "GitLab CI", count: 243, color: "bg-orange-400" },
                { label: "手动触发", count: 98, color: "bg-sky-500" },
                { label: "API 调用", count: 31, color: "bg-pink-500" },
              ].map((row) => {
                const pct = Math.round((row.count / 1248) * 100)
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
                )
              })}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
