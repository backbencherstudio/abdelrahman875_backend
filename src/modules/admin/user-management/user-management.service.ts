import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import appConfig from '../../../config/app.config';

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

  async getAllCarriers(query?: { q?: string; status?: string }) {
    try {
      const whereCondition: any = {
        type: 'carrier',
      };

      if (query?.q) {
        whereCondition.OR = [
          { name: { contains: query.q, mode: 'insensitive' } },
          { email: { contains: query.q, mode: 'insensitive' } },
          { phone_number: { contains: query.q, mode: 'insensitive' } },
        ];
      }

      if (query?.status) {
        if (query.status === 'active') {
          whereCondition.status = 1;
        } else if (query.status === 'blocked') {
          whereCondition.status = 0;
        }
      }


      const carriers = await this.prisma.user.findMany({
        where: whereCondition,
        include: {
          profile: true,
          documents: {
            select: {
              type: true,
              file_url: true,
              file_name: true,
              status: true,
              reviewed_at: true,
              rejection_reason: true,
            },
          },
          vehicles: {
            select: {
              id: true,
              type: true,
              make: true,
              model: true,
              year: true,
              license_plate: true,
              capacity_kg: true,
              capacity_m3: true,
            },
          },
          _count: {
            select: {
              carrier_missions: true,
              received_reviews: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      // Add avatar URL to each carrier
      const carriersWithUrls = carriers.map((carrier) => ({
        ...carrier,
        avatar_url: carrier.avatar
          ? SojebStorage.url(appConfig().storageUrl.avatar + carrier.avatar)
          : null,
        documents: carrier.documents.map((doc) => ({
          ...doc,
          file_url: doc.file_url ? SojebStorage.url(appConfig().storageUrl.documents + doc.file_url) : null,
        })),
      }));

      return {
        success: true,
        data: carriersWithUrls,
        total: carriersWithUrls.length,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async getAllShippers(query?: { q?: string; status?: string }) {
    try {
      const whereCondition: any = {
        type: 'shipper',
      };

      if (query?.q) {
        whereCondition.OR = [
          { name: { contains: query.q, mode: 'insensitive' } },
          { email: { contains: query.q, mode: 'insensitive' } },
          { phone_number: { contains: query.q, mode: 'insensitive' } },
        ];
      }

      if (query?.status) {
        if (query.status === 'active') {
          whereCondition.status = 1;
        } else if (query.status === 'blocked') {
          whereCondition.status = 0;
        }
      }


      const shippers = await this.prisma.user.findMany({
        where: whereCondition,
        include: {
          profile: true,
          documents: {
            select: {
              type: true,
              file_url: true,
              file_name: true,
              status: true,
              reviewed_at: true,
              rejection_reason: true,
            },
          },
          _count: {
            select: {
              shipper_missions: true,
              received_reviews: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      // Add avatar URL to each shipper
      const shippersWithUrls = shippers.map((shipper) => ({
        ...shipper,
        avatar_url: shipper.avatar
          ? SojebStorage.url(appConfig().storageUrl.avatar + shipper.avatar)
          : null,
        documents: shipper.documents.map((doc) => ({
          ...doc,
          file_url: doc.file_url ? SojebStorage.url(appConfig().storageUrl.documents + doc.file_url) : null,
        })),
      }));

      return {
        success: true,
        data: shippersWithUrls,
        total: shippersWithUrls.length,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
