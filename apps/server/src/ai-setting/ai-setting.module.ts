import { Module } from '@nestjs/common';
import { AiSettingService } from './ai-setting.service';
import { AiSettingController } from './ai-setting.controller';

@Module({
  controllers: [AiSettingController],
  providers: [AiSettingService],
})
export class AiSettingModule {}
