import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiSettingModule } from './ai-setting/ai-setting.module';
import { PrismaModule } from './prisma/prisma.module';
import { GithubModule } from './github/github.module';
import { DashboardSnapshotModule } from './dashboard-snapshot/dashboard-snapshot.module';
import { RepositoriesModule } from './repositories/repositories.module';
@Module({
  imports: [
    PrismaModule,
    AiSettingModule,
    GithubModule,
    DashboardSnapshotModule,
    RepositoriesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
