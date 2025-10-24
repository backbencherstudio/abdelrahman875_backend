import { Controller, Post, Req, Headers } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import { MissionStatus, PaymentStatus } from '@prisma/client';
import Stripe from 'stripe';

@Controller('payment/stripe')
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    private prisma: PrismaService,
  ) {}

  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: Request,
  ) {
    try {
      // Stripe sends raw body in webhook requests
      const payload = req.rawBody.toString();

      // Verify and parse the Stripe event
      const event = await this.stripeService.handleWebhook(payload, signature);

      switch (event.type) {
        /**
         * This event fires when a Checkout Session completes.
         * We store the PaymentIntent ID in our payment record.
         */
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          console.log({ webhook: 'checkout.session.completed' });

          // Update all matching payments for this session
          await this.prisma.payment.updateMany({
            where: { checkout_session_id: session.id, provider: 'STRIPE' },
            data: { provider_id: session.payment_intent as string },
          });
          break;
        }

        /**
         * Fires when a PaymentIntent successfully completes.
         * We find the payment via metadata and mark it completed in DB.
         */
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log({ webhook: 'payment_intent.succeeded', paymentIntent });

          const missionIdFromMetadata = paymentIntent.metadata?.missionId;
          const shipperIdFromMetadata = paymentIntent.metadata?.shipperId;

          if (!missionIdFromMetadata || !shipperIdFromMetadata) {
            console.error('PaymentIntent metadata missing missionId or shipperId');
            return;
          }

          // Find the payment record in pending state
          const payment = await this.prisma.payment.findFirst({
            where: {
              mission_id: missionIdFromMetadata,
              shipper_id: shipperIdFromMetadata,
              provider: 'STRIPE',
              status: PaymentStatus.PENDING,
            },
          });

          if (!payment) {
            console.error('Payment not found for mission:', missionIdFromMetadata);
            return;
          }

          const paidAmount = (paymentIntent.amount ?? 0) / 100;

          /**
           * Wrap multiple DB operations in a single transaction
           * to ensure consistency.
           */
          await this.prisma.$transaction(async (tx) => {
            // 1️⃣ Mark payment as completed
            await tx.payment.update({
              where: { id: payment.id },
              data: {
                status: PaymentStatus.COMPLETED,
                checkout_url: null,
                provider_id: paymentIntent.id,
                session_expires_at: null,
                metadata: null,
                updated_at: new Date(),
              },
            });

            // 2️⃣ Record the payment transaction
            await tx.paymentTransaction.create({
              data: {
                user_id: payment.shipper_id,
                store_id: null,
                order_id: payment.mission_id,
                type: 'mission_payment',
                provider: 'STRIPE',
                reference_number: paymentIntent.id,
                status: 'succeeded',
                raw_status: paymentIntent.status,
                amount: payment.amount,
                currency: payment.currency,
                paid_amount: paidAmount,
                paid_currency: paymentIntent.currency,
              },
            });

            // 3️⃣ Add mission timeline entry
            await tx.missionTimeline.create({
              data: {
                mission_id: payment.mission_id,
                event: MissionStatus.PAYMENT_CONFIRMED,
                description: 'Payment confirmed via Stripe',
                user_id: payment.shipper_id,
              },
            });

            // 4️⃣ Update mission status to next stage
            await tx.mission.update({
              where: { id: payment.mission_id },
              data: { status: MissionStatus.SEARCHING_CARRIER },
            });
          });

          console.log(`Payment for mission ${payment.mission_id} completed.`);
          break;
        }

        /**
         * Handle other Stripe events simply by logging them.
         */
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
