import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sword } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export default function LoginPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const login = useAuthStore((s) => s.login);
  const restore = useAuthStore((s) => s.restoreSession);

  useEffect(() => { restore(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      await login(name.trim(), email.trim() || undefined);
    } catch {
      setError('Could not connect to server. Make sure the API is running.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-obsidian-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="panel p-8">
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="w-16 h-16 rounded-full bg-obsidian-700 border-2 border-amber flex items-center justify-center animate-glow-pulse">
              <Sword size={32} className="text-amber" />
            </div>
            <h1 className="font-display text-3xl text-amber">Eldertable</h1>
            <p className="text-gray-400 text-sm text-center">
              Your modular virtual tabletop
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">
                Adventurer Name
              </label>
              <input
                className="input-dark w-full"
                placeholder="e.g. Gandalf"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">
                Email (optional, for persistence)
              </label>
              <input
                className="input-dark w-full"
                type="email"
                placeholder="gandalf@middleearth.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-950/30 border border-red-900/50 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Entering the archive...' : 'Enter the Table'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-600 mt-6">
            Discord OAuth2 login coming soon
          </p>
        </div>
      </motion.div>
    </div>
  );
}
