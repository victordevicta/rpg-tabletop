import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WorldsService } from './worlds.service';
import { CurrentUser, RequestUser } from '../../common/decorators/user.decorator';
import {
  IsOptional, IsString, MinLength, IsUUID,
} from 'class-validator';

class CreateWorldDto {
  @IsString() @MinLength(2) name!: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() systemId?: string;
}

class UpdateWorldDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() systemId?: string;
}

class BindDiscordDto {
  @IsString() discordGuildId!: string;
  @IsString() discordChannelId!: string;
  @IsString() @IsOptional() discordThreadId?: string;
}

@Controller('worlds')
@UseGuards(AuthGuard('jwt'))
export class WorldsController {
  constructor(private worlds: WorldsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.worlds.findAll(user.id);
  }

  @Get(':slug')
  get(@Param('slug') slug: string, @CurrentUser() user: RequestUser) {
    return this.worlds.findBySlug(slug, user.id);
  }

  @Post()
  create(@Body() dto: CreateWorldDto, @CurrentUser() user: RequestUser) {
    return this.worlds.create(user.id, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWorldDto, @CurrentUser() user: RequestUser) {
    return this.worlds.update(id, user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.worlds.delete(id, user.id);
  }

  @Post(':id/discord-bind')
  bindDiscord(@Param('id') id: string, @Body() dto: BindDiscordDto, @CurrentUser() user: RequestUser) {
    return this.worlds.bindDiscord(id, user.id, dto);
  }
}
