import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.module';
import { roll } from '@eldertable/dice-engine';

@Injectable()
export class DiceService {
  constructor(private prisma: PrismaService) {}

  async rollExpression(data: {
    expression: string;
    worldId: string;
    userId?: string;
    label?: string;
    fromDiscord?: boolean;
    discordUserId?: string;
  }) {
    let result;
    try {
      result = roll(data.expression);
    } catch (e) {
      throw new BadRequestException(`Invalid dice expression: ${data.expression}`);
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        worldId: data.worldId,
        userId: data.userId,
        speaker: data.discordUserId ? `Discord:${data.discordUserId}` : 'System',
        content: `${data.label ? `**${data.label}** ` : ''}Rolled \`${data.expression}\` = **${result.total}**`,
        type: 'roll',
        flags: { rollExpression: data.expression } as any,
      },
    });

    const diceRoll = await this.prisma.diceRoll.create({
      data: {
        worldId: data.worldId,
        userId: data.userId,
        expression: data.expression,
        result: result as any,
        label: data.label,
        messageId: message.id,
        fromDiscord: data.fromDiscord ?? false,
        discordUserId: data.discordUserId,
      },
    });

    return { diceRoll, message, result };
  }

  async getHistory(worldId: string, limit = 50) {
    return this.prisma.diceRoll.findMany({
      where: { worldId },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
