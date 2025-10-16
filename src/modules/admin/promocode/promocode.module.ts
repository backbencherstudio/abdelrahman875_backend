import { Module } from '@nestjs/common';
import { PromoCodeService } from './promocode.service';
import { PromoCodeController } from './promocode.controller';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PromoCodeController],
  providers: [PromoCodeService],
  exports: [PromoCodeService],
})
export class PromoCodeModule {}
