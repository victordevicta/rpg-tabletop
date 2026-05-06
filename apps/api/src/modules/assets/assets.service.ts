import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.module';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AssetsService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async listAssets(worldId?: string) {
    return this.prisma.asset.findMany({
      where: worldId ? { worldId } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async registerAsset(data: {
    name: string;
    key: string;
    url: string;
    mimeType: string;
    size: number;
    worldId?: string;
    uploaderId?: string;
  }) {
    return this.prisma.asset.create({ data });
  }
}
