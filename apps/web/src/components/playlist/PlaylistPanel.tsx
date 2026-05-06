import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Trash2,
  Music,
  Loader,
  ChevronDown,
  ChevronUp,
  X,
  Folder,
  Shuffle,
} from "lucide-react";
import { api } from "../../lib/api";
import {
  getSpotifyToken,
  startSpotifyAuth,
  resolveSpotifyUrl,
} from "../../lib/spotify";
import { useTableStore } from "../../store/useTableStore";
import {
  usePlaylistStore,
  type PlaylistSource,
  type PlaylistTrack,
} from "../../store/usePlaylistStore";

// ── Brand logos ───────────────────────────────────────────────────────────────

const YTLogo = () => (
  <svg width="15" height="11" viewBox="0 0 15 11" aria-hidden="true">
    <rect width="15" height="11" rx="2" fill="#FF0000" />
    <polygon points="6,2.5 6,8.5 11,5.5" fill="white" />
  </svg>
);

const SpotifyLogo = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">
    <circle cx="6.5" cy="6.5" r="6.5" fill="#1DB954" />
    <path
      d="M3.5 4.8 Q6.5 3.2 9.5 4.8"
      stroke="white"
      strokeWidth="1.1"
      fill="none"
      strokeLinecap="round"
    />
    <path
      d="M4 6.6 Q6.5 5.2 9 6.6"
      stroke="white"
      strokeWidth="1.1"
      fill="none"
      strokeLinecap="round"
    />
    <path
      d="M4.5 8.4 Q6.5 7.2 8.5 8.4"
      stroke="white"
      strokeWidth="1.1"
      fill="none"
      strokeLinecap="round"
    />
  </svg>
);

// ── SDK loaders ───────────────────────────────────────────────────────────────

function loadYTScript(): Promise<void> {
  if ((window as any).YT?.Player) return Promise.resolve();
  return new Promise((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    (window as any).onYouTubeIframeAPIReady = resolve;
  });
}

function loadSpotifyScript(): Promise<any> {
  if ((window as any)._spotifyIFrameApi)
    return Promise.resolve((window as any)._spotifyIFrameApi);
  return new Promise((resolve) => {
    if (!(window as any)._spotifyScriptAdded) {
      (window as any)._spotifyScriptAdded = true;
      const tag = document.createElement("script");
      tag.src = "https://open.spotify.com/embed/iframe-api/v1";
      tag.async = true;
      document.head.appendChild(tag);
    }
    (window as any).onSpotifyIframeApiReady = (IFrameAPI: any) => {
      (window as any)._spotifyIFrameApi = IFrameAPI;
      resolve(IFrameAPI);
    };
  });
}

// ── Add Source Modal (YouTube / Spotify URLs) ─────────────────────────────────

