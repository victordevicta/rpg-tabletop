import { useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket';
import { useTableStore } from '../store/useTableStore';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../lib/api';
import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@eldertable/shared';

export function useSocket(worldId: string | null) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const addMessage = useTableStore((s) => s.addChatMessage);
  const addRoll = useTableStore((s) => s.addRollEntry);
  const moveToken = useTableStore((s) => s.moveToken);
  const setActiveScene = useTableStore((s) => s.setActiveScene);
  const addUser = useTableStore((s) => s.addConnectedUser);
  const removeUser = useTableStore((s) => s.removeConnectedUser);
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  useEffect(() => {
    if (!worldId || !user) return;

    const socket = connectSocket(token ?? undefined);
    socketRef.current = socket;

    socket.emit('world:join', { worldId, userId: user.id });

    socket.on('chat:message', (msg) => {
      addMessage({
        id: msg.id,
        speaker: msg.speaker,
        content: msg.content,
        type: msg.type,
        createdAt: msg.createdAt,
        userId: msg.userId,
      });
    });

    socket.on('roll:create', (payload) => {
      addRoll({
        id: payload.id,
        expression: payload.expression,
        result: payload.result as any,
        label: payload.label,
        speaker: payload.userId ?? 'Unknown',
        createdAt: payload.createdAt,
      });
    });

    socket.on('discord:roll-received', (payload) => {
      addRoll({
        id: `discord-${Date.now()}`,
        expression: payload.expression,
        result: payload.result as any,
        speaker: `Discord:${payload.discordUsername}`,
        createdAt: new Date().toISOString(),
        fromDiscord: true,
      });
    });

    socket.on('token:move', (payload) => {
      moveToken(payload.tokenId, payload.x, payload.y);
    });

    socket.on('scene:activate', async (payload) => {
      try {
        const { data } = await api.get(`/api/worlds/${payload.worldId}/documents/${payload.sceneId}`);
        setActiveScene(payload.sceneId, (data.data?.img as string) ?? null);
      } catch {}
    });

    socket.on('world:userJoined', (payload) => addUser(payload.userId));
    socket.on('world:userLeft', (payload) => removeUser(payload.userId));

    return () => {
      socket.emit('world:leave', { worldId });
      socket.off('chat:message');
      socket.off('roll:create');
      socket.off('discord:roll-received');
      socket.off('token:move');
      socket.off('scene:activate');
      socket.off('world:userJoined');
      socket.off('world:userLeft');
    };
  }, [worldId, user, token]);

  return socketRef;
}
