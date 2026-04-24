import { Test, TestingModule } from '@nestjs/testing';
import { AiSettingService } from './ai-setting.service';

describe('AiSettingService', () => {
  let service: AiSettingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiSettingService],
    }).compile();

    service = module.get<AiSettingService>(AiSettingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
