import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ToNumber } from '../../common/decorators/to-number.decorator';

// AI 提供商枚举，与 Prisma schema 中的 AiProvider 保持一致
export enum AiProvider {
  openai = 'openai',
  anthropic = 'anthropic',
  deepseek = 'deepseek',
  custom = 'custom',
}

export class CreateAiSettingDto {
  // AI 模型提供商，必填
  @ApiProperty({
    description: 'AI 模型提供商',
    enum: AiProvider,
    example: AiProvider.deepseek,
  })
  @IsEnum(AiProvider)
  provider: AiProvider;

  // API Key，敏感字段，存储时应加密
  @ApiPropertyOptional({
    description: '对应提供商的 API Key，敏感字段存储时应加密',
    example: 'sk-xxxxxxxxxxxx',
  })
  @IsOptional()
  @IsString()
  apiKey: string;

  // 模型名称，如 claude-sonnet-4-6，必填
  @ApiProperty({
    description: '模型名称，如 claude-sonnet-4-6、deepseek-chat',
    example: 'deepseek-chat',
  })
  @IsString()
  model: string;

  // 自定义提供商的接入地址，仅 provider=custom 时有效
  @ApiPropertyOptional({
    description: '自定义提供商的接口基础地址，provider=custom 时必填',
    example: 'https://api.deepseek.com',
  })
  @IsOptional()
  @IsString()
  baseUrl?: string;

  // 生成温度，范围 0.0-2.0，默认 0.2
  @ApiPropertyOptional({
    description: '生成温度，范围 0.0–2.0，越高输出越随机',
    minimum: 0,
    maximum: 2,
    default: 0.2,
    example: 0.2,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  @ToNumber()
  temperature?: number;

  // 最大 token 数，范围 256-32768，默认 4096
  @ApiPropertyOptional({
    description: '单次推理最大输出 token 数，范围 256–32768',
    minimum: 256,
    maximum: 32768,
    default: 4096,
    example: 4096,
  })
  @IsOptional()
  @IsNumber()
  @Min(256)
  @Max(32768)
  @ToNumber()
  maxTokens?: number;

  // 系统提示词（Markdown / 纯文本均可）
  @ApiPropertyOptional({
    description: '自定义系统提示词，为空时使用内置审查提示词',
    example: '你是一位资深工程师，请严格审查代码安全性。',
  })
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  // 自定义提供商名称，仅 provider=custom 时有效
  @ApiPropertyOptional({
    description: '自定义提供商的展示名称，仅 provider=custom 时有效',
    example: 'My Private LLM',
  })
  @IsOptional()
  @IsString()
  customName?: string;
}
