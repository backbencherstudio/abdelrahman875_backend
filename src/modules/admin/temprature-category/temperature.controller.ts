import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { TemperatureService } from './temperature.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import {
  CreateTemperatureDto,
  UpdateTemperatureDto,
} from './dto/temperature-create.dto';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@ApiTags('missions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('temperature-categories')
export class TemperatureController {
  constructor(private readonly temperatureService: TemperatureService) {}

  @ApiOperation({ summary: 'Temperature created' })
  @ApiResponse({
    status: 201,
    description: 'Temperature category created successfully',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(png|svg\+xml|svg)$/)) {
          return cb(new Error('Only PNG or SVG files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  @Post()
  async createTemperatureCategory(
    @Body() temperatureDto: CreateTemperatureDto,
    @Req() req: Request,
  ) {
    const userType = (req as any).user.type;

    if (userType !== 'admin') {
      return {
        success: false,
        message: `Only admins can create temperature categories. Current user type: ${userType}`,
      };
    }

    return this.temperatureService.createTemperatureCategory(
      temperatureDto,
      req.file,
    );
  }

  @ApiOperation({ summary: 'Get all temperature categories' })
  @Get()
  async findAll() {
    return this.temperatureService.getAllTemperatureCategories();
  }

  @ApiOperation({ summary: 'Get a single temperature category by ID' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.temperatureService.getTemperatureCategoryById(id);
  }

  @ApiOperation({ summary: 'Update a temperature category by ID' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(png|svg\+xml|svg)$/)) {
          return cb(new Error('Only PNG or SVG files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTemperatureDto,
    @UploadedFile() icon?: Express.Multer.File,
  ) {
    return this.temperatureService.updateTemperatureCategory(
      id,
      updateDto,
      icon,
    );
  }

  @ApiOperation({ summary: 'Delete a temperature category by ID' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.temperatureService.deleteTemperatureCategory(id);
  }
}
