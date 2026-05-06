import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma.module';

@Injectable()
export class WorldsService {
  constructor(private prisma: PrismaService) {}

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  async findAll(userId: string) {
    return this.prisma.world.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        owner: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { members: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findBySlug(slug: string, userId: string) {
    const world = await this.prisma.world.findUnique({
      where: { slug },
      include: {
        owner: { select: { id: true, name: true, avatarUrl: true } },
        members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        discordBindings: true,
      },
    });

    if (!world) throw new NotFoundException('World not found');

    const isMember =
      world.ownerId === userId ||
      world.members.some((m) => m.userId === userId);

    if (!isMember) throw new ForbiddenException('Not a member of this world');

    return world;
  }

  async create(userId: string, data: { name: string; description?: string; systemId?: string }) {
    let slug = this.slugify(data.name);
    const existing = await this.prisma.world.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now()}`;

    return this.prisma.world.create({
      data: {
        slug,
        name: data.name,
        description: data.description,
        systemId: data.systemId ?? 'generic-d20',
        ownerId: userId,
        members: { create: { userId, role: 'gm' } },
      },
      include: {
        owner: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { members: true } },
      },
    });
  }

  async update(worldId: string, userId: string, data: Partial<{ name: string; description: string; systemId: string; settings: Record<string, unknown> }>) {
    const world = await this.prisma.world.findUnique({ where: { id: worldId } });
    if (!world) throw new NotFoundException('World not found');
    if (world.ownerId !== userId) throw new ForbiddenException('Only the owner can update this world');

    return this.prisma.world.update({ where: { id: worldId }, data: data as any });
  }

  async delete(worldId: string, userId: string) {
    const world = await this.prisma.world.findUnique({ where: { id: worldId } });
    if (!world) throw new NotFoundException('World not found');
    if (world.ownerId !== userId) throw new ForbiddenException('Only the owner can delete this world');

    await this.prisma.world.delete({ where: { id: worldId } });
  }

  async bindDiscord(
    worldId: string,
    userId: string,
    data: { discordGuildId: string; discordChannelId: string; discordThreadId?: string },
  ) {
    const world = await this.prisma.world.findUnique({ where: { id: worldId } });
    if (!world) throw new NotFoundException('World not found');
    if (world.ownerId !== userId) throw new ForbiddenException('Only the owner can bind Discord');

    return this.prisma.discordBinding.upsert({
      where: { worldId_discordGuildId: { worldId, discordGuildId: data.discordGuildId } },
      create: { worldId, createdByUserId: userId, ...data },
      update: { discordChannelId: data.discordChannelId, discordThreadId: data.discordThreadId, active: true },
    });
  }

  async findByDiscordChannel(discordChannelId: string) {
    return this.prisma.discordBinding.findFirst({
      where: { discordChannelId, active: true },
      include: { world: true },
    });
  }
}
