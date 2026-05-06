import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DiceService } from './dice.service';
import { CurrentUser, RequestUser } from '../../common/decorators/user.decorator';
import { IsOptional, IsString } from 'class-validator';

class RollDto {
  @IsString() expression!: string;
  @IsString() @IsOptional() label?: string;
}

@Controller('worlds/:worldId/dice')
@UseGuards(AuthGuard('jwt'))
export class DiceController {
  constructor(private dice: DiceService) {}

  @Post('roll')
  roll(@Param('worldId') worldId: string, @Body() dto: RollDto, @CurrentUser() user: RequestUser) {
    return this.dice.rollExpression({ ...dto, worldId, userId: user.id });
  }

  @Get('history')
  history(@Param('worldId') worldId: string) {
    return this.dice.getHistory(worldId);
  }
}
