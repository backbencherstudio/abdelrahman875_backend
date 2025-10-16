import { Module } from '@nestjs/common';
import { NotificationModule } from './notification/notification.module';
import { ContactModule } from './contact/contact.module';
import { FaqModule } from './faq/faq.module';
import { DocumentsModule } from './documents/documents.module';
import { MissionsModule } from './missions/missions.module';
import { ReviewModule } from './review/review.module';

@Module({
  imports: [NotificationModule, ContactModule, FaqModule, DocumentsModule, MissionsModule, ReviewModule],
})
export class ApplicationModule {}
