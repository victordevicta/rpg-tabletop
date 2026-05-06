import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiceService } from '../dice/dice.service';
import { WorldsService } from '../worlds/worlds.service';

@Injectable()
export class DiscordService {
  constructor(
    private config: ConfigService,
    private dice: DiceService,
    private worlds: WorldsService,
  ) {}

  async handleRoll(data: {
    expression: string;
    discordChannelId: string;
    discordGuildId: string;
    discordUserId: string;
    discordUsername: string;
    label?: string;
  }) {
    const binding = await this.worlds.findByDiscordChannel(data.discordChannelId);
    const worldId = binding?.worldId;

    if (!worldId) {
      return { error: 'No world bound to this channel. Use /session link to bind.' };
    }

    const { diceRoll, result } = await this.dice.rollExpression({
      expression: data.expression,
      worldId,
      label: data.label,
      fromDiscord: true,
      discordUserId: data.discordUserId,
    });

    return { diceRoll, result, worldId };
  }

  async getSessionLink(discordChannelId: string, discordGuildId: string) {
    const binding = await this.worlds.findByDiscordChannel(discordChannelId);
    if (!binding) return { error: 'No world bound to this channel.' };

    const frontendUrl = this.config.get<string>('frontendUrl') ?? 'http://localhost:5173';
    return {
      world: binding.world,
      url: `${frontendUrl}/worlds/${binding.world.slug}`,
    };
  }
}
