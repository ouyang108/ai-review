import { Injectable } from '@nestjs/common';
import { CreateGithubDto } from './dto/create-github.dto';
import { UpdateGithubDto } from './dto/update-github.dto';
import { GITHUB_HEADER_TYPE } from '../constant/githubHeaderType';
import { Octokit } from 'octokit';
import 'dotenv/config';
import { parseDiff } from '../langchain/parseDiff';

@Injectable()
export class GithubService {
  // 初始化 Octokit 实例，使用环境变量中的 GitHub Token 进行鉴权
  private readonly octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  async create(createGithubDto: any, headers: Record<string, string>) {
    console.log(headers['x-github-event']);
    if (GITHUB_HEADER_TYPE.includes(headers['x-github-event'])) {
      const { repository, pull_request } = createGithubDto;
      const owner = repository.owner.login;
      const repo = repository.name;
      const pull_number = pull_request.number;

      // 打印请求参数，方便排查 404 时确认值是否正确
      // console.log('请求 PR diff 参数:', { owner, repo, pull_number });
      // console.log('GITHUB_TOKEN 是否已设置:', !!process.env.GITHUB_TOKEN);

      try {
        // 使用 mediaType.format='diff' 让 octokit 正确处理 diff 格式响应
        const diffResponse = await this.octokit.rest.pulls.get({
          owner,
          repo,
          pull_number,
          mediaType: { format: 'diff' },
        });

        const diff = diffResponse.data as unknown as string;
        console.log('PR diff 获取成功，长度:', diff.length);
        return { data: parseDiff(diff) };
      } catch (error) {
        // 打印完整错误信息便于排查（status / message / request URL）
        console.error('获取 PR diff 失败:', {
          status: error.status,
          message: error.message,
          url: error.request?.url,
        });
        throw error;
      }
    }
    // 我需要处理的事件类型
    return { data: '处理' };
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
