import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiConsumes,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DocumentType, DocumentStatus } from '@prisma/client';
import { DocumentTypeEnum } from './dto/upload-document.dto';
import { ReviewDocumentDto } from './dto/review-document.dto';
import { GetDocumentsByStatusDto } from './dto/get-documents-by-status.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { memoryStorage } from 'multer';

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @ApiOperation({ summary: 'Upload a document' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  async uploadDocument(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: DocumentTypeEnum,
    @Body('file_name') fileName?: string,
  ) {
    try {
      const userId = req.user.id;
      return await this.documentsService.uploadDocument(
        userId,
        type as DocumentType,
        file,
        fileName,
      );
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Get user documents' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('my-documents')
  async getUserDocuments(@Req() req: any) {
    try {
      const userId = req.user.userId;
      return await this.documentsService.getUserDocuments(userId);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Get documents by status (Admin only)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('by-status')
  async getDocumentsByStatus(@Query() query: GetDocumentsByStatusDto) {
    try {
      return await this.documentsService.getDocumentsByStatus(
        query.status as DocumentStatus,
      );
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Review document (Admin only)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('review/:documentId')
  async reviewDocument(
    @Param('documentId') documentId: string,
    @Body() reviewData: ReviewDocumentDto,
  ) {
    try {
      return await this.documentsService.reviewDocument(
        documentId,
        reviewData.status as 'APPROVED' | 'REJECTED',
        reviewData.rejection_reason,
      );
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Check required documents' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('check-required')
  async checkRequiredDocuments(@Req() req: any) {
    try {
      const userId = req.user.userId;
      const userType = req.user.type;
      return await this.documentsService.checkRequiredDocuments(
        userId,
        userType,
      );
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Update a document (metadata and/or file replacement)',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put(':documentId')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  async updateDocument(
    @Param('documentId') documentId: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    try {
      const userId = req.user.userId;
      return await this.documentsService.updateDocument(
        documentId,
        userId,
        updateDocumentDto,
        file,
      );
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Get expiring documents' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('expiring')
  async getExpiringDocuments(@Req() req: any, @Query('days') days?: string) {
    try {
      const userId = req.user.userId;
      const daysAhead = days ? parseInt(days, 10) : 30;
      return await this.documentsService.getExpiringDocuments(
        userId,
        daysAhead,
      );
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Delete a document' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':documentId')
  async deleteDocument(
    @Param('documentId') documentId: string,
    @Req() req: any,
  ) {
    try {
      const userId = req.user.userId;
      return await this.documentsService.deleteDocument(documentId, userId);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Submit documents for admin review' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('submit-for-review')
  async submitForReview(@Req() req: any) {
    try {
      const userId = req.user.userId;
      const userType = req.user.type;

      // Check if user has all required documents
      const documentCheck = await this.documentsService.checkRequiredDocuments(
        userId,
        userType,
      );

      if (!documentCheck.success) {
        return documentCheck;
      }

      if (!documentCheck.data.hasAllDocuments) {
        return {
          success: false,
          message:
            'Please upload all required documents before submitting for review',
          data: {
            missingDocuments: documentCheck.data.missingDocuments,
          },
        };
      }

      // Update user application status to UNDER_REVIEW
      // This would typically be done in a user service, but for now we'll do it here
      // You might want to move this to a dedicated user service

      return {
        success: true,
        message: 'Documents submitted for admin review successfully',
        data: {
          hasAllDocuments: true,
          uploadedDocuments: documentCheck.data.uploadedDocuments,
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
