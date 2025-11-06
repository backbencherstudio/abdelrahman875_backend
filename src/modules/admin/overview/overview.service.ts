import { Injectable } from '@nestjs/common';
import { MissionStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  format,
} from 'date-fns';

type Period = 'week' | 'month' | 'year';

@Injectable()
export class DashboardOverviewService {
  constructor(private prisma: PrismaService) {}

  async getOverview(period: Period = 'week') {
    // Total users & breakdown by type
    const totalUsers = await this.prisma.user.count();
    const usersByType = await this.prisma.user.groupBy({
      by: ['type'],
      _count: { id: true },
    });
    const totalShippers =
      usersByType.find((u) => u.type === 'shipper')?._count.id || 0;
    const totalCarriers =
      usersByType.find((u) => u.type === 'carrier')?._count.id || 0;

    const totalPendingUsers = await this.prisma.user.count({
      where: { application_status: 'PENDING' },
    });

    const totalOngoingMissions = await this.prisma.mission.count({
      where: { status: { in: ['ACCEPTED', 'IN_TRANSIT'] } },
    });

    const totalTransactions = await this.prisma.paymentTransaction.count();

    const totalMissions = await this.prisma.mission.count({
      where: { status: MissionStatus.COMPLETED },
    });

    const totalAmount = await this.prisma.paymentTransaction.aggregate({
      _sum: { amount: true },
    });

    // Date range for mission ovulation
    let startDate: Date, endDate: Date;
    const today = new Date();
    switch (period) {
      case 'week':
        startDate = startOfWeek(today, { weekStartsOn: 1 });
        endDate = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case 'month':
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
        break;
      case 'year':
        startDate = startOfYear(today);
        endDate = endOfYear(today);
        break;
      default:
        startDate = startOfWeek(today);
        endDate = endOfWeek(today);
    }

    // Completed missions in the period
    const missions = await this.prisma.mission.groupBy({
      by: ['created_at'],
      where: {
        status: MissionStatus.COMPLETED,
        created_at: { gte: startDate, lte: endDate },
      },
      _count: { id: true },
    });

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const labels = days.map((d) => format(d, 'EEE'));
    const data = days.map((d) => {
      const dayMission = missions.find(
        (m) => format(m.created_at, 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd'),
      );
      return dayMission?._count?.id || 0;
    });

    return {
      success: true,
      message: 'Dashboard overview fetched successfully',
      data: {
        stats: {
          totalUsers,
          totalShippers,
          totalCarriers,
          totalPendingUsers,
          totalOngoingMissions,
          totalTransactions,
        },
        performance: {
          totalCompletedMissions: totalMissions,
          commissions:
            Number(totalAmount._sum.amount) > 0 ? totalAmount._sum.amount : 0,
        },
        missionOvulation: {
          labels,
          data,
        },
      },
    };
  }
}
