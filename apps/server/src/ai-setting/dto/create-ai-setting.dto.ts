import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
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
  @IsEnum(AiProvider)
  provider: AiProvider;

  // API Key，敏感字段，存储时应加密
  @IsOptional()
  @IsString()
  apiKey: string;

  // 模型名称，如 claude-sonnet-4-6，必填
  @IsString()
  model: string;

  // 自定义提供商的接入地址，仅 provider=custom 时有效
  @IsOptional()
  @IsString()
  baseUrl?: string;

  // 生成温度，范围 0.0-2.0，默认 0.2
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  @ToNumber()
  temperature?: number;

  // 最大 token 数，范围 256-32768，默认 4096
  @IsOptional()
  @IsNumber()
  @Min(256)
  @Max(32768)
  @ToNumber()
  maxTokens?: number;

  // 系统提示词（Markdown / 纯文本均可）
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  // 自定义提供商名称，仅 provider=custom 时有效
  @IsOptional()
  @IsString()
  customName?: string;
}
