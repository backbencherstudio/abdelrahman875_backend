import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  UseInterceptors,
  BadRequestException,
  Delete,
  ForbiddenException,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { MissionsService } from './missions.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { AcceptMissionDto } from './dto/accept-mission.dto';
import { SetPriceDto } from './dto/set-price.dto';
import { SelectCarrierDto } from './dto/select-carrier.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { ConfirmPickupDto } from './dto/pickup-mission.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TrackCarrierDto } from './dto/tracking.dto';

@ApiTags('missions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('missions')
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  @ApiOperation({ summary: 'Create a new mission' })
  @ApiResponse({ status: 201, description: 'Mission created successfully' })
  @Post()
  async createMission(
    @Body() createMissionDto: CreateMissionDto,
    @Req() req: Request,
  ) {
    const userId = (req as any).user.id;
    const userType = (req as any).user.type;

    // Only shippers can create missions
    if (userType !== 'shipper') {
      return {
        success: false,
        message: `Only shippers can create missions. Current user type: ${userType}`,
      };
    }

    return this.missionsService.createMission(createMissionDto, userId);
  }

  @ApiOperation({ summary: 'Get all missions (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'All missions retrieved successfully',
  })
  @Get('admin/all')
  async getAllMissions(@Req() req: Request) {
    const userType = (req as any).user?.type;

    // Only admins can access this endpoint
    if (userType !== 'admin') {
      return {
        success: false,
        message: 'Access denied: Admins only',
      };
    }

    const query = req.query;
    const missions = await this.missionsService.getAllMissions(query);

    return {
      success: true,
      message: 'All missions retrieved successfully',
      data: missions,
    };
  }

  @ApiOperation({ summary: 'Get available missions for carriers' })
  @ApiResponse({
    status: 200,
    description: 'Available missions retrieved successfully',
  })
  @Get('available')
  async getAvailableMissions(@Req() req: Request) {
    const userType = (req as any).user.type;

    // Only carriers can see available missions
    if (userType !== 'carrier') {
      return {
        success: false,
        message: 'Only carriers can view available missions',
      };
    }

    return this.missionsService.getAvailableMissions(req.query);
  }

  @ApiOperation({ summary: 'Get user missions' })
  @ApiResponse({
    status: 200,
    description: 'User missions retrieved successfully',
  })
  @Get('my-missions')
  async getMyMissions(@Req() req: Request) {
    const userId = (req as any).user.id;
    const userType = (req as any).user.type;

    return this.missionsService.getMyMissions(userId, userType);
  }

  @ApiOperation({ summary: 'Request for accept a mission' })
  @ApiResponse({ status: 200, description: 'Mission accepted successfully' })
  @Post(':id/send-req')
  async acceptMission(
    @Param('id') missionId: string,
    @Body() acceptMissionDto: AcceptMissionDto,
    @Req() req: Request,
  ) {
    const userId = (req as any).user.id;
    const userType = (req as any).user.type;

    // Only carriers can accept missions
    if (userType !== 'carrier') {
      return {
        success: false,
        message: 'Only carriers can accept missions',
      };
    }

    return this.missionsService.acceptMission(
      missionId,
      userId,
      acceptMissionDto,
    );
  }

  @ApiOperation({ summary: 'Get mission by ID' })
  @ApiResponse({ status: 200, description: 'Mission retrieved successfully' })
  @Get(':id')
  async getMissionById(@Param('id') missionId: string) {
    return this.missionsService.getMissionById(missionId);
  }

  @ApiOperation({ summary: 'Confirm payment for mission (Testing endpoint)' })
  @ApiResponse({ status: 200, description: 'Payment confirmed successfully' })
  @Post(':id/confirm-payment')
  async confirmPayment(@Param('id') missionId: string, @Req() req: Request) {
    const userId = (req as any).user.id;
    const userType = (req as any).user.type;

    // Only shippers can confirm payment for their missions
    if (userType !== 'shipper') {
      return {
        success: false,
        message: 'Only shippers can confirm payment',
      };
    }

    return this.missionsService.confirmPayment(missionId);
  }

  // ===== NEW ENHANCED MISSION FLOW ENDPOINTS =====

  @ApiOperation({ summary: 'Set or adjust mission price (Shipper only)' })
  @ApiResponse({
    status: 200,
    description: 'Mission price updated successfully',
  })
  @Post(':id/set-price')
  async setMissionPrice(
    @Param('id') missionId: string,
    @Body() setPriceDto: SetPriceDto,
    @Req() req: Request,
  ) {
    const shipperId = (req as any).user.id;
    const userType = (req as any).user.type;

    if (userType !== 'shipper') {
      return {
        success: false,
        message: 'Only shippers can set mission prices',
      };
    }

    return this.missionsService.setMissionPrice(
      missionId,
      setPriceDto.price,
      shipperId,
    );
  }

  @ApiOperation({
    summary: 'Confirm mission after price setting (Shipper only)',
  })
  @ApiResponse({ status: 200, description: 'Mission confirmed successfully' })
  @Post(':id/confirm')
  async confirmMission(@Param('id') missionId: string, @Req() req: Request) {
    const shipperId = (req as any).user.id;
    const userType = (req as any).user.type;

    if (userType !== 'shipper') {
      return {
        success: false,
        message: 'Only shippers can confirm missions',
      };
    }

    return this.missionsService.confirmMission(missionId, shipperId);
  }

  @ApiOperation({ summary: 'Get shipper dashboard data (Shipper only)' })
  @ApiResponse({
    status: 200,
    description: 'Shipper dashboard data retrieved successfully',
  })
  @Get('dashboard')
  async getShipperDashboard(@Req() req: Request) {
    const shipperId = (req as any).user.id;
    const userType = (req as any).user.type;

    if (userType !== 'shipper') {
      return {
        success: false,
        message: 'Only shippers can access dashboard',
      };
    }

    return this.missionsService.getShipperDashboard(shipperId);
  }

  @ApiOperation({
    summary: 'Get carriers who accepted a specific mission (Shipper only)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of accepted carriers retrieved successfully',
  })
  @Get(':id/accepted-carriers')
  async getAcceptedCarriers(
    @Param('id') missionId: string,
    @Req() req: Request,
  ) {
    const shipperId = (req as any).user.id;
    const userType = (req as any).user.type;

    if (userType !== 'shipper') {
      return {
        success: false,
        message: 'Only shippers can view accepted carriers',
      };
    }

    return this.missionsService.getAcceptedCarriersForMission(
      missionId,
      shipperId,
    );
  }

  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'pickup_photo', maxCount: 1 },
        { name: 'pickup_signature', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024 },
      },
    ),
  )
  @Post(':id/confirm-pickup')
  async confirmPickup(
    @Param('id') missionId: string,
    @Body() pickupData: ConfirmPickupDto,
    @Req() req: Request,
  ) {
    const carrierId = (req as any).user.id;
    const userType = (req as any).user.type;

    if (userType !== 'carrier') {
      return { success: false, message: 'Only carrier can select carriers' };
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!files?.pickup_photo?.[0] || !files?.pickup_signature?.[0]) {
      throw new BadRequestException('Pickup photo and signature are required');
    }

    return this.missionsService.confirmPickup(
      pickupData,
      files,
      missionId,
      carrierId,
    );
  }

  @Post(':id/track')
  async trackCarrier(
    @Param('id') missionId: string,
    @Body() dto: TrackCarrierDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;

    if (user.type !== 'shipper' && user.type !== 'carrier') {
      throw new ForbiddenException('Only carriers can send location');
    }

    return this.missionsService.trackCarrier(missionId, user.id, dto);
  }

  // Carrier Onboarding Endpoints
  @ApiOperation({ summary: 'Get Stripe onboarding link for helper' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('stripe/onboarding-link')
  async getHelperOnboardingLink(@Req() req: Request) {
    try {
      const user_id = req.user.id;
      const result =
        await this.missionsService.getHelperOnboardingLink(user_id);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get('stripe/dashboard-login-link')
  async getExpressDashboardLink(@Req() req: Request) {
    try {
      // const user_id = req.user.id;
      const result = await this.missionsService.getExpressDashboardLink(
        'acct_1SR9ISPDj2ZbY9rb',
      );
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Check helper onboarding status' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('stripe/onboarding-status')
  async checkHelperOnboardingStatus(@Req() req: Request) {
    try {
      const user_id = req.user.id;
      const result =
        await this.missionsService.checkHelperOnboardingStatus(user_id);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Shipper selects a carrier for a mission' })
  @ApiResponse({ status: 200, description: 'Carrier selected successfully' })
  @Post(':id/select-carrier')
  async selectCarrier(
    @Param('id') missionId: string,
    @Body() selectCarrierDto: SelectCarrierDto,
    @Req() req: Request,
  ) {
    const shipperId = (req as any).user.id;
    const userType = (req as any).user.type;

    if (userType !== 'shipper') {
      return {
        success: false,
        message: 'Only shippers can select carriers',
      };
    }

    return this.missionsService.selectCarrier(
      missionId,
      selectCarrierDto.carrier_id,
      shipperId,
    );
  }

  @ApiOperation({ summary: 'Cancel mission' })
  @ApiResponse({ status: 200, description: 'Mission cancelled successfully' })
  @Delete(':id/cancel-mission')
  async cancelMission(@Param('id') missionId: string, @Req() req: Request) {
    const userId = (req as any).user.id;
    const userType = (req as any).user.type;

    if (userType === 'shipper' || userType === 'carrier') {
      return this.missionsService.cancelMission(missionId, userId);
    }

    return {
      success: false,
      message: 'Only shippers or carriers can cancel missions',
    };
  }

  // documents
  @ApiOperation({ summary: 'Get mission document URLs' })
  @ApiResponse({ status: 200, description: 'Documents fetched successfully' })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  @Get('admin/documents')
  async getMissionDocuments(@Req() req: any, @Query() query: any) {
    const userType = (req as any)?.user?.type;

    if (userType !== 'admin') {
      return {
        success: false,
        message: 'Access denied: Only admins can view mission documents',
      };
    }

    return this.missionsService.getMissionDocuments(query);
  }
}
