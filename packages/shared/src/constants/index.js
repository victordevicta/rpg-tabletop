"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOCKET_EVENTS = exports.DEFAULT_SCENE_HEIGHT = exports.DEFAULT_SCENE_WIDTH = exports.DEFAULT_GRID_SIZE = exports.SYSTEM_IDS = exports.DOCUMENT_TYPES = void 0;
exports.DOCUMENT_TYPES = [
    'actor',
    'item',
    'scene',
    'journal',
    'roll-table',
    'playlist',
    'macro',
    'folder',
];
exports.SYSTEM_IDS = [
    'generic-d20',
    'generic-d100',
    'dice-pool',
    'dnd5e-srd',
];
exports.DEFAULT_GRID_SIZE = 64;
exports.DEFAULT_SCENE_WIDTH = 4096;
exports.DEFAULT_SCENE_HEIGHT = 2560;
exports.SOCKET_EVENTS = {
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
};
