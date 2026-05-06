import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { ChatService } from '../modules/chat/chat.service';
import { DiceService } from '../modules/dice/dice.service';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  ChatSendPayload,
  RollCreatePayload,
  TokenMovePayload,
  SceneActivatePayload,
  CombatStartPayload,
  CombatNextTurnPayload,
} from '@eldertable/shared';

type EldertableSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

@Injectable()
@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server<ClientToServerEvents, ServerToClientEvents>;

  private connectedUsers = new Map<string, { userId: string; worldId?: string }>();

  constructor(
    private chat: ChatService,
    private dice: DiceService,
    private config: ConfigService,
  ) {}

  handleConnection(client: EldertableSocket) {
    this.connectedUsers.set(client.id, { userId: '' });
  }

  handleDisconnect(client: EldertableSocket) {
    const info = this.connectedUsers.get(client.id);
    if (info?.worldId) {
      client.to(`world:${info.worldId}`).emit('world:userLeft', { userId: info.userId });
    }
    this.connectedUsers.delete(client.id);
  }

  @SubscribeMessage('world:join')
  handleWorldJoin(
    @ConnectedSocket() client: EldertableSocket,
    @MessageBody() payload: { worldId: string; userId: string },
  ) {
    client.join(`world:${payload.worldId}`);
    this.connectedUsers.set(client.id, { userId: payload.userId, worldId: payload.worldId });
    client.to(`world:${payload.worldId}`).emit('world:userJoined', {
      userId: payload.userId,
      name: payload.userId,
    });
  }

  @SubscribeMessage('world:leave')
  handleWorldLeave(
    @ConnectedSocket() client: EldertableSocket,
    @MessageBody() payload: { worldId: string },
  ) {
    client.leave(`world:${payload.worldId}`);
    const info = this.connectedUsers.get(client.id);
    if (info) {
      this.connectedUsers.set(client.id, { ...info, worldId: undefined });
      client.to(`world:${payload.worldId}`).emit('world:userLeft', { userId: info.userId });
    }
  }

  @SubscribeMessage('chat:send')
  async handleChatSend(
    @ConnectedSocket() client: EldertableSocket,
    @MessageBody() payload: ChatSendPayload,
  ) {
    const message = await this.chat.createMessage({
      worldId: payload.worldId,
      userId: payload.userId,
      speaker: payload.speaker,
      content: payload.content,
      type: payload.type,
      flags: payload.flags,
    });

    this.server.to(`world:${payload.worldId}`).emit('chat:message', {
      ...payload,
      id: message.id,
      createdAt: message.createdAt.toISOString(),
    });
  }

  @SubscribeMessage('token:move')
  handleTokenMove(
    @ConnectedSocket() client: EldertableSocket,
    @MessageBody() payload: TokenMovePayload,
  ) {
    client.to(`world:${payload.worldId}`).emit('token:move', payload);
  }

  @SubscribeMessage('scene:activate')
  handleSceneActivate(
    @ConnectedSocket() client: EldertableSocket,
    @MessageBody() payload: SceneActivatePayload,
  ) {
    this.server.to(`world:${payload.worldId}`).emit('scene:activate', payload);
  }

  @SubscribeMessage('combat:start')
  handleCombatStart(
    @ConnectedSocket() client: EldertableSocket,
    @MessageBody() payload: CombatStartPayload,
  ) {
    this.server.to(`world:${payload.worldId}`).emit('combat:start', payload);
  }

  @SubscribeMessage('combat:nextTurn')
  handleCombatNextTurn(
    @ConnectedSocket() client: EldertableSocket,
    @MessageBody() payload: CombatNextTurnPayload,
  ) {
    this.server.to(`world:${payload.worldId}`).emit('combat:nextTurn', payload);
  }

  emitToWorld<E extends keyof ServerToClientEvents>(
    worldId: string,
    event: E,
    payload: Parameters<ServerToClientEvents[E]>[0],
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.server.to(`world:${worldId}`).emit(event as any, payload as any);
  }
}
