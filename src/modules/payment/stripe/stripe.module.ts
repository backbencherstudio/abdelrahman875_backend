import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { StripePayment } from 'src/common/lib/Payment/stripe/StripePayment';

@Module({
  controllers: [StripeController],
  providers: [StripeService, PrismaService, StripePayment],
})
export class StripeModule {}
