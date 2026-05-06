import { useState } from 'react';
import { Search, BookOpen } from 'lucide-react';
import { listSystems } from '@eldertable/rules-engine';

export default function RulesSearch() {
  const [query, setQuery] = useState('');
  const systems = listSystems();

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header flex items-center gap-2">
        <BookOpen size={13} /> Rules
      </div>
      <div className="p-3 border-b border-obsidian-600">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="input-dark w-full pl-8 text-xs py-1.5"
            placeholder="Search rules..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Available Systems</p>
        {systems.map((sys) => (
          <div key={sys.id} className="panel p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-200">{sys.label}</span>
              <span className="text-xs text-obsidian-500 font-mono">v{sys.version}</span>
            </div>
            {sys.description && <p className="text-xs text-gray-500">{sys.description}</p>}
            <div className="text-xs text-gray-600">
              Default roll: <span className="font-mono text-amber">{sys.defaultRoll}</span>
            </div>
          </div>
        ))}
        {query && (
          <p className="text-xs text-gray-600 text-center py-4">
            Full compendium search coming soon.
          </p>
        )}
      </div>
    </div>
  );
}
