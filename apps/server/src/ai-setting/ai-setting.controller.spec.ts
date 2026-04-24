import { Test, TestingModule } from '@nestjs/testing';
import { AiSettingController } from './ai-setting.controller';
import { AiSettingService } from './ai-setting.service';

describe('AiSettingController', () => {
  let controller: AiSettingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiSettingController],
      providers: [AiSettingService],
    }).compile();

    controller = module.get<AiSettingController>(AiSettingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
