import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sword, MessageSquare, Dices, Swords, BookOpen,
  Link2, ArrowLeft, Wifi, WifiOff, Settings,
} from 'lucide-react';
import { api } from '../lib/api';
import { useSocket } from '../hooks/useSocket';
import { useTableStore } from '../store/useTableStore';
import { useAuthStore } from '../store/useAuthStore';
import Sidebar from '../components/sidebar/Sidebar';
import SceneCanvas from '../components/canvas/SceneCanvas';
import ChatPanel from '../components/chat/ChatPanel';
import DiceRoller from '../components/dice/DiceRoller';
import CombatTracker from '../components/panels/CombatTracker';
import RulesSearch from '../components/panels/RulesSearch';
import MacroBar from '../components/macros/MacroBar';
import DiscordPanel from '../components/discord/DiscordPanel';

interface WorldData {
  id: string;
  slug: string;
  name: string;
  systemId: string;
  discordBindings: Array<{
    discordGuildId: string;
    discordChannelId: string;
    active: boolean;
  }>;
}

const RIGHT_PANELS = [
  { id: 'chat' as const, label: 'Chat', icon: <MessageSquare size={14} /> },
  { id: 'rolls' as const, label: 'Dice', icon: <Dices size={14} /> },
  { id: 'combat' as const, label: 'Combat', icon: <Swords size={14} /> },
  { id: 'rules' as const, label: 'Rules', icon: <BookOpen size={14} /> },
];

export default function TablePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setWorld = useTableStore((s) => s.setWorld);
  const worldId = useTableStore((s) => s.worldId);
  const rightPanel = useTableStore((s) => s.rightPanel);
  const setRightPanel = useTableStore((s) => s.setRightPanel);
  const [world, setWorldData] = useState<WorldData | null>(null);
  const [showDiscord, setShowDiscord] = useState(false);
  const [connected, setConnected] = useState(false);

  const socketRef = useSocket(worldId);

  useEffect(() => {
    if (!slug) return;
    api.get<WorldData>(`/api/worlds/${slug}`).then(({ data }) => {
      setWorldData(data);
      setWorld(data.id, data.name);
    }).catch(() => navigate('/worlds'));
  }, [slug]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) setConnected(true);
    return () => { socket.off('connect', onConnect); socket.off('disconnect', onDisconnect); };
  }, [socketRef.current]);

  const binding = world?.discordBindings.find((b) => b.active) ?? null;

  return (
    <div className="h-screen flex flex-col bg-obsidian-950 overflow-hidden">
      {/* Top Bar */}
      <header className="h-10 bg-obsidian-900 border-b border-obsidian-600 flex items-center px-3 gap-3 flex-shrink-0">
        <button onClick={() => navigate('/worlds')} className="btn-ghost p-1">
          <ArrowLeft size={14} />
        </button>
        <div className="flex items-center gap-2">
          <Sword size={16} className="text-amber" />
          <span className="font-display text-sm text-amber">{world?.name ?? 'Loading...'}</span>
          {world?.systemId && (
            <span className="text-xs text-obsidian-500 font-mono">[{world.systemId}]</span>
          )}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 text-xs ${connected ? 'text-green-400' : 'text-gray-600'}`}>
            {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {connected ? 'Live' : 'Offline'}
          </div>
          <button
            onClick={() => setShowDiscord(!showDiscord)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border transition-colors ${binding ? 'border-indigo-600 text-indigo-400 bg-indigo-950/30' : 'border-obsidian-600 text-gray-400 hover:border-amber/30 hover:text-amber'}`}
          >
            <Link2 size={12} />
            {binding ? 'Discord Linked' : 'Link Discord'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Center Canvas */}
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative min-h-0 m-2">
            <SceneCanvas />
            {!world && (
              <div className="absolute inset-0 flex items-center justify-center bg-obsidian-950/70">
                <p className="text-gray-500">Loading world...</p>
              </div>
            )}
          </div>
          <MacroBar />
        </main>

        {/* Right Panel */}
        <aside className="w-72 bg-obsidian-900 border-l border-obsidian-600 flex flex-col h-full">
          {/* Panel Tabs */}
          <div className="flex border-b border-obsidian-600">
            {RIGHT_PANELS.map((p) => (
              <button
                key={p.id}
                onClick={() => setRightPanel(p.id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${rightPanel === p.id ? 'text-amber border-b-2 border-amber bg-obsidian-800' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {p.icon}
                <span className="text-xs">{p.label}</span>
              </button>
            ))}
          </div>

          {/* Panel Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {rightPanel === 'chat' && <ChatPanel />}
            {rightPanel === 'rolls' && <DiceRoller />}
            {rightPanel === 'combat' && <CombatTracker />}
            {rightPanel === 'rules' && <RulesSearch />}
          </div>

          {/* Discord Panel */}
          {showDiscord && (
            <div className="border-t border-obsidian-600 bg-obsidian-800">
              <div className="panel-header">Discord Integration</div>
              {worldId && (
                <DiscordPanel
                  worldId={worldId}
                  binding={binding}
                  onBound={() => {}}
                />
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
