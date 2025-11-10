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

      whereCondition.NOT = { type: 'admin' };

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
            application_status: true,
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

  async getSingleUser(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          name: true,
          email: true,
          type: true,
          status: true,
          application_status: true,
          application_submitted_at: true,
          application_rejected_at: true,
          application_rejection_reason: true,
          phone_number: true,
          country: true,
          state: true,
          city: true,
          address: true,
          zip_code: true,
          gender: true,
          date_of_birth: true,
          avatar: true,
          fcm_token: true,
          platform: true,
          last_active: true,
          created_at: true,
          updated_at: true,
          // Relations
          profile: true,
          vehicles: {
            select: {
              id: true,
              type: true,
              make: true,
              model: true,
              year: true,
              license_plate: true,
              color: true,
              capacity_kg: true,
              capacity_m3: true,
              photos: true,
              created_at: true,
              updated_at: true,
            },
          },
          documents: {
            select: {
              id: true,
              type: true,
              file_url: true,
              file_name: true,
              status: true,
              reviewed_at: true,
              rejection_reason: true,
            },
          },
        },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // Map avatar URL
      const avatar_url = user.avatar
        ? SojebStorage.url(appConfig().storageUrl.avatar + user.avatar)
        : null;

      // Map document URLs
      const documents = (user.documents || []).map((doc) => ({
        ...doc,
        file_url: doc.file_url
          ? SojebStorage.url(appConfig().storageUrl.documents + doc.file_url)
          : null,
      }));

      return {
        success: true,
        message: 'User fetched successfully',
        data: {
          ...user,
          avatar_url,
          documents,
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
