import { Injectable } from '@nestjs/common';
import { CreateGithubDto } from './dto/create-github.dto';
import { UpdateGithubDto } from './dto/update-github.dto';
import { GITHUB_HEADER_TYPE } from '../constant/githubHeaderType';
import { Octokit } from 'octokit';
import 'dotenv/config';
import { parseDiff } from '../langchain/parseDiff';
import { runCodeReview } from '../langchain/review';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GithubService {
  constructor(private readonly prisma: PrismaService) {}
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

    // 2. 核心判断：只有在“新建 PR”或“更新代码”时才运行 AI Review
    // opened: 刚创建
    // synchronize: 开发者又 push 了新代码到该 PR
    if (action !== 'opened' && action !== 'synchronize') {
      return { data: `Action 是 ${action}，无需 Review` };
    }

    // 3. 再次确认状态必须是 open
    if (pull_request.state !== 'open') {
      return { data: 'PR 已关闭，跳过' };
    }
    const owner = repository.owner.login;
    const repo = repository.name;

    try {
      const diff = await this.getPrDiff(owner, repo, pull_request.number);
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

      // 将 AI review 报告作为评论发布到 PR
      await this.postPrComment(
        owner,
        repo,
        pull_request.number,
        result.content,
      );

      return { data: result };
    } catch (error) {
      console.error('获取 PR diff 失败:', {
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
