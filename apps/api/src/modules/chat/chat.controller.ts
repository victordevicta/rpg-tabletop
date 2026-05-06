import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';

@Controller('worlds/:worldId/chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private chat: ChatService) {}

  @Get('messages')
  getMessages(@Param('worldId') worldId: string, @Query('limit') limit?: string) {
    return this.chat.getMessages(worldId, limit ? parseInt(limit, 10) : 100);
  }
}
