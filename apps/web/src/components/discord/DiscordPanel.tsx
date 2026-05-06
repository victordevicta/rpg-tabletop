import { useState } from 'react';
import { Link2, ExternalLink, Check } from 'lucide-react';
import { api } from '../../lib/api';
import { useTableStore } from '../../store/useTableStore';

interface DiscordPanelProps {
  worldId: string;
  binding?: {
    discordGuildId: string;
    discordChannelId: string;
    active: boolean;
  } | null;
  onBound: () => void;
}

export default function DiscordPanel({ worldId, binding, onBound }: DiscordPanelProps) {
  const [guildId, setGuildId] = useState('');
  const [channelId, setChannelId] = useState('');
  const [binding2, setBinding2] = useState(binding);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function bind() {
    if (!guildId.trim() || !channelId.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/api/worlds/${worldId}/discord-bind`, {
        discordGuildId: guildId.trim(),
        discordChannelId: channelId.trim(),
      });
      setBinding2(data);
      setDone(true);
      onBound();
    } finally {
      setLoading(false);
    }
  }

  if (binding2?.active || done) {
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <Check size={16} /> Discord Linked
        </div>
        <div className="panel p-3 space-y-1 text-xs">
          <div><span className="text-gray-500">Guild ID:</span> <span className="font-mono text-gray-300">{binding2?.discordGuildId}</span></div>
          <div><span className="text-gray-500">Channel ID:</span> <span className="font-mono text-gray-300">{binding2?.discordChannelId}</span></div>
        </div>
        <p className="text-xs text-gray-500">
          Run <span className="font-mono text-amber">/session link</span> in Discord to get the table link.
        </p>
        <p className="text-xs text-gray-500">
          Run <span className="font-mono text-amber">/roll 1d20</span> in Discord and results appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 text-amber text-sm font-display">
        <Link2 size={14} /> Link Discord Channel
      </div>
      <p className="text-xs text-gray-500">
        Link this world to a Discord channel to sync rolls, session announcements and more.
      </p>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Guild (Server) ID</label>
          <input
            className="input-dark w-full text-xs"
            placeholder="1234567890..."
            value={guildId}
            onChange={(e) => setGuildId(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Channel ID</label>
          <input
            className="input-dark w-full text-xs"
            placeholder="9876543210..."
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
          />
        </div>
        <button
          onClick={bind}
          disabled={loading || !guildId.trim() || !channelId.trim()}
          className="btn-primary w-full text-xs disabled:opacity-50"
        >
          {loading ? 'Linking...' : 'Link Channel'}
        </button>
      </div>
      <p className="text-xs text-gray-600">
        Enable Developer Mode in Discord to copy IDs.
      </p>
    </div>
  );
}
