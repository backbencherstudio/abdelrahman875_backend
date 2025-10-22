import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReviewDto } from './dtos/create-review.dto';

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  // Common select fields to avoid repetition
  private readonly userSelect = {
    id: true,
    name: true,
    avatar: true,
    type: true,
  };

  private readonly missionSelect = {
    id: true,
    pickup_address: true,
    delivery_address: true,
    created_at: true,
  };

  private readonly reviewInclude = {
    author: { select: this.userSelect },
    target: { select: this.userSelect },
    mission: { select: this.missionSelect },
  };

  // Common response helper
  private createResponse(success: boolean, data?: any, message?: string) {
    return { success, ...(data && { data }), ...(message && { message }) };
  }

  // Common error response helper
  private createErrorResponse(message: string) {
    return this.createResponse(false, null, message);
  }

  // Helper method to transform review data for better readability
  private transformReviewData(reviews: any[] | any) {
    const transformSingleReview = (review: any) => {
      const { author, target, ...rest } = review;

      // Determine who is shipper and who is carrier
      const shipper = author.type === 'shipper' ? author : target;
      const carrier = author.type === 'carrier' ? author : target;

      return {
        ...rest,
        shipper,
        carrier,
      };
    };

    if (Array.isArray(reviews)) {
      return reviews.map(transformSingleReview);
    }

    return transformSingleReview(reviews);
  }

  // Helper method to validate review ownership
  private async validateReviewOwnership(reviewId: string, userId: string) {
    const review = await this.prisma.missionReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.author_id !== userId) {
      throw new BadRequestException('You can only modify your own reviews');
    }

    return review;
  }

  // Helper method to check if review can be updated (24-hour rule)
  private validateUpdateTimeLimit(review: any) {
    const reviewAge = Date.now() - review.created_at.getTime();
    const hoursSinceCreation = reviewAge / (1000 * 60 * 60);

    if (hoursSinceCreation > 24) {
      throw new BadRequestException(
        'Reviews can only be updated within 24 hours',
      );
    }
  }
  async getUserReviews(userId: string) {
    try {
      const reviews = await this.prisma.missionReview.findMany({
        where: { target_id: userId },
        include: this.reviewInclude,
        orderBy: { created_at: 'desc' },
      });

      const transformedReviews = this.transformReviewData(reviews);
      return this.createResponse(true, transformedReviews);
    } catch (error) {
      return this.createErrorResponse(error.message);
    }
  }

  async getMyReviews(userId: string) {
    try {
      const [sentReviews, receivedReviews] = await Promise.all([
        this.prisma.missionReview.findMany({
          where: { author_id: userId },
          include: this.reviewInclude,
          orderBy: { created_at: 'desc' },
        }),
        this.prisma.missionReview.findMany({
          where: { target_id: userId },
          include: this.reviewInclude,
          orderBy: { created_at: 'desc' },
        }),
      ]);

      const transformedSentReviews = this.transformReviewData(sentReviews);
      const transformedReceivedReviews =
        this.transformReviewData(receivedReviews);

      return this.createResponse(true, {
        sent: transformedSentReviews,
        received: transformedReceivedReviews,
      });
    } catch (error) {
      return this.createErrorResponse(error.message);
    }
  }

  async getMissionReviews(missionId: string) {
    try {
      const reviews = await this.prisma.missionReview.findMany({
        where: { mission_id: missionId },
        include: this.reviewInclude,
        orderBy: { created_at: 'desc' },
      });

      const transformedReviews = this.transformReviewData(reviews);
      return this.createResponse(true, transformedReviews);
    } catch (error) {
      return this.createErrorResponse(error.message);
    }
  }

  async updateReview(
    reviewId: string,
    updateData: { rating?: number; comment?: string },
    userId: string,
  ) {
    try {
      const review = await this.validateReviewOwnership(reviewId, userId);
      this.validateUpdateTimeLimit(review);

      const updatedReview = await this.prisma.missionReview.update({
        where: { id: reviewId },
        data: updateData,
        include: this.reviewInclude,
      });

      // Update target user's rating if rating changed
      if (updateData.rating && updateData.rating !== review.rating) {
        await this.updateUserRating(review.target_id);
      }

      const transformedReview = this.transformReviewData(updatedReview);
      return this.createResponse(
        true,
        transformedReview,
        'Review updated successfully',
      );
    } catch (error) {
      return this.createErrorResponse(error.message);
    }
  }

  async deleteReview(reviewId: string, userId: string) {
    try {
      const review = await this.validateReviewOwnership(reviewId, userId);

      await this.prisma.missionReview.delete({
        where: { id: reviewId },
      });

      // Update target user's rating
      await this.updateUserRating(review.target_id);

      return this.createResponse(true, null, 'Review deleted successfully');
    } catch (error) {
      return this.createErrorResponse(error.message);
    }
  }

  async createReview(createReviewDto: CreateReviewDto, authorId: string) {
    try {
      // 1. Validate mission exists and is completed
      const mission = await this.prisma.mission.findUnique({
        where: { id: createReviewDto.mission_id },
        include: { shipper: true, carrier: true },
      });

      if (!mission) {
        throw new NotFoundException('Mission not found');
      }

      if (mission.status !== 'COMPLETED') {
        throw new BadRequestException('Only review can completed missions');
      }

      // 2. Determine target (the other party)
      const targetId =
        mission.shipper_id === authorId
          ? mission.carrier_id
          : mission.shipper_id;

      if (!targetId) {
        throw new BadRequestException('Invalid mission participants');
      }

      // 3. Check if user already reviewed this mission
      const existingReview = await this.prisma.missionReview.findUnique({
        where: {
          author_id_mission_id: {
            author_id: authorId,
            mission_id: createReviewDto.mission_id,
          },
        },
      });

      if (existingReview) {
        throw new BadRequestException('You have already reviewed this mission');
      }

      // 4. Create review
      const review = await this.prisma.missionReview.create({
        data: {
          rating: createReviewDto.rating,
          comment: createReviewDto.comment,
          author_id: authorId,
          target_id: targetId,
          mission_id: createReviewDto.mission_id,
        },
        include: this.reviewInclude,
      });

      // 5. Update target user's average rating
      await this.updateUserRating(targetId);

      const transformedReview = this.transformReviewData(review);
      return this.createResponse(
        true,
        transformedReview,
        'Review created successfully',
      );
    } catch (error) {
      return this.createErrorResponse(error.message);
    }
  }

  // Helper method to update user rating
  private async updateUserRating(userId: string) {
    const reviews = await this.prisma.missionReview.findMany({
      where: { target_id: userId },
      select: { rating: true },
    });

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        average_rating: Math.round(averageRating * 100) / 100,
        total_reviews: reviews.length,
      },
    });
  }
}
