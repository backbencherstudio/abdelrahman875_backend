import { Controller, Post, Req, Headers } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import { MissionStatus, PaymentStatus } from '@prisma/client';
import Stripe from 'stripe';
import { StripePayment } from 'src/common/lib/Payment/stripe/StripePayment';

@Controller('payment/stripe')
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly stripePayment: StripePayment,
    private prisma: PrismaService,
  ) {}

  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: Request,
  ) {
    try {
      const payload = req.rawBody.toString();
      const event = await this.stripeService.handleWebhook(payload, signature);

      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;

          const missionId = paymentIntent.metadata?.missionId;
          const shipperId = paymentIntent.metadata?.shipperId;

          if (!missionId || !shipperId) {
            console.error('Missing metadata missionId / shipperId');
            return;
          }

          const payment = await this.prisma.payment.findFirst({
            where: {
              mission_id: missionId,
              shipper_id: shipperId,
              provider: 'STRIPE',
              status: PaymentStatus.PENDING,
            },
          });

          if (!payment) {
            console.error('Payment not found for mission:', missionId);
            return;
          }

          const paidAmount = (paymentIntent.amount ?? 0) / 100;

          await this.prisma.$transaction(async (tx) => {
            await tx.payment.update({
              where: { id: payment.id },
              data: {
                status: PaymentStatus.HELD_IN_ESCROW,
                provider_id: paymentIntent.id,
                session_expires_at: null,
                metadata: null,
                updated_at: new Date(),
              },
            });

            await tx.paymentTransaction.create({
              data: {
                user_id: payment.shipper_id,
                store_id: null,
                order_id: payment.mission_id,
                type: 'mission_payment',
                provider: 'STRIPE',
                reference_number: paymentIntent.id,
                status: PaymentStatus.HELD_IN_ESCROW,
                raw_status: paymentIntent.status,
                amount: payment.amount,
                currency: payment.currency,
                paid_amount: paidAmount,
                paid_currency: paymentIntent.currency,
              },
            });

            await tx.missionTimeline.create({
              data: {
                mission_id: payment.mission_id,
                event: MissionStatus.PAYMENT_CONFIRMED,
                description: 'Payment held in escrow via Stripe (auto-capture)',
                user_id: payment.shipper_id,
              },
            });

            await tx.mission.update({
              where: { id: payment.mission_id },
              data: { status: MissionStatus.SEARCHING_CARRIER },
            });
          });

          break;
        }

        case 'payment_intent.payment_failed':
        case 'payment_intent.canceled':
        case 'payment_intent.requires_action':
          console.log(`Stripe event: ${event.type}`);
          break;

        default:
          console.log(`Unhandled event type ${event.type}`);
          break;
      }

      return { received: true };
    } catch (error) {
      console.error('Webhook error', error);
      return { received: false };
    }
  }
}
