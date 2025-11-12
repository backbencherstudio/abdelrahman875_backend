import { Controller, Get, Delete, Param, UseGuards, Req } from '@nestjs/common';
import { MissionDocumentsService } from './mission-module.service';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('mission-documents')
export class MissionDocumentsController {
  constructor(private readonly documentsService: MissionDocumentsService) {}

  @Get('all')
  async getAllDocuments(@Req() req) {
    return this.documentsService.getAllDocuments();
  }

  @Get(':missionId')
  async getDocuments(@Param('missionId') missionId: string) {
    return this.documentsService.getDocumentsByMission(missionId);
  }

  @Delete(':documentId')
  async deleteDocument(@Param('documentId') documentId: string) {
    return this.documentsService.deleteDocument(documentId);
  }
}
