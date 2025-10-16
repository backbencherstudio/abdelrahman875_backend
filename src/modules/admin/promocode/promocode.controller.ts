import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Query, 
  UseGuards 
} from '@nestjs/common';
import { PromoCodeService } from './promocode.service';
import { CreatePromoCodeDto } from './dto/create-promocode.dto';
import { UpdatePromoCodeDto } from './dto/update-promocode.dto';
import { AssignPromoCodeDto } from './dto/assign-promocode.dto';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '../../../common/guard/role/role.enum';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiBearerAuth()
@ApiTags('Admin - Promo Codes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/promocodes')
export class PromoCodeController {
  constructor(private readonly promoCodeService: PromoCodeService) {}

  @ApiResponse({ description: 'Create a new promo code' })
  @Post()
  async create(@Body() createPromoCodeDto: CreatePromoCodeDto) {
    try {
      const result = await this.promoCodeService.create(createPromoCodeDto);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiResponse({ description: 'Get all promo codes with optional filtering' })
  @Get()
  async findAll(
    @Query() query: { 
      q?: string; 
      is_active?: string; 
      discount_type?: string;
      page?: string;
      limit?: string;
    },
  ) {
    try {
      const result = await this.promoCodeService.findAll(query);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiResponse({ description: 'Assign promo code to specific users' })
  @Post(':id/assign')
  async assignToUsers(@Param('id') id: string, @Body() assignPromoCodeDto: AssignPromoCodeDto) {
    try {
      assignPromoCodeDto.promo_code_id = id;
      const result = await this.promoCodeService.assignToUsers(assignPromoCodeDto);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiResponse({ description: 'Remove promo code from specific users' })
  @Delete(':id/users')
  async removeFromUsers(
    @Param('id') id: string, 
    @Body() body: { user_ids: string[] }
  ) {
    try {
      const result = await this.promoCodeService.removeFromUsers(id, body.user_ids);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiResponse({ description: 'Toggle promo code active status' })
  @Patch(':id/toggle-active')
  async toggleActive(@Param('id') id: string) {
    try {
      const result = await this.promoCodeService.toggleActive(id);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiResponse({ description: 'Get a specific promo code by ID' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const result = await this.promoCodeService.findOne(id);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiResponse({ description: 'Update a promo code' })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updatePromoCodeDto: UpdatePromoCodeDto) {
    try {
      const result = await this.promoCodeService.update(id, updatePromoCodeDto);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiResponse({ description: 'Delete a promo code' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const result = await this.promoCodeService.remove(id);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
