import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  speaker: string;
  content: string;
  type: string;
  createdAt: string;
  userId?: string;
}

export interface RollEntry {
  id: string;
  expression: string;
  result: { total: number; formula: string; critical?: string };
  label?: string;
  speaker: string;
  createdAt: string;
  fromDiscord?: boolean;
}

export interface Token {
  id: string;
  name: string;
  img?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  disposition: 'friendly' | 'neutral' | 'hostile';
}

export interface CombatantEntry {
  id: string;
  tokenId: string;
  name: string;
  initiative: number;
  active: boolean;
}

interface TableState {
  worldId: string | null;
  worldName: string;
  activeSceneId: string | null;
  tokens: Token[];
  chatMessages: ChatMessage[];
  rollLog: RollEntry[];
  combatants: CombatantEntry[];
  combatActive: boolean;
  combatTurn: number;
  connectedUsers: string[];
  rightPanel: 'chat' | 'rolls' | 'combat' | 'rules';

  setWorld: (id: string, name: string) => void;
  setRightPanel: (panel: TableState['rightPanel']) => void;
  addChatMessage: (msg: ChatMessage) => void;
  addRollEntry: (entry: RollEntry) => void;
  moveToken: (id: string, x: number, y: number) => void;
  setTokens: (tokens: Token[]) => void;
  setCombatants: (combatants: CombatantEntry[]) => void;
  nextCombatTurn: () => void;
  endCombat: () => void;
  addConnectedUser: (userId: string) => void;
  removeConnectedUser: (userId: string) => void;
}

const MOCK_TOKENS: Token[] = [
  { id: 'tok-1', name: 'Arathor', img: undefined, x: 2, y: 3, width: 1, height: 1, disposition: 'friendly' },
  { id: 'tok-2', name: 'Goblin Skirmisher', img: undefined, x: 5, y: 4, width: 1, height: 1, disposition: 'hostile' },
  { id: 'tok-3', name: 'Village Elder', img: undefined, x: 8, y: 6, width: 1, height: 1, disposition: 'neutral' },
];

export const useTableStore = create<TableState>((set, get) => ({
  worldId: null,
  worldName: '',
  activeSceneId: null,
  tokens: MOCK_TOKENS,
  chatMessages: [],
  rollLog: [],
  combatants: [],
  combatActive: false,
  combatTurn: 0,
  connectedUsers: [],
  rightPanel: 'chat',

  setWorld: (id, name) => set({ worldId: id, worldName: name }),
  setRightPanel: (panel) => set({ rightPanel: panel }),

  addChatMessage: (msg) =>
    set((s) => ({ chatMessages: [...s.chatMessages.slice(-199), msg] })),

  addRollEntry: (entry) =>
    set((s) => ({ rollLog: [entry, ...s.rollLog.slice(0, 99)] })),

  moveToken: (id, x, y) =>
    set((s) => ({
      tokens: s.tokens.map((t) => (t.id === id ? { ...t, x, y } : t)),
    })),

  setTokens: (tokens) => set({ tokens }),

  setCombatants: (combatants) =>
    set({ combatants, combatActive: true, combatTurn: 0 }),

  nextCombatTurn: () =>
    set((s) => {
      const next = (s.combatTurn + 1) % s.combatants.length;
      return {
        combatTurn: next,
        combatants: s.combatants.map((c, i) => ({ ...c, active: i === next })),
      };
    }),

  endCombat: () => set({ combatActive: false, combatants: [], combatTurn: 0 }),

  addConnectedUser: (userId) =>
    set((s) => ({ connectedUsers: [...new Set([...s.connectedUsers, userId])] })),

  removeConnectedUser: (userId) =>
    set((s) => ({ connectedUsers: s.connectedUsers.filter((u) => u !== userId) })),
}));
