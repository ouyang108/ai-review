import { Module } from '@nestjs/common';
import { GithubService } from './github.service';
import { GithubController } from './github.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { DashboardSnapshotModule } from '../dashboard-snapshot/dashboard-snapshot.module';

@Module({
  imports: [PrismaModule, DashboardSnapshotModule],
  controllers: [GithubController],
  providers: [GithubService],
})
export class GithubModule {}
