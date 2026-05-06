import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SpotifyService, ResolvedSpotifySource } from './spotify.service';

@Controller('spotify')
@UseGuards(AuthGuard('jwt'))
export class SpotifyController {
  constructor(private readonly spotify: SpotifyService) {}

  @Get('resolve')
  resolve(@Query('url') url: string): Promise<ResolvedSpotifySource> {
    return this.spotify.resolve(url);
  }
}
