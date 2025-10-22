// src/modules/application/review/review.controller.ts
import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dtos/create-review.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Request } from 'express';

@ApiTags('reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @ApiOperation({ summary: 'Create a new review' })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  @Post()
  async createReview(
    @Body() createReviewDto: CreateReviewDto,
    @Req() req: Request,
  ) {
    const userId = (req as any).user.id;
    return this.reviewService.createReview(createReviewDto, userId);
  }

  @ApiOperation({ summary: 'Get reviews for a specific user' })
  @ApiResponse({
    status: 200,
    description: 'User reviews retrieved successfully',
  })
  @Get('user/:userId')
  async getUserReviews(@Param('userId') userId: string) {
    return this.reviewService.getUserReviews(userId);
  }

  @ApiOperation({ summary: 'Get my reviews (sent and received)' })
  @ApiResponse({
    status: 200,
    description: 'My reviews retrieved successfully',
  })
  @Get('my-reviews')
  async getMyReviews(@Req() req: Request) {
    const userId = (req as any).user.id;
    return this.reviewService.getMyReviews(userId);
  }

  @ApiOperation({ summary: 'Get reviews for a specific mission' })
  @ApiResponse({
    status: 200,
    description: 'Mission reviews retrieved successfully',
  })
  @Get('mission/:missionId')
  async getMissionReviews(@Param('missionId') missionId: string) {
    return this.reviewService.getMissionReviews(missionId);
  }

  @ApiOperation({ summary: 'Update a review' })
  @ApiResponse({ status: 200, description: 'Review updated successfully' })
  @Put(':id')
  async updateReview(
    @Param('id') reviewId: string,
    @Body() updateData: { rating?: number; comment?: string },
    @Req() req: Request,
  ) {
    const userId = (req as any).user.id;
    return this.reviewService.updateReview(reviewId, updateData, userId);
  }

  @ApiOperation({ summary: 'Delete a review' })
  @ApiResponse({ status: 200, description: 'Review deleted successfully' })
  @Delete(':id')
  async deleteReview(@Param('id') reviewId: string, @Req() req: Request) {
    const userId = (req as any).user.id;
    return this.reviewService.deleteReview(reviewId, userId);
  }
}
