import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MissionDocumentsService {
  constructor(private prisma: PrismaService) {}

  async getAllDocuments() {
    try {
      const docs = await this.prisma.missionDocuments.findMany({
        orderBy: { created_at: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return {
        success: true,
        message: 'All mission documents fetched successfully',
        data: docs,
      };
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new BadRequestException(
        error.message || 'Failed to fetch documents',
      );
    }
  }

  async getDocumentsByMission(missionId: string) {
    try {
      const docs = await this.prisma.missionDocuments.findMany({
        where: { mission_id: missionId },
        orderBy: { created_at: 'desc' },
      });

      if (!docs || docs.length === 0)
        throw new NotFoundException('No documents found for this mission');

      return {
        success: true,
        message: 'Mission documents fetched successfully',
        data: docs,
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to fetch mission documents',
      );
    }
  }

  async deleteDocument(documentId: string) {
    try {
      const doc = await this.prisma.missionDocuments.findUnique({
        where: { id: documentId },
      });

      if (!doc) throw new NotFoundException('Document not found');

      await this.prisma.missionDocuments.delete({ where: { id: documentId } });

      return {
        success: true,
        message: 'Document deleted successfully',
        data: doc,
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to delete document',
      );
    }
  }
}
