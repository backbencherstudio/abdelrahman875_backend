import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { DocumentType, DocumentStatus } from '@prisma/client';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import { StringHelper } from '../../../common/helper/string.helper';
import appConfig from '../../../config/app.config';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Upload a document for a user
   */
  async uploadDocument(
    userId: string,
    type: DocumentType,
    file: Express.Multer.File,
    fileName?: string,
  ) {
    try {
      // Check if document already exists for this user and type
      const existingDocument = await this.prisma.document.findUnique({
        where: {
          user_id_type: {
            user_id: userId,
            type: type,
          },
        },
      });

      if (existingDocument) {
        // Delete old file from storage
        await SojebStorage.delete(
          appConfig().storageUrl.documents + existingDocument.file_url,
        );
      }

      // Generate unique filename
      const uniqueFileName = `${StringHelper.randomString()}_${file.originalname}`;
      const filePath = appConfig().storageUrl.documents + uniqueFileName;

      // Upload file to storage
      await SojebStorage.put(filePath, file.buffer);

      // Save document record to database
      const document = await this.prisma.document.upsert({
        where: {
          user_id_type: {
            user_id: userId,
            type: type,
          },
        },
        update: {
          file_url: uniqueFileName,
          file_name: fileName || file.originalname,
          file_size: file.size,
          status: DocumentStatus.PENDING,
          updated_at: new Date(),
        },
        create: {
          user_id: userId,
          type: type,
          file_url: uniqueFileName,
          file_name: fileName || file.originalname,
          file_size: file.size,
          status: DocumentStatus.PENDING,
        },
      });

      return {
        success: true,
        message: 'Document uploaded successfully',
        data: {
          id: document.id,
          type: document.type,
          file_name: document.file_name,
          file_size: document.file_size,
          status: document.status,
          file_url: SojebStorage.url(filePath),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Get all documents for a user
   */
  async getUserDocuments(userId: string) {
    try {
      const documents = await this.prisma.document.findMany({
        where: {
          user_id: userId,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      // Add full URLs to documents
      const documentsWithUrls = documents.map((doc) => ({
        ...doc,
        file_url: SojebStorage.url(
          appConfig().storageUrl.documents + doc.file_url,
        ),
      }));

      return {
        success: true,
        data: documentsWithUrls,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Get documents by status (for admin review) - grouped by user
   */
  async getDocumentsByStatus(status: DocumentStatus) {
    try {
      const documents = await this.prisma.document.findMany({
        where: {
          status: status,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              first_name: true,
              last_name: true,
              type: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      // Group documents by user
      const groupedByUser = documents.reduce((acc, doc) => {
        const userId = doc.user.id;

        if (!acc[userId]) {
          acc[userId] = {
            user: {
              id: doc.user.id,
              name: `${doc.user.first_name} ${doc.user.last_name}`,
              email: doc.user.email,
              type: doc.user.type,
              avatar: doc.user.avatar
                ? SojebStorage.url(
                    appConfig().storageUrl.avatar + doc.user.avatar,
                  )
                : null,
            },
            documents: [],
          };
        }

        // Add document with full URL
        acc[userId].documents.push({
          id: doc.id,
          created_at: doc.created_at,
          updated_at: doc.updated_at,
          type: doc.type,
          file_url: SojebStorage.url(
            appConfig().storageUrl.documents + doc.file_url,
          ),
          file_name: doc.file_name,
          file_size: doc.file_size,
          status: doc.status,
          reviewed_at: doc.reviewed_at,
          rejection_reason: doc.rejection_reason,
          expires_at: doc.expires_at,
        });

        return acc;
      }, {});

      // Convert to array format
      const result = Object.values(groupedByUser);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Admin: Approve or reject a document
   */
  async reviewDocument(
    documentId: string,
    status: 'APPROVED' | 'REJECTED',
    rejectionReason?: string,
  ) {
    try {
      const document = await this.prisma.document.update({
        where: {
          id: documentId,
        },
        data: {
          status: status,
          reviewed_at: new Date(),
          rejection_reason: status === 'REJECTED' ? rejectionReason : null,
        },
      });

      return {
        success: true,
        message: `Document ${status.toLowerCase()} successfully`,
        data: document,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Check if user has all required documents
   */
  async checkRequiredDocuments(userId: string, userType: string) {
    try {
      const requiredDocuments = this.getRequiredDocumentsForUserType(userType);

      const userDocuments = await this.prisma.document.findMany({
        where: {
          user_id: userId,
          status: DocumentStatus.APPROVED,
        },
      });

      const uploadedTypes = userDocuments.map((doc) => doc.type);
      const missingDocuments = requiredDocuments.filter(
        (type) => !uploadedTypes.includes(type),
      );

      return {
        success: true,
        data: {
          hasAllDocuments: missingDocuments.length === 0,
          missingDocuments: missingDocuments,
          uploadedDocuments: uploadedTypes,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Get required documents based on user type
   */
  private getRequiredDocumentsForUserType(userType: string): DocumentType[] {
    const baseDocuments = [DocumentType.ID_CARD, DocumentType.PROFILE_PHOTO];

    if (userType === 'carrier') {
      return [
        ...baseDocuments,
        DocumentType.DRIVING_LICENSE,
        DocumentType.INSURANCE_CERTIFICATE,
        DocumentType.TRANSPORT_LICENSE,
        DocumentType.PROFESSIONAL_LIABILITY_INSURANCE,
      ];
    } else if (userType === 'shipper') {
      return [
        ...baseDocuments,
        DocumentType.KBIS,
        DocumentType.URSSAF_CERTIFICATE,
        DocumentType.RIB,
        DocumentType.SEPA_MANDATE,
      ];
    }

    return baseDocuments;
  }

  /**
   * Update a document (metadata and/or file replacement)
   */
  async updateDocument(
    documentId: string,
    userId: string,
    updateData: { file_name?: string; expires_at?: string },
    newFile?: Express.Multer.File,
  ) {
    try {
      const document = await this.prisma.document.findFirst({
        where: {
          id: documentId,
          user_id: userId,
        },
      });

      if (!document) {
        throw new BadRequestException('Document not found');
      }

      // Prepare update data
      const updatePayload: any = {
        updated_at: new Date(),
      };

      // Handle file replacement
      if (newFile) {
        // Delete old file from storage
        await SojebStorage.delete(
          appConfig().storageUrl.documents + document.file_url,
        );

        // Generate unique filename for new file
        const uniqueFileName = `${StringHelper.randomString()}_${newFile.originalname}`;
        const filePath = appConfig().storageUrl.documents + uniqueFileName;

        // Upload new file to storage
        await SojebStorage.put(filePath, newFile.buffer);

        // Update file information
        updatePayload.file_url = uniqueFileName;
        updatePayload.file_name = updateData.file_name || newFile.originalname;
        updatePayload.file_size = newFile.size;
        updatePayload.status = 'PENDING'; // Reset status when file is replaced
        updatePayload.reviewed_at = null; // Reset review status
        updatePayload.rejection_reason = null; // Clear rejection reason
      } else {
        // Only update metadata if no new file
        if (updateData.file_name) {
          updatePayload.file_name = updateData.file_name;
        }
      }

      if (updateData.expires_at) {
        updatePayload.expires_at = new Date(updateData.expires_at);
      }

      const updatedDocument = await this.prisma.document.update({
        where: {
          id: documentId,
        },
        data: updatePayload,
      });

      return {
        success: true,
        message: newFile
          ? 'Document file and metadata updated successfully'
          : 'Document metadata updated successfully',
        data: {
          ...updatedDocument,
          file_url: SojebStorage.url(
            appConfig().storageUrl.documents + updatedDocument.file_url,
          ),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Get expiring documents for a user
   */
  async getExpiringDocuments(userId: string, daysAhead: number = 30) {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const expiringDocuments = await this.prisma.document.findMany({
        where: {
          user_id: userId,
          expires_at: {
            not: null,
            lte: futureDate,
            gte: new Date(), // Only future expiration dates
          },
          status: 'APPROVED', // Only approved documents
        },
        orderBy: {
          expires_at: 'asc',
        },
      });

      // Add full URLs to documents
      const documentsWithUrls = expiringDocuments.map((doc) => ({
        ...doc,
        file_url: SojebStorage.url(
          appConfig().storageUrl.documents + doc.file_url,
        ),
        days_until_expiry: doc.expires_at
          ? Math.ceil(
              (doc.expires_at.getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : null,
      }));

      return {
        success: true,
        data: {
          documents: documentsWithUrls,
          total_count: documentsWithUrls.length,
          days_ahead: daysAhead,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string, userId: string) {
    try {
      const document = await this.prisma.document.findFirst({
        where: {
          id: documentId,
          user_id: userId,
        },
      });

      if (!document) {
        throw new BadRequestException('Document not found');
      }

      // Delete file from storage
      await SojebStorage.delete(
        appConfig().storageUrl.documents + document.file_url,
      );

      // Delete from database
      await this.prisma.document.delete({
        where: {
          id: documentId,
        },
      });

      return {
        success: true,
        message: 'Document deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
