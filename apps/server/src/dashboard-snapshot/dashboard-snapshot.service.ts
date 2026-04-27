import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardSnapshotService {
  constructor(private readonly prisma: PrismaService) {}

  // 获取快照，不存在时先聚合生成一条
  async getSnapshot() {
    const snapshot = await this.prisma.dashboardSnapshot.findFirst();
    if (!snapshot) {
      return this.refreshSnapshot();
    }
    return { data: snapshot };
  }

  // 从 PullRequest / Repository 实时聚合，更新（或初始化）快照
  async refreshSnapshot() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // ── 并行查询所有统计维度 ───────────────────────────
    const [
      totalReviews,
      monthlyReviews,
      passedCount,
      avgScoreResult,
      pendingCount,
      repoCount,
      scoreExcellent,
      scoreGood,
      scoreFair,
      scorePoor,
      triggerWebhook,
      triggerGitlabCi,
      triggerManual,
      triggerApi,
    ] = await Promise.all([
      // 累计已审查总数（passed + rejected + error）
      this.prisma.pullRequest.count({
        where: { status: { in: ['passed', 'rejected', 'error'] } },
      }),
      // 本月已完成审查数
      this.prisma.pullRequest.count({
        where: {
          status: { in: ['passed', 'rejected', 'error'] },
          updatedAt: { gte: startOfMonth },
        },
      }),
      // 通过数量，用于计算通过率
      this.prisma.pullRequest.count({ where: { status: 'passed' } }),
      // 平均得分（仅统计有分数的记录）
      this.prisma.pullRequest.aggregate({
        _avg: { score: true },
        where: { score: { not: null } },
      }),
      // 当前待处理数（pending + reviewing）
      this.prisma.pullRequest.count({
        where: { status: { in: ['pending', 'reviewing'] } },
      }),
      // 已接入的活跃仓库数
      this.prisma.repository.count({ where: { isActive: true } }),
      // 质量分布：优秀 90–100
      this.prisma.pullRequest.count({
        where: { score: { gte: 90 } },
      }),
      // 质量分布：良好 75–89
      this.prisma.pullRequest.count({
        where: { score: { gte: 75, lt: 90 } },
      }),
      // 质量分布：一般 60–74
      this.prisma.pullRequest.count({
        where: { score: { gte: 60, lt: 75 } },
      }),
      // 质量分布：较差 < 60
      this.prisma.pullRequest.count({
        where: { score: { lt: 60 } },
      }),
      // 触发来源：GitHub Webhook
      this.prisma.pullRequest.count({
        where: { triggerSource: 'github_webhook' },
      }),
      // 触发来源：GitLab CI
      this.prisma.pullRequest.count({
        where: { triggerSource: 'gitlab_ci' },
      }),
      // 触发来源：手动触发
      this.prisma.pullRequest.count({ where: { triggerSource: 'manual' } }),
      // 触发来源：API 调用
      this.prisma.pullRequest.count({ where: { triggerSource: 'api' } }),
    ]);

    // 通过率：passed / (passed + rejected + error)，无数据时为 0
    const passRate =
      totalReviews > 0
        ? Math.round((passedCount / totalReviews) * 1000) / 10
        : 0;

    const avgScore = Math.round((avgScoreResult._avg.score ?? 0) * 10) / 10;

    const data = {
      totalReviews,
      monthlyReviews,
      passRate,
      avgScore,
      pendingCount,
      repoCount,
      scoreExcellent,
      scoreGood,
      scoreFair,
      scorePoor,
      triggerWebhook,
      triggerGitlabCi,
      triggerManual,
      triggerApi,
      snapshotAt: now,
    };

    // upsert：存在则更新，不存在则创建
    const existing = await this.prisma.dashboardSnapshot.findFirst();
    const snapshot = existing
      ? await this.prisma.dashboardSnapshot.update({
          where: { id: existing.id },
          data,
        })
      : await this.prisma.dashboardSnapshot.create({ data });

    return { data: snapshot };
  }

  // 最近审查列表，供 Home 页面活动表格使用
  async getRecentReviews(limit = 10) {
    const records = await this.prisma.pullRequest.findMany({
      take: limit,
      orderBy: { updatedAt: 'desc' },
      where: { status: { in: ['passed', 'rejected', 'error'] } },
      select: {
        id: true,
        title: true,
        status: true,
        score: true,
        updatedAt: true,
        // 关联查询仓库名
        repository: { select: { fullName: true } },
      },
    });

    return {
      data: records.map((r) => ({
        id: r.id,
        repo: r.repository.fullName,
        title: r.title,
        status: r.status,
        score: r.score,
        reviewedAt: r.updatedAt,
      })),
    };
  }
}
