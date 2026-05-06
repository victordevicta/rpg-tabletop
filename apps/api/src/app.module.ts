import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { PrismaModule } from './prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { WorldsModule } from './modules/worlds/worlds.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { ChatModule } from './modules/chat/chat.module';
import { DiceModule } from './modules/dice/dice.module';
import { DiscordModule } from './modules/discord/discord.module';
import { AssetsModule } from './modules/assets/assets.module';
import { YoutubeModule } from './modules/youtube/youtube.module';
import { SpotifyModule } from './modules/spotify/spotify.module';
import { EventsGateway } from './gateways/events.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], envFilePath: ['../../.env', '.env'] }),
    PrismaModule,
    AuthModule,
    WorldsModule,
    DocumentsModule,
    ChatModule,
    DiceModule,
    DiscordModule,
    AssetsModule,
    YoutubeModule,
    SpotifyModule,
  ],
  providers: [EventsGateway],
})
export class AppModule {}
