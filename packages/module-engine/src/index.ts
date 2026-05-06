export interface ModuleDefinition {
  id: string;
  label: string;
  version: string;
  author?: string;
  description?: string;
  compatibility?: { minimum?: string; maximum?: string };
  hooks?: string[];
}

const registry = new Map<string, ModuleDefinition>();

export function registerModule(mod: ModuleDefinition): void {
  registry.set(mod.id, mod);
}

export function getModule(id: string): ModuleDefinition | undefined {
  return registry.get(id);
}

export function listModules(): ModuleDefinition[] {
  return [...registry.values()];
}
