import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { AiSettingService } from './ai-setting.service';
import { CreateAiSettingDto } from './dto/create-ai-setting.dto';
import { UpdateAiSettingDto } from './dto/update-ai-setting.dto';

@Controller('ai-setting')
export class AiSettingController {
  constructor(private readonly aiSettingService: AiSettingService) {}

  @Post()
  create(@Body() createAiSettingDto: CreateAiSettingDto) {
    return this.aiSettingService.create(createAiSettingDto);
  }

  @Get()
  findOne() {
    return this.aiSettingService.findOne();
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAiSettingDto: UpdateAiSettingDto,
  ) {
    return this.aiSettingService.update(+id, updateAiSettingDto);
  }
}
