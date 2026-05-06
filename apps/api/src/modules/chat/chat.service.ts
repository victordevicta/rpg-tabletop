import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.module';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getMessages(worldId: string, limit = 100) {
    return this.prisma.chatMessage.findMany({
      where: { worldId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        diceRoll: true,
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async createMessage(data: {
    worldId: string;
    userId?: string;
    speaker: string;
    content: string;
    type: string;
    flags?: Record<string, unknown>;
  }) {
    return this.prisma.chatMessage.create({
      data: {
        worldId: data.worldId,
        userId: data.userId,
        speaker: data.speaker,
        content: data.content,
        type: data.type,
        flags: (data.flags ?? {}) as any,
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }
}
