import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TemperatureController } from './temperature.controller';
import { TemperatureService } from './temperature.service';

@Module({
  imports: [PrismaModule],
  controllers: [TemperatureController],
  providers: [TemperatureService],
})
export class TemperatureModule {}
