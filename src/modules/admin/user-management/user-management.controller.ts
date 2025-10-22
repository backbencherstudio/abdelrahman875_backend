import { Controller, Post, Get, Param, Query, UseGuards } from '@nestjs/common';
import { UserManagementService } from './user-management.service';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '../../../common/guard/role/role.enum';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiBearerAuth()
@ApiTags('User Management')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/user-management')
export class UserManagementController {
  constructor(private readonly userManagementService: UserManagementService) {}

  @ApiResponse({ description: 'Block a user account' })
  @Post(':userId/block')
  async blockUser(@Param('userId') userId: string) {
    try {
      const result = await this.userManagementService.blockUser(userId);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiResponse({ description: 'Unblock a user account' })
  @Post(':userId/unblock')
  async unblockUser(@Param('userId') userId: string) {
    try {
      const result = await this.userManagementService.unblockUser(userId);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiResponse({ description: 'Get all carrier profiles' })
  @Get('carriers')
  async getAllCarriers(@Query() query: { q?: string; status?: string }) {
    try {
      const result = await this.userManagementService.getAllCarriers(query);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiResponse({ description: 'Get all shipper profiles' })
  @Get('shippers')
  async getAllShippers(@Query() query: { q?: string; status?: string }) {
    try {
      const result = await this.userManagementService.getAllShippers(query);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
