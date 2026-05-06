import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Globe, Users, Sword, LogOut, X, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';

interface World {
  id: string;
  slug: string;
  name: string;
  description?: string;
  systemId: string;
  _count: { members: number };
  owner: { id: string; name: string };
  updatedAt: string;
}

export default function WorldsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', systemId: 'generic-d20' });
  const [creating, setCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    api.get<World[]>('/api/worlds').then((r) => setWorlds(r.data)).finally(() => setLoading(false));
  }, []);

  async function createWorld() {
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post<World>('/api/worlds', form);
      setWorlds((prev) => [data, ...prev]);
      setShowCreate(false);
      setForm({ name: '', description: '', systemId: 'generic-d20' });
    } finally {
      setCreating(false);
    }
  }

  async function deleteWorld(id: string) {
    await api.delete(`/api/worlds/${id}`);
    setWorlds((prev) => prev.filter((w) => w.id !== id));
    setConfirmDeleteId(null);
  }

  const SYSTEMS = [
    { id: 'generic-d20', label: 'Generic d20' },
    { id: 'generic-d100', label: 'Generic d100' },
    { id: 'dice-pool', label: 'Dice Pool' },
    { id: 'dnd5e-srd', label: 'D&D 5e SRD' },
  ];

  return (
    <div className="min-h-screen bg-obsidian-950">
      <header className="border-b border-obsidian-600 bg-obsidian-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sword size={24} className="text-amber" />
          <span className="font-display text-xl text-amber">Eldertable</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">
            Welcome, <span className="text-gray-200">{user?.name}</span>
          </span>
          <button onClick={logout} className="btn-ghost flex items-center gap-1.5">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl text-gray-100">Your Worlds</h1>
            <p className="text-gray-500 text-sm mt-1">Campaigns, settings, and chronicles</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New World
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-20">Loading worlds...</div>
        ) : worlds.length === 0 ? (
          <div className="text-center py-20">
            <Globe size={48} className="text-obsidian-500 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No worlds yet. Create your first!</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              Create a World
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {worlds.map((world) => (
                <motion.div
                  key={world.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="panel p-5 cursor-pointer hover:border-amber/40 transition-colors group"
                  onClick={() => navigate(`/worlds/${world.slug}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-obsidian-700 border border-obsidian-500 flex items-center justify-center group-hover:border-amber/40 transition-colors">
                      <Globe size={20} className="text-amber" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-obsidian-500 font-mono">{world.systemId}</span>
                      {world.owner.id === user?.id && (
                        confirmDeleteId === world.id ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => deleteWorld(world.id)}
                              className="text-xs text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded border border-red-800 hover:border-red-600 transition-colors"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-xs text-gray-500 hover:text-gray-300 px-1.5 py-0.5 rounded border border-obsidian-600 hover:border-obsidian-400 transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(world.id); }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-obsidian-500 hover:text-red-400"
                          >
                            <Trash2 size={14} />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                  <h3 className="font-display text-lg text-gray-100 mb-1">{world.name}</h3>
                  {world.description && (
                    <p className="text-gray-500 text-sm line-clamp-2 mb-3">{world.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <Users size={11} /> {world._count?.members ?? 0} members
                    </span>
                    <span>by {world.owner.name}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="panel w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-lg text-amber">Create World</h2>
                <button onClick={() => setShowCreate(false)} className="btn-ghost p-1">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">World Name</label>
                  <input
                    className="input-dark w-full"
                    placeholder="The Shattered Realm"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Description</label>
                  <textarea
                    className="input-dark w-full resize-none"
                    rows={2}
                    placeholder="A world where ancient evils stir..."
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">System</label>
                  <select
                    className="input-dark w-full"
                    value={form.systemId}
                    onChange={(e) => setForm((f) => ({ ...f, systemId: e.target.value }))}
                  >
                    {SYSTEMS.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowCreate(false)} className="btn-ghost flex-1">Cancel</button>
                  <button
                    onClick={createWorld}
                    disabled={creating || !form.name.trim()}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create World'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
