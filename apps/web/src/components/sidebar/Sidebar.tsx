import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Sword, Map, BookOpen, Archive, Scroll, Music,
  ChevronRight, Plus, Globe, Dices,
} from 'lucide-react';
import { useTableStore } from '../../store/useTableStore';
import PlaylistPanel from '../playlist/PlaylistPanel';

interface SidebarSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  type: string;
}

const SECTIONS: SidebarSection[] = [
  { id: 'actors', label: 'Actors', icon: <Users size={15} />, type: 'actor' },
  { id: 'items', label: 'Items', icon: <Sword size={15} />, type: 'item' },
  { id: 'scenes', label: 'Scenes', icon: <Map size={15} />, type: 'scene' },
  { id: 'journals', label: 'Journals', icon: <Scroll size={15} />, type: 'journal' },
  { id: 'playlists', label: 'Playlists', icon: <Music size={15} />, type: 'playlist' },
  { id: 'compendiums', label: 'Compendiums', icon: <Archive size={15} />, type: 'compendium' },
  { id: 'macros', label: 'Macros', icon: <Dices size={15} />, type: 'macro' },
];

const MOCK_ACTORS = [
  { id: 'a1', name: 'Arathor the Bold', type: 'character' },
  { id: 'a2', name: 'Goblin Skirmisher', type: 'npc' },
  { id: 'a3', name: 'Village Elder', type: 'npc' },
];

const MOCK_ITEMS = [
  { id: 'i1', name: 'Longsword +1', type: 'weapon' },
  { id: 'i2', name: 'Fireball', type: 'spell' },
  { id: 'i3', name: 'Chain Mail', type: 'armor' },
];

const MOCK_SCENES = [
  { id: 's1', name: 'The Tavern', type: 'scene' },
  { id: 's2', name: 'Dark Forest', type: 'scene' },
  { id: 's3', name: 'Dungeon Level 1', type: 'scene' },
];

const MOCK_DATA: Record<string, Array<{ id: string; name: string; type: string }>> = {
  actor: MOCK_ACTORS,
  item: MOCK_ITEMS,
  scene: MOCK_SCENES,
};

export default function Sidebar() {
  const [expanded, setExpanded] = useState<string | null>('actors');
  const worldName = useTableStore((s) => s.worldName);

  return (
    <aside className="w-56 bg-obsidian-900 border-r border-obsidian-600 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-obsidian-600">
        <div className="flex items-center gap-2">
          <Globe size={14} className="text-amber" />
          <span className="font-display text-sm text-amber truncate">{worldName || 'Loading...'}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {SECTIONS.map((section) => (
          <div key={section.id}>
            <button
              className={`sidebar-item w-full justify-between ${expanded === section.id ? 'active' : ''}`}
              onClick={() => setExpanded(expanded === section.id ? null : section.id)}
            >
              <span className="flex items-center gap-2">
                {section.icon}
                {section.label}
              </span>
              <ChevronRight
                size={13}
                className={`transition-transform ${expanded === section.id ? 'rotate-90' : ''}`}
              />
            </button>
            <AnimatePresence>
              {expanded === section.id && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className={section.type === 'playlist' ? 'px-2 py-1' : 'pl-6 pr-2 py-1 space-y-0.5'}>
                    {section.type === 'playlist' ? (
                      <PlaylistPanel />
                    ) : (
                      <>
                        {(MOCK_DATA[section.type] ?? []).map((item) => (
                          <div key={item.id} className="sidebar-item text-xs py-1 cursor-pointer">
                            {item.name}
                          </div>
                        ))}
                        {(MOCK_DATA[section.type] ?? []).length === 0 && (
                          <p className="text-xs text-gray-600 py-1">Empty</p>
                        )}
                        <button className="sidebar-item text-xs py-1 text-gray-600 hover:text-amber w-full justify-start">
                          <Plus size={11} /> Add {section.label.slice(0, -1)}
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </aside>
  );
}
