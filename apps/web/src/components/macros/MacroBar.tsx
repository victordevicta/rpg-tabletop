import { useState } from 'react';
import { Plus, Dices } from 'lucide-react';
import { roll } from '@eldertable/dice-engine';
import { useTableStore } from '../../store/useTableStore';
import { getSocket } from '../../lib/socket';
import { useAuthStore } from '../../store/useAuthStore';

interface Macro {
  id: string;
  name: string;
  command: string;
  color?: string;
}

const DEFAULT_MACROS: Macro[] = [
  { id: 'm1', name: 'Attack', command: '1d20+5', color: 'text-red-400' },
  { id: 'm2', name: 'Damage', command: '2d6+3', color: 'text-orange-400' },
  { id: 'm3', name: 'Save', command: '1d20+2', color: 'text-blue-400' },
  { id: 'm4', name: 'Init', command: '1d20+1', color: 'text-green-400' },
  { id: 'm5', name: 'Skill', command: '1d20+4', color: 'text-purple-400' },
];

export default function MacroBar() {
  const [macros] = useState<Macro[]>(DEFAULT_MACROS);
  const worldId = useTableStore((s) => s.worldId);
  const user = useAuthStore((s) => s.user);
  const addRoll = useTableStore((s) => s.addRollEntry);

  function executeMacro(macro: Macro) {
    const cmd = macro.command.trim();
    if (cmd.startsWith('/')) return;

    try {
      const result = roll(cmd);
      const entry = {
        id: `macro-${Date.now()}`,
        expression: cmd,
        result: { total: result.total, formula: result.formula, critical: result.critical },
        label: macro.name,
        speaker: user?.name ?? 'You',
        createdAt: new Date().toISOString(),
      };
      addRoll(entry);
      if (worldId && user) {
        getSocket().emit('roll:create', { worldId, userId: user.id, expression: cmd, result, label: macro.name });
      }
    } catch {}
  }

  return (
    <div className="h-12 bg-obsidian-900 border-t border-obsidian-600 flex items-center px-3 gap-2">
      <Dices size={14} className="text-amber flex-shrink-0" />
      <div className="flex items-center gap-1.5 flex-1 overflow-x-auto">
        {macros.map((macro, i) => (
          <button
            key={macro.id}
            onClick={() => executeMacro(macro)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded bg-obsidian-700 hover:bg-obsidian-600 border border-obsidian-500 hover:border-amber/30 transition-colors text-xs group"
            title={macro.command}
          >
            <span className="text-gray-600 group-hover:text-gray-500 text-xs w-4">{i + 1}</span>
            <span className={macro.color ?? 'text-gray-300'}>{macro.name}</span>
            <span className="text-gray-600 font-mono text-xs">{macro.command}</span>
          </button>
        ))}
        <button className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded border border-dashed border-obsidian-500 hover:border-amber/40 text-gray-600 hover:text-amber text-xs transition-colors">
          <Plus size={11} /> Add
        </button>
      </div>
    </div>
  );
}
