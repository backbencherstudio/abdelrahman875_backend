import { Module } from '@nestjs/common';
import { MissionsController } from './missions.controller';
import { MissionsService } from './missions.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { PdfService } from 'src/common/pdf/pdf.service';

@Module({
  imports: [PrismaModule],
  controllers: [MissionsController],
  providers: [MissionsService, PdfService],
  exports: [MissionsService],
})
export class MissionsModule {}
