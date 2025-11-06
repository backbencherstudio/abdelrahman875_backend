import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import appConfig from '../../../config/app.config';
import { UserFilterDto } from './dto';

@Injectable()
export class UserManagementService {
  constructor(private prisma: PrismaService) {}

  async blockUser(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: { status: 0 }, // 0 = blocked, 1 = active
      });

      return {
        success: true,
        message: 'User blocked successfully',
        data: {
          userId,
          status: 'blocked',
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async unblockUser(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: { status: 1 }, // 1 = active
      });

      return {
        success: true,
        message: 'User unblocked successfully',
        data: {
          userId,
          status: 'active',
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async getAllUsers(query?: UserFilterDto) {
    try {
      const whereCondition: any = {};

      // Filter by type
      if (query?.type) {
        whereCondition.type = query.type;
      }

      // Filter by status
      if (query?.status) {
        if (query.status === 'active') whereCondition.status = 1;
        else if (query.status === 'blocked') whereCondition.status = 0;
      }

      // Search across name, email, phone_number
      if (query?.q) {
        whereCondition.OR = [
          { name: { contains: query.q, mode: 'insensitive' } },
          { email: { contains: query.q, mode: 'insensitive' } },
          { phone_number: { contains: query.q, mode: 'insensitive' } },
        ];
      }

      // Pagination defaults
      const page = query?.page ? Number(query.page) : 1;
      const limit = query?.limit ? Number(query.limit) : 10;
      const skip = (page - 1) * limit;

      // Run all Prisma queries concurrently
      const [users, totalUsers] = await Promise.all([
        this.prisma.user.findMany({
          where: whereCondition,
          skip,
          take: limit,
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            created_at: true,
            avatar: true,
          },
          orderBy: { created_at: 'desc' },
        }),
        this.prisma.user.count({ where: whereCondition }),
      ]);

      // Construct response
      return {
        success: true,
        message: 'Users fetched successfully',
        data: users,
        pagination: {
          total: totalUsers,
          currentPage: page,
          limit,
          totalPages: Math.ceil(totalUsers / limit),
          hasNextPage: page * limit < totalUsers,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
