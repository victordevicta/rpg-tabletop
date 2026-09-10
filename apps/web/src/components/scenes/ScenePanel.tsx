import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ImageIcon, Plus, Play, Trash2, Upload, X } from 'lucide-react';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { useTableStore } from '../../store/useTableStore';

interface SceneDoc {
  id: string;
  name: string;
  data: { img?: string; active: boolean };
}

const STARTER_PACK = [
  { name: 'Old Tavern',      img: 'https://picsum.photos/seed/old-tavern-rpg/1024/768' },
  { name: 'Dark Forest',     img: 'https://picsum.photos/seed/dark-forest-rpg/1024/768' },
  { name: 'Stone Dungeon',   img: 'https://picsum.photos/seed/stone-dungeon-rpg/1024/768' },
  { name: 'Mountain Pass',   img: 'https://picsum.photos/seed/mountain-pass-rpg/1024/768' },
  { name: 'Village Square',  img: 'https://picsum.photos/seed/village-square-rpg/1024/768' },
  { name: 'Ancient Ruins',   img: 'https://picsum.photos/seed/ancient-ruins-rpg/1024/768' },
];

type ModalTab = 'starter' | 'url' | 'upload';

function AddSceneModal({
  worldId,
  onClose,
  onAdded,
}: {
  worldId: string;
  onClose: () => void;
  onAdded: (doc: SceneDoc) => void;
}) {
  const [tab, setTab] = useState<ModalTab>('starter');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function save(sceneName: string, img: string) {
    setSaving(true);
    try {
      const { data } = await api.post(`/api/worlds/${worldId}/documents`, {
        type: 'scene',
        name: sceneName,
        data: {
          img,
          active: false,
          width: 1024,
          height: 768,
          gridSize: 64,
          gridType: 'square',
          padding: 0,
          backgroundColor: '#0a0a0f',
          tokens: [],
        },
      });
      onAdded({ id: data.id, name: data.name, data: { img, active: false } });
      onClose();
    } catch (e) {
      console.error('Failed to save scene', e);
    } finally {
      setSaving(false);
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setName((n) => n || file.name.replace(/\.[^.]+$/, ''));
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  const TABS: { id: ModalTab; label: string }[] = [
    { id: 'starter', label: 'Starter Pack' },
    { id: 'url',     label: 'URL' },
    { id: 'upload',  label: 'Upload' },
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-obsidian-900 border border-obsidian-600 rounded-lg w-[480px] max-h-[90vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-obsidian-600">
          <h3 className="font-display text-amber text-sm">Add Scene</h3>
          <button onClick={onClose} className="btn-ghost p-1"><X size={14} /></button>
        </div>

        <div className="flex border-b border-obsidian-600">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 text-xs transition-colors ${
                tab === t.id
                  ? 'text-amber border-b-2 border-amber bg-obsidian-800'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'starter' && (
            <div className="grid grid-cols-2 gap-3">
              {STARTER_PACK.map((map) => (
                <button
                  key={map.name}
                  onClick={() => save(map.name, map.img)}
                  disabled={saving}
                  className="group relative rounded overflow-hidden border border-obsidian-600 hover:border-amber/60 transition-colors aspect-video bg-obsidian-800"
                >
                  <img
                    src={map.img}
                    alt={map.name}
                    className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <p className="text-xs text-white font-medium">{map.name}</p>
                  </div>
                </button>
              ))}
              <p className="col-span-2 text-xs text-gray-600 text-center pt-1">
                Placeholder images — replace with your own maps via URL or Upload.
              </p>
            </div>
          )}

          {tab === 'url' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Scene Name</label>
                <input
                  className="input-dark w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dark Forest"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Image URL</label>
                <input
                  className="input-dark w-full font-mono text-xs"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              {url && (
                <div className="rounded overflow-hidden border border-obsidian-600 aspect-video bg-obsidian-800">
                  <img
                    src={url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                  />
                </div>
              )}
              <button
                onClick={() => save(name.trim() || 'Untitled Scene', url)}
                disabled={!url || saving}
                className="btn-primary w-full"
              >
                {saving ? 'Saving...' : 'Add Scene'}
              </button>
            </div>
          )}

          {tab === 'upload' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Scene Name</label>
                <input
                  className="input-dark w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. My Custom Map"
                />
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-obsidian-600 hover:border-amber/40 rounded-lg p-6 flex flex-col items-center gap-2 transition-colors"
              >
                <Upload size={24} className="text-gray-500" />
                <span className="text-xs text-gray-500">Click to select image</span>
              </button>
              {preview && (
                <div className="rounded overflow-hidden border border-obsidian-600 aspect-video">
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
              <button
                onClick={() => save(name.trim() || 'Untitled Scene', preview!)}
                disabled={!preview || saving}
                className="btn-primary w-full"
              >
                {saving ? 'Saving...' : 'Add Scene'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function ScenePanel() {
  const worldId = useTableStore((s) => s.worldId);
  const activeSceneId = useTableStore((s) => s.activeSceneId);
  const setActiveScene = useTableStore((s) => s.setActiveScene);
  const [docs, setDocs] = useState<SceneDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!worldId) return;
    setLoading(true);
    api
      .get(`/api/worlds/${worldId}/documents?type=scene`)
      .then(({ data }) =>
        setDocs(
          (data as any[]).map((d) => ({
            id: d.id,
            name: d.name,
            data: { img: d.data?.img, active: d.data?.active ?? false },
          })),
        ),
      )
      .finally(() => setLoading(false));
  }, [worldId]);

  function activate(doc: SceneDoc) {
    if (!worldId) return;
    setActiveScene(doc.id, doc.data.img ?? null);
    getSocket().emit('scene:activate', { worldId, sceneId: doc.id });
  }

  async function remove(doc: SceneDoc) {
    if (!worldId) return;
    try {
      await api.delete(`/api/worlds/${worldId}/documents/${doc.id}`);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      if (activeSceneId === doc.id) setActiveScene(null, null);
    } catch (e) {
      console.error('Failed to delete scene', e);
    }
  }

  return (
    <div className="py-1 space-y-0.5">
      {loading && <p className="text-xs text-gray-600 px-3 py-1">Loading...</p>}
      {!loading && docs.length === 0 && (
        <p className="text-xs text-gray-600 px-3 py-1">No scenes yet</p>
      )}
      {docs.map((doc) => {
        const isActive = activeSceneId === doc.id;
        return (
          <div
            key={doc.id}
            className={`group flex items-center gap-2 px-3 py-1 rounded-md text-xs transition-colors ${
              isActive ? 'bg-amber/10 text-amber' : 'text-gray-400 hover:text-gray-200 hover:bg-obsidian-700'
            }`}
          >
            {doc.data.img ? (
              <img
                src={doc.data.img}
                alt=""
                className="w-6 h-6 rounded object-cover flex-shrink-0 opacity-70"
              />
            ) : (
              <ImageIcon size={14} className="flex-shrink-0 text-gray-600" />
            )}
            <span className="flex-1 truncate">{doc.name}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => activate(doc)}
                title={isActive ? 'Active' : 'Activate scene'}
                className="p-0.5 hover:text-amber transition-colors"
              >
                {isActive ? <Check size={11} /> : <Play size={11} />}
              </button>
              <button
                onClick={() => remove(doc)}
                title="Delete scene"
                className="p-0.5 hover:text-red-400 transition-colors"
              >
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        );
      })}

      <button
        onClick={() => setShowModal(true)}
        disabled={!worldId}
        className="sidebar-item text-xs py-1 text-gray-600 hover:text-amber w-full justify-start"
      >
        <Plus size={11} /> Add Scene
      </button>

      {showModal && worldId && (
        <AddSceneModal
          worldId={worldId}
          onClose={() => setShowModal(false)}
          onAdded={(doc) => setDocs((prev) => [...prev, doc])}
        />
      )}
    </div>
  );
}
