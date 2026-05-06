import { useState } from 'react';
import { Swords, SkipForward, X, Plus } from 'lucide-react';
import { useTableStore } from '../../store/useTableStore';
import { getSocket } from '../../lib/socket';

export default function CombatTracker() {
  const combatants = useTableStore((s) => s.combatants);
  const combatActive = useTableStore((s) => s.combatActive);
  const combatTurn = useTableStore((s) => s.combatTurn);
  const setCombatants = useTableStore((s) => s.setCombatants);
  const nextTurn = useTableStore((s) => s.nextCombatTurn);
  const endCombat = useTableStore((s) => s.endCombat);
  const worldId = useTableStore((s) => s.worldId);
  const tokens = useTableStore((s) => s.tokens);
  const [initiatives, setInitiatives] = useState<Record<string, number>>({});

  function startCombat() {
    const combatantList = tokens.map((t) => ({
      id: `c-${t.id}`,
      tokenId: t.id,
      name: t.name,
      initiative: initiatives[t.id] ?? Math.floor(Math.random() * 20) + 1,
      active: false,
    })).sort((a, b) => b.initiative - a.initiative);

    if (combatantList.length > 0) combatantList[0].active = true;
    setCombatants(combatantList);

    if (worldId) {
      getSocket().emit('combat:start', {
        worldId,
        sceneId: 'default',
        combatants: combatantList.map((c) => ({ tokenId: c.tokenId, name: c.name, initiative: c.initiative })),
      });
    }
  }

  function handleNextTurn() {
    nextTurn();
    if (worldId) {
      getSocket().emit('combat:nextTurn', {
        worldId,
        round: 1,
        turn: combatTurn + 1,
        combatantId: combatants[(combatTurn + 1) % combatants.length]?.id ?? '',
      });
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header flex items-center gap-2">
        <Swords size={13} /> Combat
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {!combatActive ? (
          <div className="p-3 space-y-3">
            <p className="text-xs text-gray-500">Set initiatives or start with random rolls.</p>
            {tokens.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${t.disposition === 'friendly' ? 'bg-green-500' : t.disposition === 'hostile' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                <span className="text-xs text-gray-300 flex-1 truncate">{t.name}</span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  className="input-dark w-14 text-xs py-0.5 px-2"
                  placeholder="Init"
                  value={initiatives[t.id] ?? ''}
                  onChange={(e) => setInitiatives((p) => ({ ...p, [t.id]: parseInt(e.target.value) || 0 }))}
                />
              </div>
            ))}
            <button onClick={startCombat} className="btn-primary w-full text-xs flex items-center justify-center gap-1.5">
              <Swords size={13} /> Start Combat
            </button>
          </div>
        ) : (
          <div className="p-3 space-y-1">
            {combatants.map((c, i) => (
              <div
                key={c.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors ${i === combatTurn ? 'bg-amber/10 border border-amber/30 text-amber' : 'text-gray-400'}`}
              >
                <span className="w-5 text-right font-mono">{c.initiative}</span>
                <span className="flex-1 truncate">{c.name}</span>
                {i === combatTurn && <span className="text-amber text-xs">◀</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      {combatActive && (
        <div className="p-3 border-t border-obsidian-600 flex gap-2">
          <button onClick={handleNextTurn} className="btn-primary flex-1 text-xs flex items-center justify-center gap-1.5">
            <SkipForward size={13} /> Next Turn
          </button>
          <button onClick={endCombat} className="btn-ghost text-xs px-2">
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
