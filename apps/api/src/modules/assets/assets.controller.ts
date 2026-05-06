import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AssetsService } from './assets.service';

@Controller('assets')
@UseGuards(AuthGuard('jwt'))
export class AssetsController {
  constructor(private assets: AssetsService) {}

  @Get()
  list(@Query('worldId') worldId?: string) {
    return this.assets.listAssets(worldId);
  }
}
