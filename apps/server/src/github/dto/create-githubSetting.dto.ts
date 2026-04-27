import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGithubSettingDto {
  // Personal Access Token，必填，存储时应加密
  @ApiProperty({
    description: 'GitHub Personal Access Token，存储时应加密',
    example: 'ghp_xxxxxxxxxxxx',
  })
  @IsString()
  token: string;

  // Webhook 回调密钥，可选
  @ApiPropertyOptional({
    description: 'Webhook 回调密钥，用于验证 GitHub 推送请求的合法性',
    example: 'my-webhook-secret',
  })
  @IsOptional()
  @IsString()
  webhookSecret?: string;

  // 默认目标分支，不填时使用 schema 默认值 "main"
  @ApiPropertyOptional({
    description: '默认目标分支，新建仓库时作为 targetBranch 预填值',
    default: 'main',
    example: 'main',
  })
  @IsOptional()
  @IsString()
  defaultBranch?: string;

  // 忽略路径（glob 规则，换行分隔），可选
  @ApiPropertyOptional({
    description:
      '忽略路径规则（glob 格式，多条换行分隔），命中的文件跳过 AI 审查',
    example: 'dist/**\nnode_modules/**',
  })
  @IsOptional()
  @IsString()
  ignoredPaths?: string;

  // Webhook 接收地址
  @ApiPropertyOptional({
    description: 'Webhook 接收地址，注册到 GitHub 时填写',
    example: 'https://your-domain.com/api/v1/github',
  })
  @IsOptional()
  @IsString()
  webhookUrl: string;
}
