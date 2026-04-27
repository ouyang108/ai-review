import { PartialType } from '@nestjs/swagger';
import { CreateDashboardSnapshotDto } from './create-dashboard-snapshot.dto';

export class UpdateDashboardSnapshotDto extends PartialType(
  CreateDashboardSnapshotDto,
) {}
