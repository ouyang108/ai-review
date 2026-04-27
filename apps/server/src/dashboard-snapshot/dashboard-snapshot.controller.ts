import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DashboardSnapshotService } from './dashboard-snapshot.service';

// 快照数据结构
const snapshotSchema = {
  type: 'object',
  properties: {
    id: { type: 'number', example: 1 },
    totalReviews: {
      type: 'number',
      description: '累计 PR 审查总数',
      example: 1248,
    },
    monthlyReviews: {
      type: 'number',
      description: '本月已完成审查数',
      example: 134,
    },
    passRate: { type: 'number', description: '通过率 0–100', example: 76.4 },
    avgScore: { type: 'number', description: '平均得分 0–100', example: 83.2 },
    pendingCount: {
      type: 'number',
      description: '当前待处理 PR 数',
      example: 23,
    },
    repoCount: {
      type: 'number',
      description: '已接入的活跃仓库数',
      example: 18,
    },
    scoreExcellent: {
      type: 'number',
      description: '优秀（90–100 分）的 PR 数',
      example: 312,
    },
    scoreGood: {
      type: 'number',
      description: '良好（75–89 分）的 PR 数',
      example: 481,
    },
    scoreFair: {
      type: 'number',
      description: '一般（60–74 分）的 PR 数',
      example: 274,
    },
    scorePoor: {
      type: 'number',
      description: '较差（< 60 分）的 PR 数',
      example: 181,
    },
    triggerWebhook: {
      type: 'number',
      description: 'GitHub Webhook 触发次数',
      example: 876,
    },
    triggerGitlabCi: {
      type: 'number',
      description: 'GitLab CI 触发次数',
      example: 243,
    },
    triggerManual: { type: 'number', description: '手动触发次数', example: 98 },
    triggerApi: {
      type: 'number',
      description: 'API 调用触发次数',
      example: 31,
    },
    snapshotAt: {
      type: 'string',
      format: 'date-time',
      description: '快照生成时间',
    },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

// 最近审查列表项结构
const recentReviewItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'number', example: 101 },
    repo: {
      type: 'string',
      description: '仓库全名',
      example: 'acme-corp/my-repo',
    },
    title: {
      type: 'string',
      description: 'PR 标题',
      example: 'feat: add login page',
    },
    status: {
      type: 'string',
      enum: ['passed', 'rejected', 'error'],
      description: '审查状态',
    },
    score: {
      type: 'number',
      nullable: true,
      description: '综合评分 0–100',
      example: 85,
    },
    reviewedAt: {
      type: 'string',
      format: 'date-time',
      description: '审查完成时间',
    },
  },
};

@ApiTags('仪表盘')
@Controller('dashboard')
export class DashboardSnapshotController {
  constructor(
    private readonly dashboardSnapshotService: DashboardSnapshotService,
  ) {}

  @Get()
  @ApiOperation({
    summary: '获取仪表盘快照',
    description:
      '返回缓存的统计快照（6 个统计卡片、质量分布、触发来源）。快照不存在时自动聚合生成。',
  })
  @ApiResponse({
    status: 200,
    description: '返回 DashboardSnapshot 记录',
    schema: {
      type: 'object',
      properties: { data: snapshotSchema },
    },
  })
  getSnapshot() {
    return this.dashboardSnapshotService.getSnapshot();
  }

  @Post('refresh')
  @ApiOperation({
    summary: '刷新仪表盘快照',
    description:
      '从 PullRequest / Repository 实时聚合所有统计数据并更新快照，返回最新快照。',
  })
  @ApiResponse({
    status: 200,
    description: '聚合完成，返回最新 DashboardSnapshot 记录',
    schema: {
      type: 'object',
      properties: { data: snapshotSchema },
    },
  })
  refreshSnapshot() {
    return this.dashboardSnapshotService.refreshSnapshot();
  }

  @Get('recent-reviews')
  @ApiOperation({
    summary: '最近审查列表',
    description: '返回最近完成审查的 PR 列表，用于 Home 页面活动表格',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '返回条数，默认 10，最大 50',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: '返回最近审查记录列表',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: recentReviewItemSchema,
        },
      },
    },
  })
  getRecentReviews(@Query('limit') limit?: string) {
    const take = Math.min(Number(limit) || 10, 50);
    return this.dashboardSnapshotService.getRecentReviews(take);
  }
}
