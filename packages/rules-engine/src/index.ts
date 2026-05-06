export interface SystemDefinition {
  id: string;
  label: string;
  version: string;
  author?: string;
  description?: string;
  actorTypes: string[];
  itemTypes: string[];
  defaultRoll: string;
  attributes: AttributeDefinition[];
}

export interface AttributeDefinition {
  key: string;
  label: string;
  type: 'number' | 'string' | 'boolean' | 'resource';
  default?: unknown;
}

const registry = new Map<string, SystemDefinition>();

export function registerSystem(system: SystemDefinition): void {
  registry.set(system.id, system);
}

export function getSystem(id: string): SystemDefinition | undefined {
  return registry.get(id);
}

export function listSystems(): SystemDefinition[] {
  return [...registry.values()];
}

const genericD20: SystemDefinition = {
  id: 'generic-d20',
  label: 'Generic d20',
  version: '1.0.0',
  description: 'Simplified d20-based system for any tabletop game',
  actorTypes: ['character', 'npc', 'monster'],
  itemTypes: ['weapon', 'armor', 'spell', 'equipment', 'consumable'],
  defaultRoll: '1d20',
  attributes: [
    { key: 'hp', label: 'Hit Points', type: 'resource', default: { value: 10, max: 10 } },
    { key: 'ac', label: 'Armor Class', type: 'number', default: 10 },
    { key: 'initiative', label: 'Initiative', type: 'number', default: 0 },
    { key: 'speed', label: 'Speed', type: 'number', default: 30 },
  ],
};

registerSystem(genericD20);

registerSystem({
  id: 'generic-d100',
  label: 'Generic d100',
  version: '1.0.0',
  description: 'Percentile-based system',
  actorTypes: ['character', 'npc'],
  itemTypes: ['weapon', 'equipment', 'skill'],
  defaultRoll: '1d100',
  attributes: [
    { key: 'hp', label: 'Hit Points', type: 'resource', default: { value: 10, max: 10 } },
    { key: 'sanity', label: 'Sanity', type: 'resource', default: { value: 50, max: 50 } },
  ],
});

registerSystem({
  id: 'dice-pool',
  label: 'Dice Pool',
  version: '1.0.0',
  description: 'Pool-based system counting successes',
  actorTypes: ['character', 'npc'],
  itemTypes: ['power', 'equipment'],
  defaultRoll: '5d10>=6',
  attributes: [
    { key: 'hp', label: 'Health', type: 'resource', default: { value: 5, max: 5 } },
    { key: 'willpower', label: 'Willpower', type: 'resource', default: { value: 3, max: 3 } },
  ],
});
