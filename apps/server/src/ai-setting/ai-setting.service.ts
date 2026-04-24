import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAiSettingDto } from './dto/create-ai-setting.dto';
import { UpdateAiSettingDto } from './dto/update-ai-setting.dto';

@Injectable()
export class AiSettingService {
  constructor(private readonly prisma: PrismaService) {}

  // 新增一条 AI 配置
  async create(createAiSettingDto: CreateAiSettingDto) {
    console.log(JSON.stringify(createAiSettingDto));
    return await this.prisma.aiSettings.create({
      data: createAiSettingDto,
    });
  }

  // 按 id 查询单条 AI 配置
  async findOne() {
    const record = await this.prisma.aiSettings.findFirst().catch(() => null);

    return { data: record };
  }

  // 按 id 更新 AI 配置，不存在则抛 404
  async update(id: number, updateAiSettingDto: UpdateAiSettingDto) {
    // 先确认记录存在，不存在时 findOne 内部会抛 404

    await this.findOne();
    return await this.prisma.aiSettings.update({
      where: { id },
      data: updateAiSettingDto,
    });
  }
}
