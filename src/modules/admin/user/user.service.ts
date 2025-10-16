import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRepository } from '../../../common/repository/user/user.repository';
import appConfig from '../../../config/app.config';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import { DateHelper } from '../../../common/helper/date.helper';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    try {
      const user = await UserRepository.createUser(createUserDto);

      if (user.success) {
        return {
          success: user.success,
          message: user.message,
        };
      } else {
        return {
          success: user.success,
          message: user.message,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findAll({
    q,
    type,
    approved,
  }: {
    q?: string;
    type?: string;
    approved?: string;
  }) {
    try {
      const where_condition = {};
      if (q) {
        where_condition['OR'] = [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ];
      }

      if (type) {
        where_condition['type'] = type;
      }

      if (approved) {
        where_condition['approved_at'] =
          approved == 'approved' ? { not: null } : { equals: null };
      }

      const users = await this.prisma.user.findMany({
        where: {
          ...where_condition,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone_number: true,
          address: true,
          type: true,
          approved_at: true,
          created_at: true,
          updated_at: true,
        },
      });

      return {
        success: true,
        data: users,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findOne(id: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          id: id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          type: true,
          phone_number: true,
          approved_at: true,
          created_at: true,
          updated_at: true,
          avatar: true,
          billing_id: true,
        },
      });

      // add avatar url to user
      if (user.avatar) {
        user['avatar_url'] = SojebStorage.url(
          appConfig().storageUrl.avatar + user.avatar,
        );
      }

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findOneWithDocuments(id: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          id: id,
        },
        include: {
          documents: {
            orderBy: {
              created_at: 'desc'
            }
          }
        },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // Get required documents for this user type
      const requiredDocuments = this.getRequiredDocumentsForUserType(user.type);
      const uploadedDocuments = user.documents.map(doc => doc.type);
      
      const missingDocuments = requiredDocuments.filter(
        required => !uploadedDocuments.includes(required)
      );

      // Add document URLs
      const documentsWithUrls = user.documents.map(doc => ({
        ...doc,
        file_url: SojebStorage.url(appConfig().storageUrl.documents + doc.file_url)
      }));

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            type: user.type,
            phone_number: user.phone_number,
            application_status: user.application_status,
            created_at: user.created_at,
            updated_at: user.updated_at,
          },
          documents: documentsWithUrls,
          documentStatus: {
            requiredDocuments,
            uploadedDocuments,
            missingDocuments,
            hasAllDocuments: missingDocuments.length === 0,
            totalRequired: requiredDocuments.length,
            totalUploaded: uploadedDocuments.length
          }
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async approve(id: string, approvalNotes?: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: id },
        include: {
          documents: true
        }
      });
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // Check if user has all required documents
      const requiredDocuments = this.getRequiredDocumentsForUserType(user.type);
      const uploadedDocuments = user.documents.map(doc => doc.type);
      
      const missingDocuments = requiredDocuments.filter(
        required => !uploadedDocuments.includes(required)
      );

      if (missingDocuments.length > 0) {
        return {
          success: false,
          message: 'User has not uploaded all required documents',
          data: {
            missingDocuments: missingDocuments,
            requiredDocuments: requiredDocuments,
            uploadedDocuments: uploadedDocuments
          }
        };
      }

      // Approve user and mark all documents as approved
      await this.prisma.$transaction(async (tx) => {
        // Update user status
        await tx.user.update({
          where: { id: id },
          data: { 
            approved_at: DateHelper.now(),
            application_status: 'APPROVED'
          },
        });

        // Mark all user documents as approved
        await tx.document.updateMany({
          where: { 
            user_id: id,
            status: 'PENDING'
          },
          data: {
            status: 'APPROVED',
            reviewed_at: DateHelper.now()
          }
        });
      });

      return {
        success: true,
        message: 'User and all documents approved successfully',
        data: {
          approvedDocuments: uploadedDocuments.length,
          totalRequired: requiredDocuments.length,
          approvalNotes: approvalNotes || null
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async reject(id: string, rejectionReason?: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: id },
        include: {
          documents: true
        }
      });
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // Reject user and mark all documents as rejected
      await this.prisma.$transaction(async (tx) => {
        // Update user status
        await tx.user.update({
          where: { id: id },
          data: { 
            approved_at: null,
            application_status: 'REJECTED'
          },
        });

        // Mark all user documents as rejected
        await tx.document.updateMany({
          where: { 
            user_id: id,
            status: 'PENDING'
          },
          data: {
            status: 'REJECTED',
            reviewed_at: DateHelper.now(),
            rejection_reason: rejectionReason || 'User application rejected'
          }
        });
      });

      return {
        success: true,
        message: 'User and all documents rejected successfully',
        data: {
          rejectedDocuments: user.documents.length,
          rejectionReason: rejectionReason
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async setUnderReview(id: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: id },
      });
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }
      await this.prisma.user.update({
        where: { id: id },
        data: { 
          application_status: 'UNDER_REVIEW'
        },
      });
      return {
        success: true,
        message: 'User set to under review successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      const user = await UserRepository.updateUser(id, updateUserDto);

      if (user.success) {
        return {
          success: user.success,
          message: user.message,
        };
      } else {
        return {
          success: user.success,
          message: user.message,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async remove(id: string) {
    try {
      const user = await UserRepository.deleteUser(id);
      return user;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  private getRequiredDocumentsForUserType(userType: string): any[] {
    if (userType === 'shipper') {
      return ['ID_CARD', 'KBIS', 'PROFILE_PHOTO', 'RIB'];
    } else if (userType === 'carrier') {
      return ['ID_CARD', 'KBIS', 'DRIVING_LICENSE', 'TRANSPORT_LICENSE', 'INSURANCE_CERTIFICATE', 'PROFILE_PHOTO'];
    }
    return [];
  }
}
