import { PartialType } from '@nestjs/mapped-types';
import { CreateGithubSettingDto } from './create-githubSetting.dto';

// 更新时所有字段均为可选
export class UpdateGithubSettingDto extends PartialType(
  CreateGithubSettingDto,
) {}
