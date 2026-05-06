export const DOCUMENT_TYPES = [
  'actor',
  'item',
  'scene',
  'journal',
  'roll-table',
  'playlist',
  'macro',
  'folder',
] as const;

export const SYSTEM_IDS = [
  'generic-d20',
  'generic-d100',
  'dice-pool',
  'dnd5e-srd',
] as const;

export const DEFAULT_GRID_SIZE = 64;
export const DEFAULT_SCENE_WIDTH = 4096;
export const DEFAULT_SCENE_HEIGHT = 2560;

export const SOCKET_EVENTS = {
  WORLD_JOIN: 'world:join',
  WORLD_LEAVE: 'world:leave',
  WORLD_USER_JOINED: 'world:userJoined',
  WORLD_USER_LEFT: 'world:userLeft',
  DOCUMENT_CREATE: 'document:create',
  DOCUMENT_UPDATE: 'document:update',
  DOCUMENT_DELETE: 'document:delete',
  TOKEN_MOVE: 'token:move',
  SCENE_ACTIVATE: 'scene:activate',
  CHAT_SEND: 'chat:send',
  CHAT_MESSAGE: 'chat:message',
  ROLL_CREATE: 'roll:create',
  DISCORD_ROLL_RECEIVED: 'discord:roll-received',
  COMBAT_START: 'combat:start',
  COMBAT_NEXT_TURN: 'combat:nextTurn',
} as const;
