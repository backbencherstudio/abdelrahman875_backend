import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardOverviewService } from './overview.service';

@ApiTags('Dashboard Overview')
@Controller('admin/dashboard-overview')
export class DashboardOverviewController {
  constructor(private readonly dashboardService: DashboardOverviewService) {}

  @Get()
  @ApiOperation({ summary: 'Get dashboard overview statistics' })
  async getOverview() {
    return await this.dashboardService.getOverview();
  }
}
