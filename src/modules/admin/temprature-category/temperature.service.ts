import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateTemperatureDto,
  UpdateTemperatureDto,
} from './dto/temperature-create.dto';
import * as fs from 'fs';
import * as path from 'path';
import appConfig from 'src/config/app.config';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';

@Injectable()
export class TemperatureService {
  constructor(private readonly prismaService: PrismaService) {}

  async createTemperatureCategory(
    temperatureDto: CreateTemperatureDto,
    file: Express.Multer.File,
  ) {
    const findUnique = await this.prismaService.temperature.findUnique({
      where: { name: temperatureDto.name },
    });

    if (findUnique) {
      return {
        success: false,
        message: `Temperature category with name ${temperatureDto.name} already exists.`,
      };
    }

    if (file) {
      const fileName = `icon_${Date.now()}_${file.originalname}`;
      const tempPath = path.join(process.cwd(), 'temp', fileName);

      await fs.promises.writeFile(tempPath, file.buffer);

      const storagePath = `${appConfig().storageUrl.documents}/${fileName}`;
      await SojebStorage.put(storagePath, file.buffer);

      temperatureDto.iconUrl = SojebStorage.url(storagePath);

      // remove temp file
      await fs.promises.unlink(tempPath);
    }

    const temperatureCategory = await this.prismaService.temperature.create({
      data: {
        name: temperatureDto.name,
        min_celsius: temperatureDto.min_celsius,
        max_celsius: temperatureDto.max_celsius,
        description: temperatureDto.description,
        iconUrl:
          temperatureDto.iconUrl ||
          'https://i.ibb.co.com/jPjyd1rj/no-results-removebg-preview.png',
      },
    });

    return temperatureCategory;
  }

  async getAllTemperatureCategories() {
    const categories = await this.prismaService.temperature.findMany({
      orderBy: { name: 'asc' },
    });

    if (!categories || categories.length === 0) {
      throw new NotFoundException('No temperature categories found.');
    }

    return categories;
  }

  async getTemperatureCategoryById(id: string) {
    const category = await this.prismaService.temperature.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(
        `Temperature category with ID ${id} not found.`,
      );
    }

    return category;
  }

  async updateTemperatureCategory(
    id: string,
    updateDto: UpdateTemperatureDto,
    file?: Express.Multer.File,
  ) {
    const existing = await this.prismaService.temperature.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(
        `Temperature category with ID ${id} not found.`,
      );
    }

    let iconUrl = existing.iconUrl;

    if (file) {
      const fileName = `icon_${Date.now()}_${file.originalname}`;
      const tempPath = path.join(process.cwd(), 'temp', fileName);

      await fs.promises.writeFile(tempPath, file.buffer);

      const storagePath = `${appConfig().storageUrl.documents}/${fileName}`;
      await SojebStorage.put(storagePath, file.buffer);

      iconUrl = SojebStorage.url(storagePath);

      await fs.promises.unlink(tempPath);
    }

    const updatedCategory = await this.prismaService.temperature.update({
      where: { id },
      data: {
        name: updateDto.name ?? existing.name,
        min_celsius: updateDto.min_celsius ?? existing.min_celsius,
        max_celsius: updateDto.max_celsius ?? existing.max_celsius,
        description: updateDto.description ?? existing.description,
        iconUrl,
      },
    });

    return updatedCategory;
  }

  async deleteTemperatureCategory(id: string) {
    const existing = await this.prismaService.temperature.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(
        `Temperature category with ID ${id} not found.`,
      );
    }

    await this.prismaService.temperature.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Temperature category deleted successfully.',
    };
  }
}
