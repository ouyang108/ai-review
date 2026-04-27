import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiHeaders,
} from '@nestjs/swagger';
import { GithubService } from './github.service';
import { UpdateGithubDto } from './dto/update-github.dto';
import { CreateGithubSettingDto } from './dto/create-githubSetting.dto';

// Webhook 请求体示例结构
const webhookBodySchema = {
  schema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        description: 'PR 动作类型',
        example: 'opened',
        enum: ['opened', 'synchronize', 'closed', 'reopened'],
      },
      pull_request: {
        type: 'object',
        description: 'PR 详情',
        properties: {
          number: { type: 'number', example: 42 },
          title: { type: 'string', example: 'feat: add login page' },
          state: { type: 'string', example: 'open' },
          body: { type: 'string', example: 'PR 描述内容' },
          head: {
            type: 'object',
            properties: {
              sha: { type: 'string', example: 'abc123def456' },
              ref: { type: 'string', example: 'feature/login' },
            },
          },
          base: {
            type: 'object',
            properties: {
              ref: { type: 'string', example: 'main' },
            },
          },
          user: {
            type: 'object',
            properties: {
              login: { type: 'string', example: 'octocat' },
            },
          },
        },
      },
      repository: {
        type: 'object',
        description: '仓库信息',
        properties: {
          name: { type: 'string', example: 'my-repo' },
          owner: {
            type: 'object',
            properties: {
              login: { type: 'string', example: 'acme-corp' },
            },
          },
        },
      },
    },
  },
};

// 通用成功响应包装结构
const dataWrapSchema = (dataSchema: object) => ({
  schema: {
    type: 'object',
    properties: {
      data: dataSchema,
    },
  },
});

// GithubSettings 数据结构
const githubSettingsSchema = {
  type: 'object',
  properties: {
    id: { type: 'number', example: 1 },
    token: { type: 'string', example: 'ghp_xxxxxxxxxxxx' },
    webhookSecret: { type: 'string', example: 'my-secret', nullable: true },
    defaultBranch: { type: 'string', example: 'main' },
    ignoredPaths: {
      type: 'string',
      example: 'dist/**\nnode_modules/**',
      nullable: true,
    },
    webhookUrl: {
      type: 'string',
      example: 'https://your-domain.com/api/v1/github',
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

@ApiTags('GitHub')
@Controller('github')
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  @Post()
  @ApiOperation({
    summary: '接收 GitHub Webhook 事件',
    description:
      '由 GitHub 推送 pull_request 事件时调用，触发 AI Code Review 流程',
  })
  @ApiHeaders([
    {
      name: 'x-github-event',
      description: 'GitHub 事件类型，如 pull_request',
      required: true,
    },
  ])
  @ApiBody(webhookBodySchema)
  @ApiResponse({
    status: 200,
    description: '事件已处理',
    ...dataWrapSchema({
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Markdown 格式的 AI 审查报告' },
        score: { type: 'number', description: '综合评分 0–100', example: 85 },
        fileReviews: {
          type: 'array',
          description: '各文件审查明细',
          items: {
            type: 'object',
            properties: {
              filePath: { type: 'string', example: 'src/app.ts' },
              score: { type: 'number', example: 90 },
              summary: { type: 'string', example: '变更逻辑清晰，无明显问题' },
              issues: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    severity: {
                      type: 'string',
                      enum: ['critical', 'major', 'minor', 'info'],
                    },
                    line: { type: 'number', nullable: true },
                    message: { type: 'string' },
                    suggestion: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    }),
  })
  create(
    @Body() createGithubDto: any,
    @Headers() headers: Record<string, string>,
  ) {
    return this.githubService.create(createGithubDto, headers);
  }

  @Get()
  @ApiOperation({ summary: '获取所有 GitHub 记录（占位）' })
  @ApiResponse({ status: 200, description: '返回占位字符串' })
  findAll() {
    return this.githubService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '按 ID 查询 GitHub 记录（占位）' })
  @ApiParam({ name: 'id', description: '记录 ID', type: Number })
  @ApiResponse({ status: 200, description: '返回占位字符串' })
  findOne(@Param('id') id: string) {
    return this.githubService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '按 ID 更新 GitHub 记录（占位）' })
  @ApiParam({ name: 'id', description: '记录 ID', type: Number })
  @ApiResponse({ status: 200, description: '返回占位字符串' })
  update(@Param('id') id: string, @Body() updateGithubDto: UpdateGithubDto) {
    return this.githubService.update(+id, updateGithubDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '按 ID 删除 GitHub 记录（占位）' })
  @ApiParam({ name: 'id', description: '记录 ID', type: Number })
  @ApiResponse({ status: 200, description: '返回占位字符串' })
  remove(@Param('id') id: string) {
    return this.githubService.remove(+id);
  }

  /**
   * 保存 GitHub 配置
   * @param createGithubSettingDto
   * @returns 保存结果
   */
  @Post('setting/config')
  @ApiOperation({
    summary: '保存 GitHub 配置',
    description: '全站唯一配置，存在则更新，不存在则创建',
  })
  @ApiBody({ type: CreateGithubSettingDto })
  @ApiResponse({
    status: 200,
    description: '配置成功',
    ...dataWrapSchema({ type: 'string', example: '配置成功' }),
  })
  config(@Body() createGithubSettingDto: CreateGithubSettingDto) {
    return this.githubService.config(createGithubSettingDto);
  }

  @Get('setting/config')
  @ApiOperation({
    summary: '查询 GitHub 配置',
    description: '返回全站唯一的 GitHub 配置记录',
  })
  @ApiResponse({
    status: 200,
    description: '返回 GithubSettings 记录，不存在时 data 为 null',
    ...dataWrapSchema({ ...githubSettingsSchema, nullable: true }),
  })
  getConfig() {
    console.log(111111111);
    return this.githubService.getConfig();
  }
}
