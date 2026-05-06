export type DocumentType =
  | 'actor'
  | 'item'
  | 'scene'
  | 'journal'
  | 'roll-table'
  | 'playlist'
  | 'macro'
  | 'folder';

export type ActorType = 'character' | 'npc' | 'monster' | 'vehicle';
export type ItemType = 'weapon' | 'armor' | 'spell' | 'feat' | 'equipment' | 'consumable' | 'power';

export interface BaseDocument {
  id: string;
  worldId: string;
  type: DocumentType;
  name: string;
  systemId?: string;
  data: Record<string, unknown>;
  flags: Record<string, unknown>;
  folderId?: string;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

export interface ActorData {
  type: ActorType;
  img?: string;
  biography?: string;
  attributes: {
    hp: { value: number; max: number; temp?: number };
    ac?: number;
    initiative?: number;
    speed?: number;
  };
  abilities?: Record<string, { value: number; mod: number; save?: number }>;
  skills?: Record<string, { value: number; proficient: boolean }>;
  inventory?: string[];
  notes?: string;
}

export interface SceneData {
  img?: string;
  width: number;
  height: number;
  gridSize: number;
  gridType: 'square' | 'hex' | 'gridless';
  padding: number;
  backgroundColor: string;
  active: boolean;
  tokens: TokenData[];
  walls?: WallData[];
  lights?: LightData[];
}

export interface TokenData {
  id: string;
  actorId?: string;
  name: string;
  img?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  locked: boolean;
  disposition: 'friendly' | 'neutral' | 'hostile';
  bar1?: { attribute: string; value: number; max: number };
}

export interface WallData {
  id: string;
  c: [number, number, number, number];
  door?: 0 | 1 | 2;
  ds?: 0 | 1 | 2;
}

export interface LightData {
  id: string;
  x: number;
  y: number;
  dim: number;
  bright: number;
  color?: string;
  alpha: number;
}
