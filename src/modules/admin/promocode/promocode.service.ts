import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePromoCodeDto } from './dto/create-promocode.dto';
import { UpdatePromoCodeDto } from './dto/update-promocode.dto';
import { AssignPromoCodeDto } from './dto/assign-promocode.dto';
import { PromoCodeResponseDto } from './dto/promocode-response.dto';
import { DiscountType } from '@prisma/client';

@Injectable()
export class PromoCodeService {
  constructor(private prisma: PrismaService) {}

  async create(
    createPromoCodeDto: CreatePromoCodeDto,
  ): Promise<{
    success: boolean;
    data?: PromoCodeResponseDto;
    message: string;
  }> {
    try {
      // Check if code already exists
      const existingCode = await this.prisma.promoCode.findUnique({
        where: { code: createPromoCodeDto.code },
      });

      if (existingCode) {
        return {
          success: false,
          message: 'Promo code already exists',
        };
      }

      // Validate discount value based on type
      if (createPromoCodeDto.discount_type === DiscountType.PERCENTAGE) {
        if (
          createPromoCodeDto.discount_value < 0 ||
          createPromoCodeDto.discount_value > 100
        ) {
          return {
            success: false,
            message: 'Percentage discount must be between 0 and 100',
          };
        }
      }

      // Validate dates
      const validFrom = new Date(createPromoCodeDto.valid_from);
      const validUntil = new Date(createPromoCodeDto.valid_until);

      if (validFrom >= validUntil) {
        return {
          success: false,
          message: 'Valid until date must be after valid from date',
        };
      }

      const promoCode = await this.prisma.promoCode.create({
        data: {
          ...createPromoCodeDto,
          valid_from: validFrom,
          valid_until: validUntil,
        },
      });

      return {
        success: true,
        data: this.formatPromoCodeResponse(promoCode),
        message: 'Promo code created successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findAll(query?: {
    q?: string;
    is_active?: string;
    discount_type?: string;
    page?: string;
    limit?: string;
  }): Promise<{
    success: boolean;
    data?: PromoCodeResponseDto[];
    total?: number;
    message: string;
  }> {
    try {
      const whereCondition: any = {};

      if (query?.q) {
        whereCondition.OR = [
          { code: { contains: query.q, mode: 'insensitive' } },
          { description: { contains: query.q, mode: 'insensitive' } },
        ];
      }

      if (query?.is_active !== undefined) {
        whereCondition.is_active = query.is_active === 'true';
      }

      if (query?.discount_type) {
        whereCondition.discount_type = query.discount_type;
      }

      const page = query?.page ? parseInt(query.page) : 1;
      const limit = query?.limit ? parseInt(query.limit) : 10;
      const skip = (page - 1) * limit;

      const [promoCodes, total] = await Promise.all([
        this.prisma.promoCode.findMany({
          where: whereCondition,
          orderBy: { created_at: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.promoCode.count({ where: whereCondition }),
      ]);

      const formattedPromoCodes = promoCodes.map((promoCode) =>
        this.formatPromoCodeResponse(promoCode),
      );

      return {
        success: true,
        data: formattedPromoCodes,
        total,
        message: 'Promo codes retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findOne(
    id: string,
  ): Promise<{
    success: boolean;
    data?: PromoCodeResponseDto;
    message: string;
  }> {
    try {
      const promoCode = await this.prisma.promoCode.findUnique({
        where: { id },
        include: {
          user_restrictions: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          usages: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              mission: {
                select: {
                  id: true,
                  pickup_address: true,
                  delivery_address: true,
                },
              },
            },
            orderBy: { created_at: 'desc' },
          },
        },
      });

      if (!promoCode) {
        return {
          success: false,
          message: 'Promo code not found',
        };
      }

      return {
        success: true,
        data: this.formatPromoCodeResponse(promoCode),
        message: 'Promo code retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async update(
    id: string,
    updatePromoCodeDto: UpdatePromoCodeDto,
  ): Promise<{
    success: boolean;
    data?: PromoCodeResponseDto;
    message: string;
  }> {
    try {
      const existingPromoCode = await this.prisma.promoCode.findUnique({
        where: { id },
      });

      if (!existingPromoCode) {
        return {
          success: false,
          message: 'Promo code not found',
        };
      }

      // Check if code already exists (excluding current record)
      if (updatePromoCodeDto.code) {
        const existingCode = await this.prisma.promoCode.findFirst({
          where: {
            code: updatePromoCodeDto.code,
            id: { not: id },
          },
        });

        if (existingCode) {
          return {
            success: false,
            message: 'Promo code already exists',
          };
        }
      }

      // Validate discount value based on type
      if (
        updatePromoCodeDto.discount_type === DiscountType.PERCENTAGE ||
        (updatePromoCodeDto.discount_type === undefined &&
          existingPromoCode.discount_type === DiscountType.PERCENTAGE)
      ) {
        const discountValue =
          updatePromoCodeDto.discount_value ?? existingPromoCode.discount_value;
        if (discountValue < 0 || discountValue > 100) {
          return {
            success: false,
            message: 'Percentage discount must be between 0 and 100',
          };
        }
      }

      // Validate dates if provided
      let validFrom = existingPromoCode.valid_from;
      let validUntil = existingPromoCode.valid_until;

      if (updatePromoCodeDto.valid_from) {
        validFrom = new Date(updatePromoCodeDto.valid_from);
      }
      if (updatePromoCodeDto.valid_until) {
        validUntil = new Date(updatePromoCodeDto.valid_until);
      }

      if (validFrom >= validUntil) {
        return {
          success: false,
          message: 'Valid until date must be after valid from date',
        };
      }

      const updateData: any = { ...updatePromoCodeDto };
      if (updatePromoCodeDto.valid_from) {
        updateData.valid_from = validFrom;
      }
      if (updatePromoCodeDto.valid_until) {
        updateData.valid_until = validUntil;
      }

      const promoCode = await this.prisma.promoCode.update({
        where: { id },
        data: updateData,
      });

      return {
        success: true,
        data: this.formatPromoCodeResponse(promoCode),
        message: 'Promo code updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const existingPromoCode = await this.prisma.promoCode.findUnique({
        where: { id },
      });

      if (!existingPromoCode) {
        return {
          success: false,
          message: 'Promo code not found',
        };
      }

      await this.prisma.promoCode.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Promo code deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async assignToUsers(
    assignPromoCodeDto: AssignPromoCodeDto,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const promoCode = await this.prisma.promoCode.findUnique({
        where: { id: assignPromoCodeDto.promo_code_id },
      });

      if (!promoCode) {
        return {
          success: false,
          message: 'Promo code not found',
        };
      }

      // Check if users exist
      const users = await this.prisma.user.findMany({
        where: { id: { in: assignPromoCodeDto.user_ids } },
      });

      if (users.length !== assignPromoCodeDto.user_ids.length) {
        return {
          success: false,
          message: 'Some users not found',
        };
      }

      // Create user-promo code relationships
      const userPromoCodes = assignPromoCodeDto.user_ids.map((userId) => ({
        user_id: userId,
        promo_code_id: assignPromoCodeDto.promo_code_id,
      }));

      await this.prisma.userPromoCode.createMany({
        data: userPromoCodes,
        skipDuplicates: true,
      });

      return {
        success: true,
        message: 'Promo code assigned to users successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async removeFromUsers(
    promoCodeId: string,
    userIds: string[],
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.prisma.userPromoCode.deleteMany({
        where: {
          promo_code_id: promoCodeId,
          user_id: { in: userIds },
        },
      });

      return {
        success: true,
        message: 'Promo code removed from users successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async toggleActive(
    id: string,
  ): Promise<{
    success: boolean;
    data?: PromoCodeResponseDto;
    message: string;
  }> {
    try {
      const promoCode = await this.prisma.promoCode.findUnique({
        where: { id },
      });

      if (!promoCode) {
        return {
          success: false,
          message: 'Promo code not found',
        };
      }

      const updatedPromoCode = await this.prisma.promoCode.update({
        where: { id },
        data: { is_active: !promoCode.is_active },
      });

      return {
        success: true,
        data: this.formatPromoCodeResponse(updatedPromoCode),
        message: `Promo code ${updatedPromoCode.is_active ? 'activated' : 'deactivated'} successfully`,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  private formatPromoCodeResponse(promoCode: any): PromoCodeResponseDto {
    const now = new Date();
    const isValid =
      promoCode.is_active &&
      now >= promoCode.valid_from &&
      now <= promoCode.valid_until;

    const remainingUses = promoCode.usage_limit
      ? Math.max(0, promoCode.usage_limit - promoCode.used_count)
      : null;

    return {
      id: promoCode.id,
      code: promoCode.code,
      description: promoCode.description,
      discount_type: promoCode.discount_type,
      discount_value: promoCode.discount_value,
      min_order_amount: promoCode.min_order_amount,
      max_discount: promoCode.max_discount,
      usage_limit: promoCode.usage_limit,
      used_count: promoCode.used_count,
      user_limit: promoCode.user_limit,
      valid_from: promoCode.valid_from,
      valid_until: promoCode.valid_until,
      is_active: promoCode.is_active,
      created_at: promoCode.created_at,
      updated_at: promoCode.updated_at,
      remaining_uses: remainingUses,
      is_valid: isValid,
    };
  }
}
