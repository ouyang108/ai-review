import { Test, TestingModule } from '@nestjs/testing';
import { DashboardSnapshotController } from './dashboard-snapshot.controller';
import { DashboardSnapshotService } from './dashboard-snapshot.service';

describe('DashboardSnapshotController', () => {
  let controller: DashboardSnapshotController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardSnapshotController],
      providers: [DashboardSnapshotService],
    }).compile();

    controller = module.get<DashboardSnapshotController>(
      DashboardSnapshotController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