function AddSourceModal({
  onClose,
  onAdd,
  initialUrl = "",
}: {
  onClose: () => void;
  onAdd: (s: PlaylistSource) => void;
  initialUrl?: string;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PlaylistSource | null>(null);
  const [error, setError] = useState("");
  const worldId = useTableStore((s) => s.worldId);

  async function resolve(target = url) {
    const raw = target.trim();
    if (!raw) return;
    setLoading(true);
    setError("");
    setPreview(null);
    try {
      const isSpotify =
        raw.includes("spotify.com") || raw.startsWith("spotify:");
      if (isSpotify) {
        const token = getSpotifyToken();
        if (!token) {
          await startSpotifyAuth(raw);
          return; // page redirects to Spotify — execution stops here
        }
        const data = await resolveSpotifyUrl(raw, token);
        setPreview({ ...data, docId: "", sourceProvider: "spotify" });
      } else {
        const { data } = await api.get("/api/youtube/resolve", {
          params: { url: raw },
        });
        setPreview({ ...data, docId: "", sourceProvider: "youtube" });
      }
    } catch (e: any) {
      setError(
        e?.response?.data?.message ??
          e?.message ??
          "URL inválida ou credenciais não configuradas",
      );
    } finally {
      setLoading(false);
    }
  }

  // Auto-resolve when opened after Spotify OAuth redirect (token already exists)
  useEffect(() => {
    if (initialUrl && getSpotifyToken()) resolve(initialUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    if (!preview || !worldId) return;
    setLoading(true);
    try {
      const { docId: _ignored, ...sourceData } = preview;
      const { data } = await api.post(`/api/worlds/${worldId}/documents`, {
        type: "playlist",
        name: preview.title,
        data: sourceData,
      });
      onAdd({ ...preview, docId: data.id });
      onClose();
    } catch {
      setError("Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  const isSpotify = preview?.sourceProvider === "spotify";

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="panel w-full max-w-lg p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-amber">Adicionar fonte de música</h3>
          <button onClick={onClose} className="btn-ghost p-1">
            <X size={15} />
          </button>
        </div>

        <div className="flex gap-2 mb-3">
          <input
            className="input-dark flex-1 text-sm"
            placeholder="URL do YouTube ou Spotify"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && resolve(url)}
          />
          <button
            onClick={() => resolve(url)}
            disabled={loading || !url.trim()}
            className="btn-primary px-3 disabled:opacity-50"
          >
            {loading ? <Loader size={14} className="animate-spin" /> : "Buscar"}
          </button>
        </div>

        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

        {preview && (
          <div className="border border-obsidian-600 rounded-lg p-3 mb-4 bg-obsidian-900 space-y-3">
            <div className="flex gap-3">
              <img
                src={preview.thumbnail}
                alt=""
                className="w-20 h-12 object-cover rounded flex-shrink-0 bg-obsidian-700"
              />
              <div className="min-w-0">
                <p className="text-gray-200 text-sm font-medium truncate">
                  {preview.title}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">
                  <span
                    className={isSpotify ? "text-green-500" : "text-red-400"}
                  >
                    {isSpotify ? "♫ Spotify" : "▶ YouTube"}
                  </span>
                  {" · "}
                  {preview.sourceType === "playlist"
                    ? `${preview.tracks.length} faixas`
                    : "Faixa única"}
                </p>
              </div>
            </div>

            {preview.tracks.length > 1 && (
              <div className="max-h-36 overflow-y-auto space-y-1">
                {preview.tracks.map((t, i) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 text-xs text-gray-400 py-0.5"
                  >
                    <span className="text-gray-600 w-5 text-right flex-shrink-0">
                      {i + 1}
                    </span>
                    {!isSpotify && (
                      <img
                        src={t.thumbnail}
                        alt=""
                        className="w-8 h-5 object-cover rounded flex-shrink-0 bg-obsidian-700"
                      />
                    )}
                    <span className="truncate">{t.title}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="btn-ghost flex-1 text-xs">
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={loading}
                className="btn-primary flex-1 text-xs disabled:opacity-50"
              >
                {loading ? "Salvando..." : "Adicionar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-1.5 px-1 pt-2 pb-1">
      {icon}
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </span>
      {count > 0 && (
        <span className="ml-auto text-[9px] text-gray-600">{count}</span>
      )}
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export default function PlaylistPanel() {
  const ytPlayerDivRef = useRef<HTMLDivElement>(null);
  const spotifyPlayerDivRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const localFileInputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const spotifyApiRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const spotifyControllerRef = useRef<any>(null);
  const ytLoadingRef      = useRef(false); // true while loadVideoById is in-flight
  const spotifyLoadingRef = useRef(false); // true while loadUri is in-flight
  const shuffleQueueRef   = useRef<number[]>([]); // shuffled track indices for active source
  const shufflePosRef     = useRef(0);             // current position in shuffle queue

  const [ytReady, setYtReady] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [spotifyReady, setSpotifyReady] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [pendingUrl, setPendingUrl] = useState("");
  const [trackOpen, setTrackOpen] = useState<string | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(true);

  const worldId = useTableStore((s) => s.worldId);
  const {
    sources,
    activeId,
    trackIndex,
    isPlaying,
    volume,
    isShuffled,
    setSources,
    addSource,
    removeSource,
    play,
    pause,
    resume,
    setTrack,
    nextTrack,
    prevTrack,
    setVolume,
    setIsPlaying,
    toggleShuffle,
  } = usePlaylistStore();

  // ── Shuffle helpers ───────────────────────────────────────────────────────
  function buildShuffleQueue(src: PlaylistSource, startIdx: number) {
    const others = src.tracks.map((_, i) => i).filter((i) => i !== startIdx);
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    shuffleQueueRef.current = [startIdx, ...others];
    shufflePosRef.current   = 0;
  }

  function shuffleNext(): number {
    shufflePosRef.current = (shufflePosRef.current + 1) % shuffleQueueRef.current.length;
    return shuffleQueueRef.current[shufflePosRef.current];
  }

  function shufflePrev(): number {
    shufflePosRef.current =
      (shufflePosRef.current - 1 + shuffleQueueRef.current.length) % shuffleQueueRef.current.length;
    return shuffleQueueRef.current[shufflePosRef.current];
  }

  // ── Rebuild shuffle queue when toggle changes ─────────────────────────────
  useEffect(() => {
    if (isShuffled && activeSource) {
      buildShuffleQueue(activeSource, trackIndex);
    } else {
      shuffleQueueRef.current = [];
      shufflePosRef.current   = 0;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isShuffled]);

  // ── Pick up pending Spotify URL after OAuth redirect ─────────────────────
  useEffect(() => {
    const url = sessionStorage.getItem('sp_return_url') ?? '';
    if (url) {
      sessionStorage.removeItem('sp_return_url');
      setPendingUrl(url);
      setShowAdd(true);
    }
  }, []);

  // ── Load saved playlists ──────────────────────────────────────────────────
  useEffect(() => {
    if (!worldId) return;
    api
      .get(`/api/worlds/${worldId}/documents`, { params: { type: "playlist" } })
      .then(({ data }) => {
        const loaded: PlaylistSource[] = data.map((d: any) => ({
          ...d.data,
          docId: d.id,
          sourceProvider: d.data.sourceProvider ?? "youtube",
        }));
        setSources(loaded);
      })
      .finally(() => setLoadingDocs(false));
  }, [worldId, setSources]);

  // ── Load SDKs ─────────────────────────────────────────────────────────────
  useEffect(() => {
    loadYTScript().then(() => setYtReady(true));
    loadSpotifyScript().then((iframeApi) => {
      spotifyApiRef.current = iframeApi;
      setSpotifyReady(true);
    });
  }, []);

  // ── Create YT.Player ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!ytReady || !ytPlayerDivRef.current) return;
    const YTApi = (window as any).YT;
    playerRef.current = new YTApi.Player(ytPlayerDivRef.current, {
      height: "100%",
      width: "100%",
      playerVars: { autoplay: 0, controls: 1, modestbranding: 1, rel: 0 },
      events: {
        onReady: () => setPlayerReady(true),
        onStateChange: (e: { data: number }) => {
          const store = usePlaylistStore.getState();
          const activeSrc = store.sources.find(
            (s) => s.docId === store.activeId,
          );
          // Ignore YT events when another provider is active (e.g. cross-provider switch)
          if (activeSrc?.sourceProvider !== "youtube") return;
          if (e.data === 1) {
            ytLoadingRef.current = false;
            setIsPlaying(true);
          } else if (e.data === 2 && !ytLoadingRef.current) {
            // Only update state on "natural" pauses, not mid-transition pauses
            setIsPlaying(false);
          } else if (e.data === 0) {
            let nextActualIdx: number;
            if (store.isShuffled && shuffleQueueRef.current.length > 0) {
              shufflePosRef.current = (shufflePosRef.current + 1) % shuffleQueueRef.current.length;
              nextActualIdx = shuffleQueueRef.current[shufflePosRef.current];
              store.setTrack(nextActualIdx);
            } else {
              nextActualIdx = (store.trackIndex + 1) % activeSrc.tracks.length;
              store.nextTrack();
            }
            const next = activeSrc.tracks[nextActualIdx];
            if (next) { ytLoadingRef.current = true; playerRef.current?.loadVideoById(next.id); }
          }
        },
      },
    });
    return () => {
      setPlayerReady(false);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ytReady]);

  // ── Init Spotify controller on first activation ───────────────────────────
  useEffect(() => {
    if (!spotifyReady || !spotifyPlayerDivRef.current) return;
    const src = sources.find((s) => s.docId === activeId);
    if (!src || src.sourceProvider !== "spotify") return;
    if (spotifyControllerRef.current) return;
    const startTrack = src.tracks[trackIndex];
    const startUri = startTrack
      ? `spotify:track:${startTrack.id}`
      : src.spotifyUri!;
    spotifyApiRef.current!.createController(
      spotifyPlayerDivRef.current,
      { uri: startUri },
      (controller: any) => {
        spotifyControllerRef.current = controller;
        controller.addListener("playback_update", (e: any) => {
          if (typeof e.data?.isPaused !== "boolean") return;
          if (!e.data.isPaused) {
            spotifyLoadingRef.current = false;
            setIsPlaying(true);
          } else if (!spotifyLoadingRef.current) {
            setIsPlaying(false);
          }
        });
        controller.play();
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotifyReady, activeId]);

  // ── Volume sync ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (playerReady) playerRef.current?.setVolume(volume);
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume, playerReady]);

  // ── Computed ──────────────────────────────────────────────────────────────
  const activeSource = sources.find((s) => s.docId === activeId);
  const activeTrack = activeSource?.tracks[trackIndex];
  const isSpotifyActive = activeSource?.sourceProvider === "spotify";
  const isLocalActive = activeSource?.sourceProvider === "local";

  const youtubeSources = sources.filter((s) => s.sourceProvider === "youtube");
  const spotifySources = sources.filter((s) => s.sourceProvider === "spotify");
  const localSources = sources.filter((s) => s.sourceProvider === "local");

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleDelete(docId: string) {
    const src = sources.find((s) => s.docId === docId);
    if (src?.sourceProvider !== "local") {
      await api.delete(`/api/worlds/${worldId}/documents/${docId}`);
    }
    if (docId === activeId) {
      playerRef.current?.pauseVideo();
      spotifyControllerRef.current?.pause();
      audioRef.current?.pause();
    }
    removeSource(docId);
  }

  function playTrack(src: PlaylistSource, idx: number) {
    // Cross-provider pause
    if (activeSource && activeSource.sourceProvider !== src.sourceProvider) {
      if (activeSource.sourceProvider === "youtube")
        playerRef.current?.pauseVideo();
      else if (activeSource.sourceProvider === "spotify")
        spotifyControllerRef.current?.pause();
      else if (activeSource.sourceProvider === "local")
        audioRef.current?.pause();
    }
    play(src.docId, idx);
    if (isShuffled) buildShuffleQueue(src, idx);

    if (src.sourceProvider === "spotify") {
      const uri = src.tracks[idx]
        ? `spotify:track:${src.tracks[idx].id}`
        : src.spotifyUri!;
      if (spotifyControllerRef.current) {
        spotifyLoadingRef.current = true;
        spotifyControllerRef.current.loadUri(uri);
        spotifyControllerRef.current.play();
      }
      // else: init effect fires after render and plays
    } else if (src.sourceProvider === "local") {
      const track = src.tracks[idx];
      if (!track?.file || !audioRef.current) return;
      const prev = audioRef.current.src;
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      audioRef.current.src = URL.createObjectURL(track.file);
      audioRef.current.volume = volume / 100;
      audioRef.current.play().catch(() => {});
    } else {
      const p = playerRef.current;
      if (!p) return;
      const track = src.tracks[idx];
      if (!track) return;
      ytLoadingRef.current = true;
      if (src.sourceType === "playlist" && src.tracks.length > 1) {
        p.loadPlaylist({
          listType: "playlist",
          list: src.youtubeId!,
          index: idx,
        });
      } else {
        p.loadVideoById(track.id);
      }
      p.setVolume(volume);
    }
  }

  function handlePlayPause() {
    if (!activeId || !activeSource) return;
    if (activeSource.sourceProvider === "spotify") {
      if (isPlaying) {
        pause();
        spotifyControllerRef.current?.pause();
      } else {
        resume();
        spotifyControllerRef.current?.play();
      }
    } else if (activeSource.sourceProvider === "local") {
      if (isPlaying) {
        pause();
        audioRef.current?.pause();
      } else {
        resume();
        audioRef.current?.play().catch(() => {});
      }
    } else {
      if (isPlaying) {
        pause();
        playerRef.current?.pauseVideo();
      } else {
        resume();
        playerRef.current?.playVideo();
      }
    }
  }

  function handleNext() {
    if (!activeSource) return;
    let nextIdx: number;
    if (isShuffled && shuffleQueueRef.current.length > 0) {
      nextIdx = shuffleNext();
      setTrack(nextIdx);
    } else {
      nextIdx = (trackIndex + 1) % activeSource.tracks.length;
      nextTrack();
    }
    const track = activeSource.tracks[nextIdx];
    if (!track) return;
    if (isLocalActive) {
      if (!track.file || !audioRef.current) return;
      const prev = audioRef.current.src;
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      audioRef.current.src = URL.createObjectURL(track.file);
      audioRef.current.play().catch(() => {});
    } else if (isSpotifyActive) {
      spotifyLoadingRef.current = true;
      spotifyControllerRef.current?.loadUri(`spotify:track:${track.id}`);
      spotifyControllerRef.current?.play();
    } else {
      ytLoadingRef.current = true;
      playerRef.current?.loadVideoById(track.id);
    }
  }

  function handlePrev() {
    if (!activeSource) return;
    let prevIdx: number;
    if (isShuffled && shuffleQueueRef.current.length > 0) {
      prevIdx = shufflePrev();
      setTrack(prevIdx);
    } else {
      prevIdx = (trackIndex - 1 + activeSource.tracks.length) % activeSource.tracks.length;
      prevTrack();
    }
    const track = activeSource.tracks[prevIdx];
    if (!track) return;
    if (isLocalActive) {
      if (!track.file || !audioRef.current) return;
      const prev = audioRef.current.src;
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      audioRef.current.src = URL.createObjectURL(track.file);
      audioRef.current.play().catch(() => {});
    } else if (isSpotifyActive) {
      spotifyLoadingRef.current = true;
      spotifyControllerRef.current?.loadUri(`spotify:track:${track.id}`);
      spotifyControllerRef.current?.play();
    } else {
      ytLoadingRef.current = true;
      playerRef.current?.loadVideoById(track.id);
    }
  }

  function handleLocalEnded() {
    const store = usePlaylistStore.getState();
    const src   = store.sources.find((s) => s.docId === store.activeId);
    if (!src || src.sourceProvider !== "local") return;
    let nextIdx: number;
    if (store.isShuffled && shuffleQueueRef.current.length > 0) {
      shufflePosRef.current = (shufflePosRef.current + 1) % shuffleQueueRef.current.length;
      nextIdx = shuffleQueueRef.current[shufflePosRef.current];
      store.setTrack(nextIdx);
    } else {
      nextIdx = (store.trackIndex + 1) % src.tracks.length;
      store.nextTrack();
    }
    const track = src.tracks[nextIdx];
    if (track?.file && audioRef.current) {
      const prev = audioRef.current.src;
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      audioRef.current.src = URL.createObjectURL(track.file);
      audioRef.current.play().catch(() => {});
    }
  }

  function handleLocalFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) =>
      f.type.startsWith("audio/"),
    );
    if (!files.length) return;
    files.sort((a, b) => a.name.localeCompare(b.name));

    const tracks: PlaylistTrack[] = files.map((f) => ({
      id: `local-${f.name}-${f.lastModified}`,
      title: f.name.replace(/\.[^.]+$/, ""),
      thumbnail: "",
      file: f,
    }));

    const src: PlaylistSource = {
      docId: `local-${Date.now()}`,
      sourceProvider: "local",
      sourceType: files.length === 1 ? "video" : "playlist",
      title:
        files.length === 1
          ? tracks[0].title
          : `${tracks[0].title} + ${files.length - 1} faixa${files.length > 2 ? "s" : ""}`,
      thumbnail: "",
      tracks,
    };

    addSource(src);
    e.target.value = "";
  }

  // ── Source row renderer ───────────────────────────────────────────────────

  function renderSource(src: PlaylistSource) {
    const isActive = src.docId === activeId;
    const tracksOpen = trackOpen === src.docId;
    const isLocal = src.sourceProvider === "local";
    const isSp = src.sourceProvider === "spotify";

    return (
      <div
        key={src.docId}
        className={`rounded border text-xs transition-colors ${
          isActive
            ? "border-amber/40 bg-obsidian-800"
            : "border-obsidian-700 bg-obsidian-900"
        }`}
      >
        <div className="flex items-center gap-1.5 px-1.5 py-1">
          {isLocal ? (
            <div className="w-8 h-5 rounded bg-obsidian-700 flex items-center justify-center flex-shrink-0">
              <Music size={10} className="text-obsidian-400" />
            </div>
          ) : (
            <img
              src={src.thumbnail}
              alt=""
              className="w-8 h-5 object-cover rounded flex-shrink-0 bg-obsidian-700"
            />
          )}
          <span className="flex-1 truncate text-gray-300">{src.title}</span>

          <button
            className={`flex-shrink-0 ${isActive && isPlaying ? "text-amber" : "text-gray-500 hover:text-amber"}`}
            onClick={() => (isActive ? handlePlayPause() : playTrack(src, 0))}
          >
            {isActive && isPlaying ? <Pause size={12} /> : <Play size={12} />}
          </button>

          {src.tracks.length > 1 && (
            <button
              className="text-gray-600 hover:text-gray-300 flex-shrink-0"
              onClick={() => setTrackOpen(tracksOpen ? null : src.docId)}
            >
              {tracksOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          )}

          <button
            className="text-gray-700 hover:text-red-400 flex-shrink-0"
            onClick={() => handleDelete(src.docId)}
          >
            <Trash2 size={11} />
          </button>
        </div>

        {tracksOpen && (
          <div className="border-t border-obsidian-700 max-h-36 overflow-y-auto">
            {src.tracks.map((t, i) => (
              <button
                key={t.id}
                onClick={() => playTrack(src, i)}
                className={`flex items-center gap-1.5 w-full px-2 py-1 text-left hover:bg-obsidian-700 transition-colors ${
                  isActive && trackIndex === i ? "text-amber" : "text-gray-400"
                }`}
              >
                <span className="w-4 text-right text-gray-600 flex-shrink-0">
                  {i + 1}
                </span>
                {!isSp && !isLocal && (
                  <img
                    src={t.thumbnail}
                    alt=""
                    className="w-6 h-4 object-cover rounded flex-shrink-0 bg-obsidian-700"
                  />
                )}
                <span className="truncate">{t.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Hidden players — rendered in body so they stay in the viewport (avoids Chrome autoplay + Spotify DRM blocks) */}
      {createPortal(
        <>
          <div
            style={{
              position: "fixed",
              right: 0,
              bottom: 0,
              width: "320px",
              height: "180px",
              opacity: 0,
              pointerEvents: "none",
              zIndex: -1,
            }}
            aria-hidden="true"
          >
            <div
              ref={ytPlayerDivRef}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
          <div
            style={{
              position: "fixed",
              right: 0,
              bottom: "180px",
              width: "300px",
              height: "160px",
              opacity: 0,
              pointerEvents: "none",
              zIndex: -1,
            }}
            aria-hidden="true"
          >
            <div
              ref={spotifyPlayerDivRef}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        </>,
        document.body,
      )}

      {/* Hidden audio element for local playback */}
      <audio
        ref={audioRef}
        onEnded={handleLocalEnded}
        onPlay={() => {
          const s = usePlaylistStore.getState();
          if (
            s.sources.find((x) => x.docId === s.activeId)?.sourceProvider ===
            "local"
          )
            s.setIsPlaying(true);
        }}
        onPause={() => {
          const s = usePlaylistStore.getState();
          if (
            s.sources.find((x) => x.docId === s.activeId)?.sourceProvider ===
            "local"
          )
            s.setIsPlaying(false);
        }}
      />

      {/* Hidden file input for local files */}
      <input
        ref={localFileInputRef}
        type="file"
        multiple
        accept="audio/*"
        style={{ display: "none" }}
        onChange={handleLocalFiles}
      />

      {showAdd && (
        <AddSourceModal
          onClose={() => { setShowAdd(false); setPendingUrl(''); }}
          onAdd={addSource}
          initialUrl={pendingUrl}
        />
      )}

      {loadingDocs ? (
        <p className="text-xs text-gray-600 py-1 px-1">Carregando...</p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {/* ── YouTube section ── */}
          <SectionHeader
            icon={<YTLogo />}
            label="YouTube"
            count={youtubeSources.length}
          />
          {youtubeSources.map(renderSource)}
          <button
            onClick={() => setShowAdd(true)}
            className="sidebar-item text-xs py-1 text-gray-600 hover:text-amber w-full justify-start"
          >
            <Plus size={11} /> Adicionar
          </button>

          {/* ── Spotify section ── */}
          <SectionHeader
            icon={<SpotifyLogo />}
            label="Spotify"
            count={spotifySources.length}
          />
          {spotifySources.map(renderSource)}
          <button
            onClick={() => setShowAdd(true)}
            className="sidebar-item text-xs py-1 text-gray-600 hover:text-amber w-full justify-start"
          >
            <Plus size={11} /> Adicionar
          </button>

          {/* ── Local section ── */}
          <SectionHeader
            icon={<Folder size={11} className="text-gray-500" />}
            label="Local"
            count={localSources.length}
          />
          {localSources.map(renderSource)}
          <button
            onClick={() => localFileInputRef.current?.click()}
            className="sidebar-item text-xs py-1 text-gray-600 hover:text-amber w-full justify-start"
          >
            <Plus size={11} /> Adicionar arquivos
          </button>

          {/* ── Player bar ── */}
          <div className="mt-2 border border-obsidian-600 rounded-lg bg-obsidian-900">
            {/* Track info */}
            <div className="flex items-center gap-2 px-2 pt-2 pb-1 min-w-0">
              {activeTrack && activeTrack.thumbnail && !isLocalActive ? (
                <img
                  src={activeTrack.thumbnail}
                  alt=""
                  className="w-8 h-8 object-cover rounded flex-shrink-0 bg-obsidian-700"
                />
              ) : (
                <div className="w-8 h-8 rounded bg-obsidian-800 flex items-center justify-center flex-shrink-0">
                  <Music
                    size={14}
                    className={
                      activeTrack ? "text-obsidian-400" : "text-obsidian-700"
                    }
                  />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-gray-300 text-xs font-medium truncate">
                  {activeTrack?.title ?? "Nenhuma faixa ativa"}
                </p>
                {activeSource && (
                  <p className="text-gray-600 text-[10px] truncate">
                    {activeSource.title}
                  </p>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1 px-2 pb-2">
              <button
                onClick={handlePrev}
                disabled={
                  !activeSource || (activeSource?.tracks.length ?? 0) <= 1
                }
                className="text-gray-500 hover:text-gray-200 disabled:opacity-30 p-1"
              >
                <SkipBack size={13} />
              </button>
              <button
                onClick={handlePlayPause}
                disabled={!activeSource}
                className="text-amber hover:text-amber/80 p-1 disabled:opacity-30"
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button
                onClick={handleNext}
                disabled={
                  !activeSource || (activeSource?.tracks.length ?? 0) <= 1
                }
                className="text-gray-500 hover:text-gray-200 disabled:opacity-30 p-1"
              >
                <SkipForward size={13} />
              </button>
              <button
                onClick={toggleShuffle}
                className={`p-1 ${isShuffled ? "text-amber" : "text-gray-600 hover:text-gray-200"}`}
                title={isShuffled ? "Shuffle ativo" : "Shuffle inativo"}
              >
                <Shuffle size={13} />
              </button>
              <div className="flex items-center gap-1 ml-auto">
                <Volume2 size={11} className="text-gray-500 flex-shrink-0" />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-16 accent-amber h-1 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
