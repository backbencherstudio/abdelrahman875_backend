import { Module } from '@nestjs/common';
import { MissionDocumentsController } from './mission-module.controller';
import { MissionDocumentsService } from './mission-module.service';

@Module({
  controllers: [MissionDocumentsController],
  providers: [MissionDocumentsService],
})
export class MissionDocumentsModule {}
