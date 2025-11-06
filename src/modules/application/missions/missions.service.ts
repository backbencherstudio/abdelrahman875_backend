import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { MissionStatus, PaymentStatus, ShipmentType } from '@prisma/client';
import { AcceptMissionDto } from './dto/accept-mission.dto';
import { PdfService } from 'src/common/pdf/pdf.service';
import { ConfirmPickupDto } from './dto/pickup-mission.dto';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import * as fs from 'fs';
import * as path from 'path';
import appConfig from 'src/config/app.config';
import { StripePayment } from 'src/common/lib/Payment/stripe/StripePayment';
import { TrackCarrierDto } from './dto/tracking.dto';

@Injectable()
export class MissionsService {
  constructor(
    private prisma: PrismaService,
    private readonly pdfService: PdfService,
  ) {}

  async createMission(createMissionDto: CreateMissionDto, shipperId: string) {
    try {
      // Start a transaction
      const result = await this.prisma.$transaction(async (prisma) => {
        // Check if shipper exists
        const shipper = await prisma.user.findUnique({
          where: { id: shipperId },
          select: { id: true, name: true, type: true },
        });

        if (!shipper) {
          throw new BadRequestException(
            `Shipper with ID ${shipperId} not found`,
          );
        }

        // Calculate distance if not provided
        let distance = createMissionDto.distance_km;
        if (!distance) {
          distance = await this.calculateDistance(
            createMissionDto.loading_address,
            createMissionDto.delivery_address,
          );
        }

        // Calculate pricing
        const pricing = this.calculatePricing(
          distance,
          createMissionDto.shipment_type,
        );

        // Calculate volume if not provided
        let volume = createMissionDto.volume_m3;
        if (
          !volume &&
          createMissionDto.length_m &&
          createMissionDto.width_m &&
          createMissionDto.height_m
        ) {
          volume =
            createMissionDto.length_m *
            createMissionDto.width_m *
            createMissionDto.height_m;
        }

        // Create mission
        const mission = await prisma.mission.create({
          data: {
            pickup_address: `${createMissionDto.loading_address}, ${createMissionDto.loading_city} ${createMissionDto.loading_postal_code}`,
            pickup_city: createMissionDto.loading_city,
            pickup_postal_code: createMissionDto.loading_postal_code,
            delivery_address: `${createMissionDto.delivery_address}, ${createMissionDto.delivery_city} ${createMissionDto.delivery_postal_code}`,
            delivery_city: createMissionDto.delivery_city,
            delivery_postal_code: createMissionDto.delivery_postal_code,
            pickup_contact_name:
              createMissionDto.loading_staff_name || 'Contact Name',
            pickup_contact_phone: createMissionDto.shipper_phone,
            delivery_contact_name: createMissionDto.recipient_name,
            delivery_contact_phone: createMissionDto.recipient_phone,
            shipment_type: createMissionDto.shipment_type,
            temp_min: createMissionDto.temp_min,
            temp_max: createMissionDto.temp_max,
            tem_unit: createMissionDto.tem_unit,
            package_length: createMissionDto.length_m,
            package_width: createMissionDto.width_m,
            package_height: createMissionDto.height_m,
            delivery_date: createMissionDto.delivery_date
              ? new Date(createMissionDto.delivery_date)
              : null,
            delivery_time: createMissionDto.delivery_time,
            pickup_instructions: createMissionDto.loading_instructions,
            delivery_instructions: createMissionDto.delivery_instructions,
            delivery_message: createMissionDto.delivery_message,
            goods_type: createMissionDto.goods_type,
            parcels_count: 1,
            weight_kg: createMissionDto.weight_kg,
            volume_m3: volume || 0,
            special_instructions:
              createMissionDto.loading_instructions ||
              createMissionDto.delivery_instructions,
            fragile: createMissionDto.fragile || false,
            pickup_date: new Date(createMissionDto.loading_date),
            pickup_time: createMissionDto.loading_time,
            time_slot: createMissionDto.loading_time,
            distance_km: distance,
            base_price: pricing.basePrice,
            final_price: pricing.finalPrice,
            commission_rate: 0.1,
            commission_amount: pricing.commissionAmount,
            vat_rate: 0.2,
            vat_amount: pricing.vatAmount,
            status: MissionStatus.CREATED,
            shipper: { connect: { id: shipperId } },
          },
        });

        // Log timeline
        await this.logTimeline(
          mission.id,
          MissionStatus.CREATED,
          shipperId,
          'Mission created',
          prisma,
        );

        return mission;
      });

      return {
        success: true,
        message: 'Mission created successfully',
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async getAvailableMissions(query: {
    page?: number;
    limit?: number;
    status?: string;
    q?: string;
  }) {
    try {
      const validStatuses = Object.values(MissionStatus);

      // Validate status
      if (
        query.status &&
        !validStatuses.includes(query.status as MissionStatus)
      ) {
        return {
          success: false,
          message: `Invalid mission status: '${query.status}'. Valid options are: ${validStatuses.join(', ')}`,
        };
      }

      const whereCondition: any = {
        carrier_id: null,
      };

      // Optional: Filter by status if explicitly provided
      if (query?.status) {
        whereCondition.status = query.status;
      }

      // Optional: Search by pickup/delivery city or shipper name
      if (query?.q) {
        whereCondition.OR = [
          { pickup_city: { contains: query.q, mode: 'insensitive' } },
          { delivery_city: { contains: query.q, mode: 'insensitive' } },
          {
            shipper: {
              name: { contains: query.q, mode: 'insensitive' },
            },
          },
        ];
      }

      // Pagination setup
      const page = query?.page ? Number(query.page) : 1;
      const limit = query?.limit ? Number(query.limit) : 10;

      // Fetch data + total count
      const [missions, totalMissions] = await Promise.all([
        this.prisma.mission.findMany({
          where: whereCondition,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            created_at: true,
            distance_km: true,
            final_price: true,
            status: true,
            pickup_city: true,
            delivery_city: true,
            carrier: {
              select: { id: true, name: true },
            },
            shipper: {
              select: { id: true, name: true, avatar: true },
            },
          },
        }),
        this.prisma.mission.count({ where: whereCondition }),
      ]);

      // Return consistent response
      return {
        success: true,
        message: 'Available missions fetched successfully',
        data: missions,
        pagination: {
          total: totalMissions,
          currentPage: page,
          limit,
          totalPages: Math.ceil(totalMissions / limit),
          hasNextPage: page * limit < totalMissions,
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

  async getMyMissions(userId: string, userType: string) {
    try {
      const whereClause =
        userType === 'shipper'
          ? { shipper_id: userId }
          : { carrier_id: userId };

      const missions = await this.prisma.mission.findMany({
        where: whereClause,
        include: {
          shipper: {
            select: {
              id: true,
              name: true,
              avatar: true,
              average_rating: true,
            },
          },
          carrier: {
            select: {
              id: true,
              name: true,
              avatar: true,
              average_rating: true,
            },
          },
          timelines: {
            select: {
              id: true,
              created_at: true,
              event: true,
              description: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      return {
        success: true,
        data: missions,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async acceptMission(
    missionId: string,
    carrierId: string,
    dto: AcceptMissionDto,
  ) {
    try {
      const carrier = await this.prisma.user.findUnique({
        where: { id: carrierId },
        select: { id: true, type: true, status: true },
      });

      if (!carrier) {
        throw new BadRequestException('Carrier not found');
      }
      if (carrier.type !== 'carrier') {
        throw new BadRequestException('Only carriers can accept missions');
      }
      if (carrier.status !== 1) {
        throw new BadRequestException('Carrier account is not active');
      }

      const mission = await this.prisma.mission.findUnique({
        where: { id: missionId },
      });

      if (!mission) {
        throw new NotFoundException('Mission not found');
      }
      if (mission.status !== MissionStatus.SEARCHING_CARRIER) {
        throw new BadRequestException(
          'Mission is not available for acceptance at this time',
        );
      }
      if (mission.carrier_id) {
        throw new BadRequestException(
          'Mission has already been assigned to a carrier',
        );
      }
      const alreadyAccepted = await this.prisma.missionAcceptance.findUnique({
        where: {
          mission_id_carrier_id: {
            mission_id: missionId,
            carrier_id: carrierId,
          },
        },
      });

      if (alreadyAccepted) {
        if (alreadyAccepted.status === 'REJECTED') {
          throw new BadRequestException(
            'You have already rejected this mission',
          );
        }

        if (alreadyAccepted.status === 'ACCEPTED') {
          throw new BadRequestException(
            'You have already accepted this mission',
          );
        }
      }

      const acceptance = await this.prisma.missionAcceptance.create({
        data: {
          mission_id: missionId,
          carrier_id: carrierId,
          message: dto.message,
          status: 'PENDING',
        },
        include: {
          mission: true,
          carrier: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              average_rating: true,
              total_reviews: true,
              completed_missions: true,
            },
          },
        },
      });

      return {
        success: true,
        message: 'Mission acceptance submitted. Waiting for shipper selection.',
        data: acceptance,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async getMissionById(missionId: string) {
    try {
      const mission = await this.prisma.mission.findUnique({
        where: { id: missionId },
        include: {
          shipper: {
            select: {
              id: true,
              name: true,
              avatar: true,
              average_rating: true,
              total_reviews: true,
              completed_missions: true,
            },
          },
          carrier: {
            select: {
              id: true,
              name: true,
              avatar: true,
              average_rating: true,
              total_reviews: true,
              completed_missions: true,
            },
          },
          tracking_points: {
            orderBy: {
              created_at: 'asc',
            },
          },
        },
      });

      if (!mission) {
        throw new NotFoundException('Mission not found');
      }

      return {
        success: true,
        data: mission,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  private calculatePricing(distance: number, shipmentType: ShipmentType) {
    // Base pricing per km
    const baseRatePerKm = shipmentType === ShipmentType.EXPRESS ? 1.2 : 0.7; // Express +30%

    const basePrice = distance * baseRatePerKm;
    const commissionRate = 0.15; // 15% platform commission
    const vatRate = 0.2; // 20% VAT

    // Calculate commission (platform charge)
    const commissionAmount = basePrice * commissionRate;

    // Calculate price including commission (before VAT)
    const priceWithCommission = basePrice + commissionAmount;

    // Calculate VAT on the total (base + commission)
    const vatAmount = priceWithCommission * vatRate;

    // Final price = base + commission + VAT
    const finalPrice = priceWithCommission + vatAmount;

    return {
      basePrice: Math.round(basePrice * 100) / 100,
      commissionAmount: Math.round(commissionAmount * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      finalPrice: Math.round(finalPrice * 100) / 100,
    };
  }

  async updateMissionStatus(missionId: string, status: MissionStatus) {
    try {
      const mission = await this.prisma.mission.update({
        where: { id: missionId },
        data: { status },
      });

      return {
        success: true,
        message: 'Mission status updated successfully',
        data: mission,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Temporary method for testing - simulate payment confirmation
  async confirmPayment(missionId: string) {
    return this.updateMissionStatus(missionId, MissionStatus.SEARCHING_CARRIER);
  }

  // ===== NEW ENHANCED MISSION FLOW METHODS =====

  async setMissionPrice(
    missionId: string,
    newPrice: number,
    shipperId: string,
  ) {
    try {
      const mission = await this.prisma.mission.findUnique({
        where: { id: missionId },
      });
      if (!mission) throw new NotFoundException('Mission not found');
      if (mission.shipper_id !== shipperId)
        throw new BadRequestException(
          'Only the mission creator can set the price',
        );
      if (newPrice < mission.final_price)
        throw new BadRequestException(
          'New price cannot be lower than the calculated price',
        );

      const commissionRate = 0.1;
      const newBasePrice = newPrice / (1 + commissionRate);
      const newCommissionAmount = newPrice - newBasePrice;

      const updatedMission = await this.prisma.mission.update({
        where: { id: missionId },
        data: {
          base_price: newBasePrice,
          final_price: newPrice,
          commission_amount: newCommissionAmount,
        },
      });

      return {
        success: true,
        message: 'Mission price updated successfully',
        data: updatedMission,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Carrier Onboarding Methods
  async getHelperOnboardingLink(user_id: string) {
    try {
      if (!user_id) {
        throw new Error('User ID is required to get onboarding link');
      }
      const user = await this.prisma.user.findUnique({
        where: { id: user_id },
        select: {
          stripe_connect_account_id: true,
          stripe_onboarding_completed: true,
          email: true,
        },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      if (!user.stripe_connect_account_id) {
        return {
          success: false,
          message:
            'Stripe Connect account not found. Please convert to helper role first.',
        };
      }

      if (user.stripe_onboarding_completed) {
        return {
          success: false,
          message: 'Onboarding already completed',
        };
      }

      // Generate onboarding link using existing StripePayment method
      const accountLink = await StripePayment.createOnboardingAccountLink(
        user.stripe_connect_account_id,
      );

      return {
        success: true,
        url: accountLink.url,
        message: 'Onboarding link generated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to generate onboarding link',
      };
    }
  }

  async confirmMission(missionId: string, shipperId: string) {
    try {
      const mission = await this.prisma.mission.findUnique({
        where: { id: missionId },
        include: { payment: true },
      });

      if (!mission) throw new NotFoundException('Mission not found');

      if (mission.shipper_id !== shipperId)
        throw new BadRequestException(
          'Only the mission creator can confirm the mission',
        );

      if (mission.status === MissionStatus.CANCELLED) {
        throw new BadRequestException(
          'Mission is cancelled and cannot be confirmed',
        );
      }

      if (mission?.payment?.status === PaymentStatus?.COMPLETED) {
        return {
          success: false,
          message: 'Mission payment is already confirmed',
          checkoutUrl: null,
        };
      }

      if (
        mission.status !== MissionStatus.CREATED &&
        mission.status !== MissionStatus.PAYMENT_PENDING
      ) {
        throw new BadRequestException(
          `Mission cannot be confirmed because its status is ${mission.status}`,
        );
      }

      if (
        mission.payment?.status === PaymentStatus.PENDING &&
        new Date() < mission.payment.session_expires_at
      ) {
        return {
          success: true,
          message: 'Payment session already exists',
          checkoutUrl: mission.payment.checkout_url,
        };
      }

      let updatedMission = mission;
      let sessionUrl: string;

      // Begin transaction for mission update and payment creation
      await this.prisma.$transaction(async (tx) => {
        if (mission.status === MissionStatus.CREATED) {
          updatedMission = await tx.mission.update({
            where: { id: missionId },
            data: { status: MissionStatus.PAYMENT_PENDING },
            include: { payment: true },
          });

          await this.logTimeline(
            missionId,
            MissionStatus.PAYMENT_PENDING,
            shipperId,
            'Shipper confirmed price, waiting for payment',
          );
        }

        const session = await StripePayment.createCheckoutSession(
          updatedMission,
          shipperId,
        );

        await tx.payment.create({
          data: {
            mission_id: mission.id,
            shipper_id: shipperId,
            amount: mission.final_price,
            currency: 'EUR',
            status: PaymentStatus.PENDING,
            provider: 'STRIPE',
            checkout_session_id: session.id,
            checkout_url: session.url,
            session_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h expiry
            commission_rate: mission.commission_rate,
            commission_amount: mission.commission_amount,
            metadata: {
              distance_km: mission.distance_km,
              goods_type: mission.goods_type,
              missionId: mission.id,
              shipperId,
            },
          },
        });

        sessionUrl = session.url;
      });

      return {
        success: true,
        message: 'Payment session created successfully',
        checkoutUrl: sessionUrl,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async getShipperDashboard(shipperId: string) {
    try {
      const newOffers = await this.prisma.missionAcceptance.findMany({
        where: {
          mission: {
            shipper_id: shipperId,
            status: MissionStatus.SEARCHING_CARRIER,
          },
          status: 'PENDING',
        },
        include: {
          mission: true,
          carrier: {
            select: {
              id: true,
              name: true,
              avatar: true,
              average_rating: true,
              total_reviews: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      const inProgressMissions = await this.prisma.mission.findMany({
        where: {
          shipper_id: shipperId,
          status: {
            in: [
              MissionStatus.ACCEPTED,
              MissionStatus.PICKUP_CONFIRMED,
              MissionStatus.IN_TRANSIT,
            ],
          },
        },
        orderBy: { created_at: 'desc' },
      });

      const recentOrders = await this.prisma.mission.findMany({
        where: {
          shipper_id: shipperId,
          status: {
            in: [
              MissionStatus.DELIVERED,
              MissionStatus.COMPLETED,
              MissionStatus.CANCELLED,
              MissionStatus.DISPUTED,
            ],
          },
        },
        orderBy: { created_at: 'desc' },
        take: 5,
      });

      return {
        success: true,
        data: {
          newOffers,
          inProgressMissions,
          recentOrders,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async getAcceptedCarriersForMission(missionId: string, shipperId: string) {
    try {
      const mission = await this.prisma.mission.findUnique({
        where: { id: missionId },
      });
      if (!mission) throw new NotFoundException('Mission not found');
      if (mission.shipper_id !== shipperId)
        throw new BadRequestException(
          'Only the mission creator can view accepted carriers',
        );

      const acceptedCarriers = await this.prisma.missionAcceptance.findMany({
        where: {
          mission_id: missionId,
          status: 'PENDING', // Carriers who have accepted and are awaiting shipper's decision
        },
        include: {
          carrier: {
            select: {
              id: true,
              name: true,
              avatar: true,
              average_rating: true,
              total_reviews: true,
              vehicles: true, // Include carrier's vehicles
            },
          },
        },
        orderBy: { created_at: 'asc' },
      });

      return {
        success: true,
        data: acceptedCarriers,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async confirmPickup(
    pickupData: ConfirmPickupDto,
    files: { [fieldname: string]: Express.Multer.File[] },
    missionId: string,
    carrierId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const mission = await tx.mission.findUnique({
        where: { id: missionId },
      });

      if (!mission) throw new NotFoundException('Mission not found');

      if (mission.status === MissionStatus.PICKUP_CONFIRMED) {
        throw new BadRequestException(
          'Pickup is already confirmed for this mission',
        );
      }

      if (mission.status !== MissionStatus.ACCEPTED) {
        throw new BadRequestException(
          'Pickup can only be confirmed when mission is in ACCEPTED status',
        );
      }

      if (mission.carrier_id !== carrierId) {
        throw new BadRequestException(
          'Only the assigned carrier can confirm pickup',
        );
      }

      const uploadedFiles: { [key: string]: string } = {};

      for (const [fieldname, fileArray] of Object.entries(files)) {
        if (!fileArray || fileArray.length === 0) continue;

        const file = fileArray[0];
        const fileName = `${fieldname}_${mission.id}_${Date.now()}_${file.originalname}`;
        const tempPath = path.join(process.cwd(), 'temp', fileName);

        // Write buffer to temp file
        await fs.promises.writeFile(tempPath, file.buffer);

        // Upload to SojebStorage
        const storagePath = `${appConfig().storageUrl.documents}/${fileName}`;
        await SojebStorage.put(storagePath, file.buffer);

        // Save the URL
        uploadedFiles[fieldname] = SojebStorage.url(storagePath);

        // Remove temp file
        await fs.promises.unlink(tempPath);
      }

      const updatedMission = await tx.mission.update({
        where: { id: missionId },
        data: { status: MissionStatus.PICKUP_CONFIRMED },
        include: { shipper: true, carrier: true },
      });

      const logDescription = `
Carrier ${updatedMission.carrier.name} (ID: ${carrierId}) confirmed pickup for mission ${mission.id}.
Uploaded files: ${
        Object.keys(uploadedFiles).length > 0
          ? Object.entries(uploadedFiles)
              .map(([k, v]) => `${k}: ${v}`)
              .join(', ')
          : 'No files uploaded'
      }.
Loading notes: ${pickupData.loading_notes || 'N/A'}.
Special instructions: ${pickupData.special_instructions || 'N/A'}.
`;

      await this.logTimeline(
        mission.id,
        MissionStatus.PICKUP_CONFIRMED,
        carrierId,
        logDescription.trim(),
      );

      const cmrUrl = await this.pdfService.generateCMRPdf(
        updatedMission,
        updatedMission.shipper,
        updatedMission.carrier,
        uploadedFiles.pickup_signature,
      );

      return await tx.mission.update({
        where: { id: missionId },
        data: {
          cmr_document_url: cmrUrl,
          pickup_photo: uploadedFiles.pickup_photo,
          pickup_signature: uploadedFiles.pickup_signature,
          loading_notes: pickupData.loading_notes,
          special_instructions: pickupData.special_instructions,
        },
        include: { shipper: true, carrier: true },
      });
    });
  }

  async trackCarrier(
    missionId: string,
    carrierId: string,
    dto: TrackCarrierDto,
  ) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
    });
    if (!mission) throw new NotFoundException('Mission not found');

    // console.log(mission.carrier_id);

    // if (mission.carrier_id !== carrierId)
    //   throw new BadRequestException('Only the assigned carrier can track');

    const trackingPoint = await this.prisma.trackingPoint.create({
      data: {
        mission_id: missionId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracy: dto.accuracy,
        speed: dto.speed,
        heading: dto.heading,
      },
    });

    return {
      latitude: trackingPoint.latitude,
      longitude: trackingPoint.longitude,
      accuracy: trackingPoint.accuracy,
      speed: trackingPoint.speed,
      heading: trackingPoint.heading,
      googleMapsLink: `https://www.google.com/maps?q=${trackingPoint.latitude},${trackingPoint.longitude}`,
    };
  }

  async selectCarrier(missionId: string, carrierId: string, shipperId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const mission = await tx.mission.findUnique({
          where: { id: missionId },
        });
        if (!mission) throw new NotFoundException('Mission not found');
        if (mission.shipper_id !== shipperId)
          throw new BadRequestException(
            'Only the mission creator can select a carrier',
          );
        if (mission.status !== MissionStatus.SEARCHING_CARRIER)
          throw new BadRequestException(
            'Carrier can only be selected if mission is in SEARCHING_CARRIER status',
          );
        if (mission.carrier_id)
          throw new BadRequestException(
            'Mission already has an assigned carrier',
          );

        const acceptance = await tx.missionAcceptance.findUnique({
          where: {
            mission_id_carrier_id: {
              mission_id: missionId,
              carrier_id: carrierId,
            },
          },
        });

        if (!acceptance || acceptance.status !== 'PENDING') {
          throw new BadRequestException(
            'Carrier has not accepted this mission or acceptance is not pending',
          );
        }

        // 1. Update mission with selected carrier and status
        const updatedMission = await tx.mission.update({
          where: { id: missionId },
          data: {
            carrier_id: carrierId,
            status: MissionStatus.ACCEPTED,
          },
          include: {
            shipper: true,
            carrier: true,
          },
        });

        // 2. Mark selected acceptance as ACCEPTED
        await tx.missionAcceptance.update({
          where: { id: acceptance.id },
          data: { status: 'ACCEPTED' },
        });

        //  Generate Affreightment Confirmation PDF
        const pdfUrl =
          await this.pdfService.generateAffreightmentConfirmationPdf(
            updatedMission,
            updatedMission.shipper,
            updatedMission.carrier,
          );

        await tx.mission.update({
          where: { id: missionId },
          data: {
            confirmation_document_url: pdfUrl,
          },
        });

        // 3. Mark all other pending acceptances for this mission as REJECTED
        await tx.missionAcceptance.updateMany({
          where: {
            mission_id: missionId,
            status: 'PENDING',
            NOT: { carrier_id: carrierId },
          },
          data: { status: 'REJECTED' },
        });

        await this.logTimeline(
          missionId,
          MissionStatus.ACCEPTED,
          shipperId,
          `Shipper selected carrier ${updatedMission.carrier.name} for this mission. Affreightment Confirmation PDF generated: ${pdfUrl}`,
        );

        return {
          success: true,
          message: 'Carrier selected successfully and mission accepted',
          data: updatedMission,
        };
      });
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async cancelMission(missionId: string, userId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    if (mission.status === MissionStatus.CANCELLED) {
      throw new BadRequestException('Mission is already cancelled');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // SHIPPER CANCEL
    if (user.type === 'shipper') {
      if (mission.shipper_id !== userId) {
        throw new BadRequestException(
          'Only the mission creator can cancel the mission',
        );
      }

      const shipperCancellableStatuses: MissionStatus[] = [
        MissionStatus.CREATED,
        MissionStatus.PAYMENT_PENDING,
        MissionStatus.PAYMENT_CONFIRMED,
        MissionStatus.SEARCHING_CARRIER,
        MissionStatus.ACCEPTED,
      ];

      if (!shipperCancellableStatuses.includes(mission.status)) {
        throw new BadRequestException(
          'Mission cannot be cancelled at this stage by shipper',
        );
      }

      // Cancel mission and unlink carrier
      const cancelledMission = await this.prisma.mission.update({
        where: { id: missionId },
        data: { status: MissionStatus.CANCELLED, carrier_id: null },
      });

      await this.prisma.missionAcceptance.updateMany({
        where: {
          mission_id: missionId,
          status: { in: ['PENDING', 'ACCEPTED'] },
        },
        data: {
          status: 'REJECTED',
          message: 'Mission was cancelled by shipper',
        },
      });

      await this.logTimeline(
        missionId,
        MissionStatus.CANCELLED,
        userId,
        `Shipper cancelled the mission. All pending or accepted carriers were rejected.`,
      );

      return {
        success: true,
        message: 'Mission cancelled successfully by shipper',
        data: cancelledMission,
      };
    }

    // CARRIER CANCEL
    if (user.type === 'carrier') {
      const acceptance = await this.prisma.missionAcceptance.findUnique({
        where: {
          mission_id_carrier_id: {
            mission_id: missionId,
            carrier_id: userId,
          },
        },
      });

      if (!acceptance || acceptance.status !== 'ACCEPTED') {
        throw new BadRequestException(
          'You have not accepted this mission or it is not active',
        );
      }

      // Update carrier acceptance as rejected
      await this.prisma.missionAcceptance.update({
        where: { id: acceptance.id },
        data: { status: 'REJECTED', message: 'Cancelled by carrier' },
      });

      // If carrier was assigned to the mission, unlink them
      if (mission.carrier_id === userId) {
        await this.prisma.mission.update({
          where: { id: missionId },
          data: { carrier_id: null, status: MissionStatus.SEARCHING_CARRIER },
        });
      }

      return {
        success: true,
        message: 'Mission cancelled by carrier',
        data: null,
      };
    }

    throw new BadRequestException(
      'Only shippers or carriers can cancel missions',
    );
  }

  private async calculateDistance(
    pickupAddress: string,
    deliveryAddress: string,
  ): Promise<number> {
    // TODO: Implement actual distance calculation using Google Maps API or similar
    // For now, return a mock distance
    return Math.random() * 100 + 10; // Random distance between 10-110 km
  }

  private async logTimeline(
    missionId: string,
    event: MissionStatus,
    userId?: string,
    description?: string,
    prismaClient?: any,
  ) {
    const prisma = prismaClient || this.prisma;
    await prisma.missionTimeline.create({
      data: {
        mission_id: missionId,
        event,
        user_id: userId || null,
        description: description || null,
      },
    });
  }
}
