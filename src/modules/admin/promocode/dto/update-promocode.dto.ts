import { PartialType } from '@nestjs/swagger';
import { CreatePromoCodeDto } from './create-promocode.dto';

export class UpdatePromoCodeDto extends PartialType(CreatePromoCodeDto) {}
