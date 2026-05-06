import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { YoutubeService, ResolvedYoutubeSource } from './youtube.service';

@Controller('youtube')
@UseGuards(AuthGuard('jwt'))
export class YoutubeController {
  constructor(private readonly youtube: YoutubeService) {}

  @Get('resolve')
  resolve(@Query('url') url: string): Promise<ResolvedYoutubeSource> {
    return this.youtube.resolve(url);
  }
}
