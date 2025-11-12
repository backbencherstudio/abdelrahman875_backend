import { Module } from '@nestjs/common';
import { FaqModule } from './faq/faq.module';
import { ContactModule } from './contact/contact.module';
import { WebsiteInfoModule } from './website-info/website-info.module';
import { PaymentTransactionModule } from './payment-transaction/payment-transaction.module';
import { UserModule } from './user/user.module';
import { NotificationModule } from './notification/notification.module';
import { UserManagementModule } from './user-management/user-management.module';
import { PromoCodeModule } from './promocode/promocode.module';
import { DashboardOverviewModule } from './overview/overview.module';
import { MissionDocumentsModule } from './missionDocument/mission-module.module';

@Module({
  imports: [
    FaqModule,
    ContactModule,
    WebsiteInfoModule,
    PaymentTransactionModule,
    UserModule,
    NotificationModule,
    UserManagementModule,
    PromoCodeModule,
    DashboardOverviewModule,
    MissionDocumentsModule
  ],
})
export class AdminModule {}
