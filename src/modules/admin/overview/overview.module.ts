import { Module } from '@nestjs/common';
import { DashboardOverviewController } from './overview.controller';
import { DashboardOverviewService } from './overview.service';

@Module({
  controllers: [DashboardOverviewController],
  providers: [DashboardOverviewService],
})
export class DashboardOverviewModule {}
