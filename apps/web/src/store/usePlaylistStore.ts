import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PlaylistTrack {
  id:        string;
  title:     string;
  thumbnail: string;
  file?:     File; // only for local sources — never persisted to DB
}

export interface PlaylistSource {
  docId:          string;
  sourceProvider: 'youtube' | 'spotify' | 'local';
  sourceType:     'playlist' | 'video';
  youtubeId?:     string;
  spotifyUri?:    string;
  title:          string;
  thumbnail:      string;
  tracks:         PlaylistTrack[];
}

interface PlaylistState {
  sources:       PlaylistSource[];
  activeId:      string | null;   // docId da source ativa
  trackIndex:    number;
  isPlaying:     boolean;
  volume:        number;          // 0-100
  isShuffled:    boolean;

  setSources:    (sources: PlaylistSource[]) => void;
  addSource:     (s: PlaylistSource) => void;
  removeSource:  (docId: string) => void;
  play:          (docId: string, trackIndex?: number) => void;
  pause:         () => void;
  resume:        () => void;
  setTrack:      (index: number) => void;
  nextTrack:     () => void;
  prevTrack:     () => void;
  setVolume:     (v: number) => void;
  setIsPlaying:  (v: boolean) => void;
  toggleShuffle: () => void;
}

export const usePlaylistStore = create<PlaylistState>()(
  persist(
    (set, get) => ({
      sources:    [],
      activeId:   null,
      trackIndex: 0,
      isPlaying:  false,
      volume:     80,
      isShuffled: false,

      setSources:   (sources) => set({ sources }),
      addSource:    (s) => set((st) => ({ sources: [...st.sources, s] })),
      removeSource: (docId) => set((st) => ({
        sources:  st.sources.filter((s) => s.docId !== docId),
        activeId: st.activeId === docId ? null : st.activeId,
        isPlaying: st.activeId === docId ? false : st.isPlaying,
      })),

      play: (docId, trackIndex = 0) => set({ activeId: docId, trackIndex, isPlaying: true }),
      pause:  () => set({ isPlaying: false }),
      resume: () => set({ isPlaying: true }),
      setIsPlaying: (v) => set({ isPlaying: v }),

      setTrack: (index) => set({ trackIndex: index, isPlaying: true }),

      nextTrack: () => {
        const { activeId, trackIndex, sources } = get();
        const src = sources.find((s) => s.docId === activeId);
        if (!src) return;
        set({ trackIndex: (trackIndex + 1) % src.tracks.length, isPlaying: true });
      },

      prevTrack: () => {
        const { activeId, trackIndex, sources } = get();
        const src = sources.find((s) => s.docId === activeId);
        if (!src) return;
        set({ trackIndex: (trackIndex - 1 + src.tracks.length) % src.tracks.length, isPlaying: true });
      },

      setVolume:     (v) => set({ volume: v }),
      toggleShuffle: () => set((st) => ({ isShuffled: !st.isShuffled })),
    }),
    {
      name:       'playlist-prefs',
      partialize: (state) => ({ volume: state.volume, isShuffled: state.isShuffled }),
    },
  ),
);
