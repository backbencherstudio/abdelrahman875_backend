import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { memoryStorage } from 'multer';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import appConfig from '../../config/app.config';
import { AuthGuard } from '@nestjs/passport';
import { DocumentsService } from '../application/documents/documents.service';
import { DocumentType } from '@prisma/client';
import { DocumentTypeEnum } from '../application/documents/dto/upload-document.dto';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private documentsService: DocumentsService,
    private prisma: PrismaService,
  ) {}

  @ApiOperation({ summary: 'Get user details' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: Request) {
    try {
      const user_id = req.user.userId;

      const response = await this.authService.me(user_id);

      return response;
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch user details',
      };
    }
  }

  @ApiOperation({ summary: 'Register a user' })
  @Post('register')
  async create(@Body() data: CreateUserDto) {
    try {
      const name = data.name;
      const first_name = data.first_name;
      const last_name = data.last_name;
      const email = data.email;
      const password = data.password;
      const type = data.type;

      // if (!name) {
      //   throw new HttpException('Name not provided', HttpStatus.UNAUTHORIZED);
      // }
      if (!first_name) {
        throw new HttpException(
          'First name not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }
      if (!last_name) {
        throw new HttpException(
          'Last name not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!password) {
        throw new HttpException(
          'Password not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const response = await this.authService.register({
        name: name,
        first_name: first_name,
        last_name: last_name,
        email: email,
        password: password,
        type: type,
      });

      return response;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Register a user with documents' })
  @Post('register-with-documents')
  @UseInterceptors(
    FilesInterceptor('documents', 10, {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  async registerWithDocuments(
    @Body() data: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    try {
      const {
        name,
        first_name,
        last_name,
        email,
        password,
        type,
        document_types,
      } = data;

      // Validate required fields
      if (!first_name) {
        throw new HttpException(
          'First name not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }
      if (!last_name) {
        throw new HttpException(
          'Last name not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!password) {
        throw new HttpException(
          'Password not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }
      if (!type) {
        throw new HttpException('User type not provided', HttpStatus.UNAUTHORIZED);
      }

      // Register the user first
      const registerResponse = await this.authService.register({
        name: name,
        first_name: first_name,
        last_name: last_name,
        email: email,
        password: password,
        type: type,
      });

      if (!registerResponse.success) {
        return registerResponse;
      }

      // If documents are provided, upload them
      if (files && files.length > 0 && document_types) {
        const documentTypesArray = JSON.parse(document_types);
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const documentType = documentTypesArray[i] as DocumentType;
          
          if (file && documentType) {
            await this.documentsService.uploadDocument(
              (registerResponse as any).data?.id || '',
              documentType,
              file,
            );
          }
        }
      }

      return {
        success: true,
        message: 'Registration completed successfully. Documents uploaded for admin review.',
        data: (registerResponse as any).data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Complete Shipper Registration with Documents' })
  @Post('register-shipper-complete')
  @UseInterceptors(
    FilesInterceptor('documents', 10, {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  async registerShipperComplete(
    @Body() data: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    try {
      const {
        first_name,
        last_name,
        date_of_birth,
        company_name,
        sector,
        phone_number,
        country,
        address,
        associated_users,
        email,
        password,
      } = data;

      // Validate required fields for shipper
      const requiredFields = {
        first_name: 'First name',
        last_name: 'Last name',
        date_of_birth: 'Date of birth',
        phone_number: 'Phone number',
        country: 'Country',
        address: 'Address',
        email: 'Email',
        password: 'Password'
      };

      const missingFields = [];
      for (const [field, label] of Object.entries(requiredFields)) {
        if (!data[field] || data[field].trim() === '') {
          missingFields.push(label);
        }
      }

      if (missingFields.length > 0) {
        return {
          success: false,
          message: `Please fill in all required fields: ${missingFields.join(', ')}`,
          data: {
            missingFields: missingFields,
            requiredFields: Object.values(requiredFields),
            optionalFields: ['Company name', 'Sector', 'Number of associated users']
          }
        };
      }

      // Register the user as shipper
      const registerResponse = await this.authService.register({
        name: `${first_name} ${last_name}`,
        first_name: first_name,
        last_name: last_name,
        email: email,
        password: password,
        type: 'shipper',
      });

      if (!registerResponse.success) {
        return registerResponse;
      }

      // Update user with additional information
      const userId = (registerResponse as any).data?.id;
      if (userId) {
        await this.authService.updateUser(userId, {
          phone_number: phone_number,
          country: country,
          address: address,
          date_of_birth: date_of_birth,
        });

        // Validate that all required documents are provided for shipper
        const requiredDocuments = ['ID_CARD', 'KBIS', 'PROFILE_PHOTO', 'RIB'];
        if (!files || files.length < requiredDocuments.length) {
          // Delete the user if documents are missing
          await this.prisma.user.delete({ where: { id: userId } });
          return {
            success: false,
            message: `Please upload all required documents. Required: ${requiredDocuments.length} documents, Provided: ${files ? files.length : 0} documents`,
            data: {
              requiredDocuments: requiredDocuments,
              providedDocuments: files ? files.length : 0,
              missingDocuments: requiredDocuments.slice(files ? files.length : 0)
            }
          };
        }

        // TODO: Create user profile with company info
        // await this.userProfileService.createProfile(userId, {
        //   company_name: company_name,
        //   sector: sector,
        //   associated_users: associated_users,
        // });

        // Upload documents if provided - auto-detect document types for shippers
        if (files && files.length > 0) {
          // Define required document types for shippers in order
          const shipperDocumentTypes: DocumentType[] = [
            'ID_CARD',
            'KBIS', 
            'PROFILE_PHOTO',
            'RIB'
          ];
          
          for (let i = 0; i < files.length && i < shipperDocumentTypes.length; i++) {
            const file = files[i];
            const documentType = shipperDocumentTypes[i];
            
            if (file && documentType) {
              await this.documentsService.uploadDocument(
                userId,
                documentType,
                file,
              );
            }
          }
        }
      }

      return {
        success: true,
        message: 'Shipper registration completed successfully. We have sent a verification link to your email.',
        data: {
          user_id: userId,
          user_type: 'shipper',
          email_verification_required: true,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Complete Carrier Registration with Documents' })
  @Post('register-carrier-complete')
  @UseInterceptors(
    FilesInterceptor('documents', 10, {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  async registerCarrierComplete(
    @Body() data: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    try {
      const {
        first_name,
        last_name,
        date_of_birth,
        company_name,
        sector,
        phone_number,
        country,
        address,
        associated_users,
        email,
        password,
        vehicle_type,
        make_model,
        license_plate,
        year_of_registration,
        loading_dimensions,
        volume_m3,
        payload_capacity,
        pallets_accepted,
      } = data;

      // Validate required fields for carrier
      const requiredFields = {
        first_name: 'First name',
        last_name: 'Last name',
        date_of_birth: 'Date of birth',
        phone_number: 'Phone number',
        country: 'Country',
        address: 'Address',
        email: 'Email',
        password: 'Password',
        vehicle_type: 'Vehicle type',
        make_model: 'Make and model',
        license_plate: 'License plate',
        year_of_registration: 'Year of registration',
        payload_capacity: 'Payload capacity',
        volume_m3: 'Volume (m³)'
      };

      const missingFields = [];
      for (const [field, label] of Object.entries(requiredFields)) {
        if (!data[field] || data[field].trim() === '') {
          missingFields.push(label);
        }
      }

      if (missingFields.length > 0) {
        return {
          success: false,
          message: `Please fill in all required fields: ${missingFields.join(', ')}`,
          data: {
            missingFields: missingFields,
            requiredFields: Object.values(requiredFields),
            optionalFields: ['Company name', 'Sector', 'Number of associated users', 'Loading dimensions', 'Pallets accepted']
          }
        };
      }

      // Register the user as carrier
      const registerResponse = await this.authService.register({
        name: `${first_name} ${last_name}`,
        first_name: first_name,
        last_name: last_name,
        email: email,
        password: password,
        type: 'carrier',
      });

      if (!registerResponse.success) {
        return registerResponse;
      }

      // Update user with additional information
      const userId = (registerResponse as any).data?.id;
      if (userId) {
        await this.authService.updateUser(userId, {
          phone_number: phone_number,
          country: country,
          address: address,
          date_of_birth: date_of_birth,
        });

        // Validate that all required documents are provided for carrier
        const requiredDocuments = ['ID_CARD', 'KBIS', 'DRIVING_LICENSE', 'TRANSPORT_LICENSE', 'INSURANCE_CERTIFICATE', 'PROFILE_PHOTO'];
        if (!files || files.length < requiredDocuments.length) {
          // Delete the user if documents are missing
          await this.prisma.user.delete({ where: { id: userId } });
          return {
            success: false,
            message: `Please upload all required documents. Required: ${requiredDocuments.length} documents, Provided: ${files ? files.length : 0} documents`,
            data: {
              requiredDocuments: requiredDocuments,
              providedDocuments: files ? files.length : 0,
              missingDocuments: requiredDocuments.slice(files ? files.length : 0)
            }
          };
        }

        // TODO: Create user profile with company info
        // await this.userProfileService.createProfile(userId, {
        //   company_name: company_name,
        //   sector: sector,
        //   associated_users: associated_users,
        // });

        // Create vehicle record
        if (vehicle_type && license_plate) {
          await this.prisma.vehicle.create({
            data: {
              type: vehicle_type.toUpperCase() as any, // Convert to VehicleType enum
              make: make_model ? make_model.split(' ')[0] : null,
              model: make_model ? make_model.split(' ').slice(1).join(' ') : null,
              year: year_of_registration ? parseInt(year_of_registration) : null,
              license_plate: license_plate,
              capacity_kg: payload_capacity ? parseFloat(payload_capacity) : null,
              capacity_m3: volume_m3 ? parseFloat(volume_m3) : null,
              photos: [], // No photos uploaded during registration
              carrier_id: userId,
            },
          });
        }
        // await this.vehicleService.createVehicle(userId, {
        //   vehicle_type: vehicle_type,
        //   make_model: make_model,
        //   license_plate: license_plate,
        //   year_of_registration: year_of_registration,
        //   loading_dimensions: JSON.parse(loading_dimensions),
        //   volume_m3: parseFloat(volume_m3),
        //   payload_capacity: parseFloat(payload_capacity),
        //   pallets_accepted: parseInt(pallets_accepted),
        // });

        // Upload documents if provided - auto-detect document types for carriers
        if (files && files.length > 0) {
          // Define required document types for carriers in order
          const carrierDocumentTypes: DocumentType[] = [
            'ID_CARD',
            'KBIS',
            'DRIVING_LICENSE',
            'TRANSPORT_LICENSE',
            'INSURANCE_CERTIFICATE',
            'PROFILE_PHOTO'
          ];
          
          for (let i = 0; i < files.length && i < carrierDocumentTypes.length; i++) {
            const file = files[i];
            const documentType = carrierDocumentTypes[i];
            
            if (file && documentType) {
              await this.documentsService.uploadDocument(
                userId,
                documentType,
                file,
              );
            }
          }
        }
      }

      return {
        success: true,
        message: 'Carrier registration completed successfully. We have sent a verification link to your email.',
        data: {
          user_id: userId,
          user_type: 'carrier',
          email_verification_required: true,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Complete Carrier Profile After Email Verification' })
  @Post('complete-carrier-profile')
  @UseInterceptors(
    FilesInterceptor('documents', 10, {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  async completeCarrierProfile(
    @Body() data: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    try {
      const {
        email,
        first_name,
        last_name,
        date_of_birth,
        company_name,
        sector,
        phone_number,
        country,
        address,
        associated_users,
        vehicle_type,
        make_model,
        license_plate,
        year_of_registration,
        loading_dimensions,
        volume_m3,
        payload_capacity,
        pallets_accepted,
      } = data;

      // Validate required fields for carrier profile completion
      const requiredFields = {
        email: 'Email',
        phone_number: 'Phone number',
        country: 'Country',
        address: 'Address',
        date_of_birth: 'Date of birth',
        vehicle_type: 'Vehicle type',
        make_model: 'Make and model',
        license_plate: 'License plate',
        year_of_registration: 'Year of registration',
        payload_capacity: 'Payload capacity',
        volume_m3: 'Volume (m³)'
      };

      const missingFields = [];
      for (const [field, label] of Object.entries(requiredFields)) {
        if (!data[field] || data[field].trim() === '') {
          missingFields.push(label);
        }
      }

      if (missingFields.length > 0) {
        return {
          success: false,
          message: `Please fill in all required fields: ${missingFields.join(', ')}`,
          data: {
            missingFields: missingFields,
            requiredFields: Object.values(requiredFields),
            optionalFields: ['Company name', 'Sector', 'Number of associated users', 'Loading dimensions', 'Pallets accepted']
          }
        };
      }

      // Find existing user by email
      const existingUser = await this.authService.findUserByEmail(email);
      if (!existingUser) {
        return {
          success: false,
          message: 'User not found. Please register first.',
        };
      }

      // Update user with additional information
      await this.authService.updateUser(existingUser.id, {
        phone_number: phone_number,
        country: country,
        address: address,
        date_of_birth: date_of_birth,
      });

      // Validate that all required documents are provided for carrier
      const requiredDocuments = ['ID_CARD', 'KBIS', 'DRIVING_LICENSE', 'TRANSPORT_LICENSE', 'INSURANCE_CERTIFICATE', 'PROFILE_PHOTO'];
      if (!files || files.length < requiredDocuments.length) {
        return {
          success: false,
          message: `Please upload all required documents. Required: ${requiredDocuments.length} documents, Provided: ${files ? files.length : 0} documents`,
          data: {
            requiredDocuments: requiredDocuments,
            providedDocuments: files ? files.length : 0,
            missingDocuments: requiredDocuments.slice(files ? files.length : 0)
          }
        };
      }

      // TODO: Create user profile with company info
      // Create vehicle record
      if (vehicle_type && license_plate) {
        await this.prisma.vehicle.create({
          data: {
            type: vehicle_type.toUpperCase() as any, // Convert to VehicleType enum
            make: make_model ? make_model.split(' ')[0] : null,
            model: make_model ? make_model.split(' ').slice(1).join(' ') : null,
            year: year_of_registration ? parseInt(year_of_registration) : null,
            license_plate: license_plate,
            capacity_kg: payload_capacity ? parseFloat(payload_capacity) : null,
            capacity_m3: volume_m3 ? parseFloat(volume_m3) : null,
            photos: [], // No photos uploaded during registration
            carrier_id: existingUser.id,
          },
        });
      }

      // Upload documents if provided
      if (files && files.length > 0) {
        const carrierDocumentTypes: DocumentType[] = [
          'ID_CARD',
          'KBIS',
          'DRIVING_LICENSE',
          'TRANSPORT_LICENSE',
          'INSURANCE_CERTIFICATE',
          'PROFILE_PHOTO'
        ];
        
        for (let i = 0; i < files.length && i < carrierDocumentTypes.length; i++) {
          const file = files[i];
          const documentType = carrierDocumentTypes[i];
          
          if (file && documentType) {
            await this.documentsService.uploadDocument(
              existingUser.id,
              documentType,
              file,
            );
          }
        }
      }

      return {
        success: true,
        message: 'Carrier profile completed successfully',
        data: {
          user_id: existingUser.id,
          user_type: 'carrier',
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Complete Shipper Profile After Email Verification' })
  @Post('complete-shipper-profile')
  @UseInterceptors(
    FilesInterceptor('documents', 10, {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  async completeShipperProfile(
    @Body() data: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    try {
      const {
        email,
        first_name,
        last_name,
        date_of_birth,
        company_name,
        sector,
        phone_number,
        country,
        address,
        associated_users,
      } = data;

      // Validate required fields for shipper profile completion
      const requiredFields = {
        email: 'Email',
        first_name: 'First name',
        last_name: 'Last name',
        date_of_birth: 'Date of birth',
        phone_number: 'Phone number',
        country: 'Country',
        address: 'Address'
      };

      const missingFields = [];
      for (const [field, label] of Object.entries(requiredFields)) {
        if (!data[field] || data[field].trim() === '') {
          missingFields.push(label);
        }
      }

      if (missingFields.length > 0) {
        return {
          success: false,
          message: `Please fill in all required fields: ${missingFields.join(', ')}`,
          data: {
            missingFields: missingFields,
            requiredFields: Object.values(requiredFields),
            optionalFields: ['Company name', 'Sector', 'Number of associated users']
          }
        };
      }

      // Find existing user by email
      const existingUser = await this.authService.findUserByEmail(email);
      if (!existingUser) {
        return {
          success: false,
          message: 'User not found. Please register first.',
        };
      }

      // Update user with additional information
      await this.authService.updateUser(existingUser.id, {
        phone_number: phone_number,
        country: country,
        address: address,
        date_of_birth: date_of_birth,
      });

      // Validate that all required documents are provided for shipper
      const requiredDocuments = ['ID_CARD', 'KBIS', 'PROFILE_PHOTO', 'RIB'];
      if (!files || files.length < requiredDocuments.length) {
        return {
          success: false,
          message: `Please upload all required documents. Required: ${requiredDocuments.length} documents, Provided: ${files ? files.length : 0} documents`,
          data: {
            requiredDocuments: requiredDocuments,
            providedDocuments: files ? files.length : 0,
            missingDocuments: requiredDocuments.slice(files ? files.length : 0)
          }
        };
      }

      // TODO: Create user profile with company info

      // Upload documents if provided
      if (files && files.length > 0) {
        const shipperDocumentTypes: DocumentType[] = [
          'ID_CARD',
          'KBIS', 
          'PROFILE_PHOTO',
          'RIB'
        ];
        
        for (let i = 0; i < files.length && i < shipperDocumentTypes.length; i++) {
          const file = files[i];
          const documentType = shipperDocumentTypes[i];
          
          if (file && documentType) {
            await this.documentsService.uploadDocument(
              existingUser.id,
              documentType,
              file,
            );
          }
        }
      }

      return {
        success: true,
        message: 'Shipper profile completed successfully',
        data: {
          user_id: existingUser.id,
          user_type: 'shipper',
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // login user
  @ApiOperation({ summary: 'Login user' })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req: Request, @Res() res: Response) {
    try {
      const user_id = req.user.id;

      const user_email = req.user.email;

      const response = await this.authService.login({
        userId: user_id,
        email: user_email,
      });

      // store to secure cookies
      res.cookie('refresh_token', response.authorization.refresh_token, {
        httpOnly: true,
        secure: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      });

      res.json(response);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Refresh token' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('refresh-token')
  async refreshToken(
    @Req() req: Request,
    @Body() body: { refresh_token: string },
  ) {
    try {
      const user_id = req.user.userId;

      const response = await this.authService.refreshToken(
        user_id,
        body.refresh_token,
      );

      return response;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: Request) {
    try {
      const userId = req.user.userId;
      const response = await this.authService.revokeRefreshToken(userId);
      return response;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleLogin(): Promise<any> {
    return HttpStatus.OK;
  }

  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleLoginRedirect(@Req() req: Request): Promise<any> {
    return {
      statusCode: HttpStatus.OK,
      data: req.user,
    };
  }

  // update user
  @ApiOperation({ summary: 'Update user' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('update')
  @UseInterceptors(
    FileInterceptor('image', {
      // storage: diskStorage({
      //   destination:
      //     appConfig().storageUrl.rootUrl + appConfig().storageUrl.avatar,
      //   filename: (req, file, cb) => {
      //     const randomName = Array(32)
      //       .fill(null)
      //       .map(() => Math.round(Math.random() * 16).toString(16))
      //       .join('');
      //     return cb(null, `${randomName}${file.originalname}`);
      //   },
      // }),
      storage: memoryStorage(),
    }),
  )
  async updateUser(
    @Req() req: Request,
    @Body() data: UpdateUserDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    try {
      const user_id = req.user.id;
      const response = await this.authService.updateUser(user_id, data, image);
      return response;
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update user',
      };
    }
  }

  // --------------change password---------

  @ApiOperation({ summary: 'Forgot password' })
  @Post('forgot-password')
  async forgotPassword(@Body() data: { email: string }) {
    try {
      const email = data.email;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.forgotPassword(email);
    } catch (error) {
      return {
        success: false,
        message: 'Something went wrong',
      };
    }
  }

  // verify email to verify the email
  @ApiOperation({ summary: 'Verify email' })
  @Post('verify-email')
  async verifyEmail(@Body() data: VerifyEmailDto) {
    try {
      const email = data.email;
      const token = data.token;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!token) {
        throw new HttpException('Token not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.verifyEmail({
        email: email,
        token: token,
      });
    } catch (error) {
      return {
        success: false,
        message: 'Failed to verify email',
      };
    }
  }

  // resend verification email to verify the email
  @ApiOperation({ summary: 'Resend verification email' })
  @Post('resend-verification-email')
  async resendVerificationEmail(@Body() data: { email: string }) {
    try {
      const email = data.email;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.resendVerificationEmail(email);
    } catch (error) {
      return {
        success: false,
        message: 'Failed to resend verification email',
      };
    }
  }

  // reset password if user forget the password
  @ApiOperation({ summary: 'Reset password' })
  @Post('reset-password')
  async resetPassword(
    @Body() data: { email: string; token: string; password: string },
  ) {
    try {
      const email = data.email;
      const token = data.token;
      const password = data.password;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!token) {
        throw new HttpException('Token not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!password) {
        throw new HttpException(
          'Password not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }
      return await this.authService.resetPassword({
        email: email,
        token: token,
        password: password,
      });
    } catch (error) {
      return {
        success: false,
        message: 'Something went wrong',
      };
    }
  }

  // change password if user want to change the password
  @ApiOperation({ summary: 'Change password' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Req() req: Request,
    @Body() data: { email: string; old_password: string; new_password: string },
  ) {
    try {
      // const email = data.email;
      const user_id = req.user.userId;

      const oldPassword = data.old_password;
      const newPassword = data.new_password;
      // if (!email) {
      //   throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      // }
      if (!oldPassword) {
        throw new HttpException(
          'Old password not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }
      if (!newPassword) {
        throw new HttpException(
          'New password not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }
      return await this.authService.changePassword({
        // email: email,
        user_id: user_id,
        oldPassword: oldPassword,
        newPassword: newPassword,
      });
    } catch (error) {
      return {
        success: false,
        message: 'Failed to change password',
      };
    }
  }

  // --------------end change password---------

  // -------change email address------
  @ApiOperation({ summary: 'request email change' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('request-email-change')
  async requestEmailChange(
    @Req() req: Request,
    @Body() data: { email: string },
  ) {
    try {
      const user_id = req.user.userId;
      const email = data.email;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.requestEmailChange(user_id, email);
    } catch (error) {
      return {
        success: false,
        message: 'Something went wrong',
      };
    }
  }

  @ApiOperation({ summary: 'Change email address' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-email')
  async changeEmail(
    @Req() req: Request,
    @Body() data: { email: string; token: string },
  ) {
    try {
      const user_id = req.user.userId;
      const email = data.email;

      const token = data.token;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!token) {
        throw new HttpException('Token not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.changeEmail({
        user_id: user_id,
        new_email: email,
        token: token,
      });
    } catch (error) {
      return {
        success: false,
        message: 'Something went wrong',
      };
    }
  }
  // -------end change email address------

  // --------- 2FA ---------
  @ApiOperation({ summary: 'Generate 2FA secret' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('generate-2fa-secret')
  async generate2FASecret(@Req() req: Request) {
    try {
      const user_id = req.user.userId;
      return await this.authService.generate2FASecret(user_id);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Verify 2FA' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('verify-2fa')
  async verify2FA(@Req() req: Request, @Body() data: { token: string }) {
    try {
      const user_id = req.user.userId;
      const token = data.token;
      return await this.authService.verify2FA(user_id, token);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Enable 2FA' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('enable-2fa')
  async enable2FA(@Req() req: Request) {
    try {
      const user_id = req.user.userId;
      return await this.authService.enable2FA(user_id);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Disable 2FA' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('disable-2fa')
  async disable2FA(@Req() req: Request) {
    try {
      const user_id = req.user.userId;
      return await this.authService.disable2FA(user_id);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
  // --------- end 2FA ---------
}
