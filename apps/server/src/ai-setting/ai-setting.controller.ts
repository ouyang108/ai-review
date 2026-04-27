import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AiSettingService } from './ai-setting.service';
import { CreateAiSettingDto } from './dto/create-ai-setting.dto';
import { UpdateAiSettingDto } from './dto/update-ai-setting.dto';

// AiSettings 记录的完整返回结构
const aiSettingsSchema = {
  type: 'object',
  properties: {
    id: { type: 'number', example: 1 },
    provider: {
      type: 'string',
      enum: ['openai', 'anthropic', 'deepseek', 'custom'],
      example: 'deepseek',
    },
    apiKey: { type: 'string', example: 'sk-xxxx', nullable: true },
    model: { type: 'string', example: 'deepseek-chat' },
    baseUrl: {
      type: 'string',
      example: 'https://api.deepseek.com',
      nullable: true,
    },
    temperature: { type: 'number', example: 0.2 },
    maxTokens: { type: 'number', example: 4096 },
    systemPrompt: { type: 'string', nullable: true },
    customName: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

// 通用 data 包装
const dataWrap = (dataSchema: object) => ({
  schema: {
    type: 'object',
    properties: { data: dataSchema },
  },
});

@ApiTags('AI 配置')
@Controller('ai-setting')
export class AiSettingController {
  constructor(private readonly aiSettingService: AiSettingService) {}

  @Post()
  @ApiOperation({
    summary: '创建 AI 配置',
    description: '新增一条 AI 模型配置记录',
  })
  @ApiBody({ type: CreateAiSettingDto })
  @ApiResponse({
    status: 201,
    description: '创建成功，返回新建的 AiSettings 记录',
    ...dataWrap(aiSettingsSchema),
  })
  create(@Body() createAiSettingDto: CreateAiSettingDto) {
    return this.aiSettingService.create(createAiSettingDto);
  }

  @Get()
  @ApiOperation({
    summary: '查询 AI 配置',
    description: '返回数据库中第一条 AI 配置记录，不存在时 data 为 null',
  })
  @ApiResponse({
    status: 200,
    description: '返回 AiSettings 记录，不存在时 data 为 null',
    ...dataWrap({ ...aiSettingsSchema, nullable: true }),
  })
  findOne() {
    return this.aiSettingService.findOne();
  }

  @Patch(':id')
  @ApiOperation({
    summary: '更新 AI 配置',
    description: '按 ID 更新 AI 配置，记录不存在时返回 404',
  })
  @ApiParam({ name: 'id', description: 'AI 配置记录 ID', type: Number })
  @ApiBody({ type: UpdateAiSettingDto })
  @ApiResponse({
    status: 200,
    description: '更新成功，返回更新后的记录',
    ...dataWrap(aiSettingsSchema),
  })
  @ApiResponse({ status: 404, description: '配置记录不存在' })
  update(
    @Param('id') id: string,
    @Body() updateAiSettingDto: UpdateAiSettingDto,
  ) {
    return this.aiSettingService.update(+id, updateAiSettingDto);
  }
}
