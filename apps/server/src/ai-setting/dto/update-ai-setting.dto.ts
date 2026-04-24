import { PartialType } from '@nestjs/mapped-types';
import { CreateAiSettingDto } from './create-ai-setting.dto';

export class UpdateAiSettingDto extends PartialType(CreateAiSettingDto) {
  id: number;
}
