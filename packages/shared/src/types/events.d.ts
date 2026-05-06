import type { BaseDocument } from './document';
import type { RollResult } from './dice';
export interface WorldJoinPayload {
    worldId: string;
    userId: string;
}
export interface DocumentEventPayload {
    worldId: string;
    document: BaseDocument;
}
export interface TokenMovePayload {
    worldId: string;
    sceneId: string;
    tokenId: string;
    x: number;
    y: number;
    userId: string;
}
export interface SceneActivatePayload {
    worldId: string;
    sceneId: string;
}
export interface ChatSendPayload {
    worldId: string;
    userId?: string;
    speaker: string;
    content: string;
    type: 'text' | 'roll' | 'ooc' | 'whisper' | 'system';
    flags?: Record<string, unknown>;
}
export interface RollCreatePayload {
    worldId: string;
    userId?: string;
    expression: string;
    result: RollResult;
    label?: string;
    fromDiscord?: boolean;
    discordUserId?: string;
}
export interface DiscordRollReceivedPayload {
    worldId: string;
    discordUserId: string;
    discordUsername: string;
    expression: string;
    result: RollResult;
    channelId: string;
}
export interface CombatStartPayload {
    worldId: string;
    sceneId: string;
    combatants: Array<{
        tokenId: string;
        name: string;
        initiative: number;
    }>;
}
export interface CombatNextTurnPayload {
    worldId: string;
    round: number;
    turn: number;
    combatantId: string;
}
export interface ServerToClientEvents {
    'document:create': (payload: DocumentEventPayload) => void;
    'document:update': (payload: DocumentEventPayload) => void;
    'document:delete': (payload: {
        worldId: string;
        documentId: string;
        type: string;
    }) => void;
    'token:move': (payload: TokenMovePayload) => void;
    'scene:activate': (payload: SceneActivatePayload) => void;
    'chat:message': (payload: ChatSendPayload & {
        id: string;
        createdAt: string;
    }) => void;
    'roll:create': (payload: RollCreatePayload & {
        id: string;
        createdAt: string;
    }) => void;
    'discord:roll-received': (payload: DiscordRollReceivedPayload) => void;
    'combat:start': (payload: CombatStartPayload) => void;
    'combat:nextTurn': (payload: CombatNextTurnPayload) => void;
    'world:userJoined': (payload: {
        userId: string;
        name: string;
    }) => void;
    'world:userLeft': (payload: {
        userId: string;
    }) => void;
    error: (payload: {
        message: string;
    }) => void;
}
export interface ClientToServerEvents {
    'world:join': (payload: WorldJoinPayload) => void;
    'world:leave': (payload: {
        worldId: string;
    }) => void;
    'token:move': (payload: TokenMovePayload) => void;
    'chat:send': (payload: ChatSendPayload) => void;
    'roll:create': (payload: RollCreatePayload) => void;
    'scene:activate': (payload: SceneActivatePayload) => void;
    'combat:start': (payload: CombatStartPayload) => void;
    'combat:nextTurn': (payload: CombatNextTurnPayload) => void;
}
