import { Test, TestingModule } from '@nestjs/testing';
import { DashboardSnapshotService } from './dashboard-snapshot.service';

describe('DashboardSnapshotService', () => {
  let service: DashboardSnapshotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DashboardSnapshotService],
    }).compile();

    service = module.get<DashboardSnapshotService>(DashboardSnapshotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
