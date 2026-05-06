import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { InternalGuard } from '../../common/guards/internal.guard';
import { IsOptional, IsString } from 'class-validator';

class DiscordRollDto {
  @IsString() expression!: string;
  @IsString() discordChannelId!: string;
  @IsString() discordGuildId!: string;
  @IsString() discordUserId!: string;
  @IsString() discordUsername!: string;
  @IsString() @IsOptional() label?: string;
}

@Controller('internal/discord')
@UseGuards(InternalGuard)
export class DiscordController {
  constructor(private discord: DiscordService) {}

  @Post('roll')
  roll(@Body() dto: DiscordRollDto) {
    return this.discord.handleRoll(dto);
  }

  @Get('session-link')
  sessionLink(
    @Query('channelId') channelId: string,
    @Query('guildId') guildId: string,
  ) {
    return this.discord.getSessionLink(channelId, guildId);
  }
}
