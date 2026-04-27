import { Injectable } from '@nestjs/common';
import { CreateGithubDto } from './dto/create-github.dto';
import { UpdateGithubDto } from './dto/update-github.dto';
import { GITHUB_HEADER_TYPE } from '../constant/githubHeaderType';
import { Octokit } from 'octokit';
import 'dotenv/config';
import { parseDiff } from '../langchain/parseDiff';
import { runCodeReview } from '../langchain/review';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGithubSettingDto } from './dto/create-githubSetting.dto';
import { DashboardSnapshotService } from '../dashboard-snapshot/dashboard-snapshot.service';

@Injectable()
export class GithubService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboardSnapshot: DashboardSnapshotService,
  ) {}

  // 初始化 Octokit 实例，使用环境变量中的 GitHub Token 进行鉴权
  private readonly octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });
  aiSettingsRepository: any;

  async create(createGithubDto: any, headers: Record<string, string>) {
    if (!GITHUB_HEADER_TYPE.includes(headers['x-github-event'])) {
      return { data: '处理' };
    }

    const { action, pull_request, repository } = createGithubDto;

    // 只有在"新建 PR"或"更新代码"时才运行 AI Review
    if (action !== 'opened' && action !== 'synchronize') {
      return { data: `Action 是 ${action}，无需 Review` };
    }

    if (pull_request.state !== 'open') {
      return { data: 'PR 已关闭，跳过' };
    }

    const owner = repository.owner.login;
    const repo = repository.name;
    const prNumber = pull_request.number as number;

    // upsert 仓库记录（以 fullName 为唯一键）
    const repoRecord = await this.prisma.repository.upsert({
      where: { fullName: `${owner}/${repo}` },
      update: {},
      create: {
        name: repo,
        owner,
        fullName: `${owner}/${repo}`,
        url: `https://github.com/${owner}/${repo}`,
        platform: 'github',
      },
    });

    // upsert PullRequest，先置为 reviewing 状态
    const prRecord = await this.prisma.pullRequest.upsert({
      where: {
        repositoryId_prNumber: { repositoryId: repoRecord.id, prNumber },
      },
      update: {
        status: 'reviewing',
        title: pull_request.title,
        author: pull_request.user.login,
        sourceBranch: pull_request.head.ref,
        targetBranch: pull_request.base.ref,
        prUrl: pull_request.html_url ?? null,
      },
      create: {
        repositoryId: repoRecord.id,
        prNumber,
        title: pull_request.title,
        author: pull_request.user.login,
        sourceBranch: pull_request.head.ref,
        targetBranch: pull_request.base.ref,
        prUrl: pull_request.html_url ?? null,
        status: 'reviewing',
        triggerSource: 'github_webhook',
      },
    });

    try {
      const diff = await this.getPrDiff(owner, repo, prNumber);
      const aiSettings = await this.getAiSettings();
      const result = await runCodeReview({
        fileDiffs: parseDiff(diff),
        aiSettings,
        githubContext: {
          octokit: this.octokit,
          owner,
          repo,
          ref: pull_request.head.sha,
        },
        prInfo: {
          title: pull_request.title,
          description: pull_request.body ?? '',
          author: pull_request.user.login,
          sourceBranch: pull_request.head.ref,
          targetBranch: pull_request.base.ref,
        },
      });

      // score >= 75 视为通过，否则拒绝
      const reviewStatus = result.score >= 75 ? 'passed' : 'rejected';

      // 并行：更新 PR 状态 + 写入 Review 记录
      await Promise.all([
        this.prisma.pullRequest.update({
          where: { id: prRecord.id },
          data: { status: reviewStatus, score: result.score },
        }),
        this.prisma.review.create({
          data: {
            pullRequestId: prRecord.id,
            aiProvider: aiSettings.provider,
            aiModel: aiSettings.model,
            content: result.content,
            score: result.score,
            status: reviewStatus,
          },
        }),
      ]);

      // 在报告顶部注明当前使用的 AI 模型，再发布到 PR
      // const commentBody = `> 🤖 Reviewed by **${aiSettings.provider}** (${aiSettings.model})\n\n${result.content}`;
      // await this.postPrComment(owner, repo, prNumber, commentBody);

      // 异步刷新仪表盘快照，不阻塞响应
      this.dashboardSnapshot
        .refreshSnapshot()
        .catch((err) => console.error('刷新仪表盘快照失败:', err));

      return { data: result };
    } catch (error) {
      // 审查失败时将 PR 状态和 Review 记录均置为 error
      await Promise.all([
        this.prisma.pullRequest.update({
          where: { id: prRecord.id },
          data: { status: 'error' },
        }),
        this.prisma.review.create({
          data: {
            pullRequestId: prRecord.id,
            aiProvider: '',
            aiModel: '',
            content: '',
            status: 'error',
            errorMessage: error?.message ?? String(error),
          },
        }),
      ]);

      this.dashboardSnapshot.refreshSnapshot().catch(() => {});

      console.error('AI Review 失败:', {
        status: error.status,
        message: error.message,
        url: error.request?.url,
      });
      throw error;
    }
  }

  // 获取 PR 的 diff 文本
  private async getPrDiff(
    owner: string,
    repo: string,
    pull_number: number,
  ): Promise<string> {
    const diffResponse = await this.octokit.rest.pulls.get({
      owner,
      repo,
      pull_number,
      mediaType: { format: 'diff' },
    });
    const diff = diffResponse.data as unknown as string;
    console.log('PR diff 获取成功，长度:', diff.length);
    return diff;
  }

  // 将评论内容发布到指定 PR（issue_number 与 pull_number 相同）
  private async postPrComment(
    owner: string,
    repo: string,
    issue_number: number,
    body: string,
  ): Promise<void> {
    await this.octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number,
      body,
    });
  }

  // 读取数据库中的 AI 配置，缺失字段使用默认值兜底
  private async getAiSettings() {
    const record = await this.prisma.aiSettings.findFirst().catch(() => null);
    return {
      provider: record?.provider ?? 'deepseek',
      apiKey: record?.apiKey ?? process.env.AI_API_KEY,
      model: record?.model ?? 'deepseek-chat',
      baseUrl: record?.baseUrl ?? 'https://api.deepseek.com',
      temperature: record?.temperature ?? 0.2,
      maxTokens: record?.maxTokens ?? 4096,
      systemPrompt: record?.systemPrompt ?? '',
    };
  }

  // 保存 GitHub 配置（全站唯一，存在则更新）
  async config(createGithubSettingDto: CreateGithubSettingDto) {
    const record = await this.prisma.githubSettings
      .findFirst()
      .catch(() => null);
    if (record) {
      await this.prisma.githubSettings.update({
        where: { id: record.id },
        data: createGithubSettingDto,
      });
    } else {
      await this.prisma.githubSettings.create({
        data: createGithubSettingDto,
      });
    }
    return { data: '配置成功' };
  }

  // 查询 GitHub 配置
  async getConfig() {
    console.log(213);
    const record = await this.prisma.githubSettings
      .findFirst()
      .catch((error) => {
        console.error('获取 GitHub 配置失败:', error);
        return null;
      });
    return { data: record };
  }

  findAll() {
    return `This action returns all github`;
  }

  findOne(id: number) {
    return `This action returns a #${id} github`;
  }

  update(id: number, updateGithubDto: UpdateGithubDto) {
    return `This action updates a #${id} github`;
  }

  remove(id: number) {
    return `This action removes a #${id} github`;
  }
}
