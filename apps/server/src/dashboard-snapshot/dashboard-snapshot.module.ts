import { Module } from '@nestjs/common';
import { DashboardSnapshotService } from './dashboard-snapshot.service';
import { DashboardSnapshotController } from './dashboard-snapshot.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DashboardSnapshotController],
  providers: [DashboardSnapshotService],
  exports: [DashboardSnapshotService],
})
export class DashboardSnapshotModule {}
