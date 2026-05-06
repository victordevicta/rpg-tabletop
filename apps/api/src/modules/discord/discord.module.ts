import { Module } from '@nestjs/common';
import { DiscordController } from './discord.controller';
import { DiscordService } from './discord.service';
import { DiceModule } from '../dice/dice.module';
import { WorldsModule } from '../worlds/worlds.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [DiceModule, WorldsModule, ChatModule],
  controllers: [DiscordController],
  providers: [DiscordService],
})
export class DiscordModule {}
