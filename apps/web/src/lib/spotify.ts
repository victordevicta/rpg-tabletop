// Spotify PKCE Authorization Code flow + Web API helpers.
// All Spotify metadata is resolved in the browser using the user's own token.

const CLIENT_ID    = (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string) ?? '';
const REDIRECT_URI = (import.meta.env.VITE_SPOTIFY_REDIRECT_URI as string) || 'http://127.0.0.1:5173/';
const SCOPE        = 'playlist-read-private playlist-read-collaborative';
const API          = 'https://api.spotify.com/v1';

// ── PKCE helpers ──────────────────────────────────────────────────────────────

function randomString(len: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const arr   = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join('');
}

async function sha256base64url(plain: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain));
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ── Auth flow ─────────────────────────────────────────────────────────────────

export async function startSpotifyAuth(pendingUrl?: string): Promise<void> {
  const verifier  = randomString(128);
  const challenge = await sha256base64url(verifier);
  localStorage.setItem('sp_verifier',    verifier);
  localStorage.setItem('sp_pending_url', pendingUrl ?? '');

  const params = new URLSearchParams({
    response_type:         'code',
    client_id:             CLIENT_ID,
    scope:                 SCOPE,
    redirect_uri:          REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge:        challenge,
  });
  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

export async function handleSpotifyCallback(): Promise<string | null> {
  const code = new URLSearchParams(window.location.search).get('code');
  if (!code) return null;

  const verifier = localStorage.getItem('sp_verifier');
  if (!verifier) return null;

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      redirect_uri:  REDIRECT_URI,
      client_id:     CLIENT_ID,
      code_verifier: verifier,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json() as { access_token: string; expires_in: number };

  localStorage.setItem('sp_token',  data.access_token);
  localStorage.setItem('sp_expiry', String(Date.now() + (data.expires_in - 60) * 1000));
  localStorage.removeItem('sp_verifier');

  window.history.replaceState({}, '', '/');
  return localStorage.getItem('sp_pending_url') ?? null;
}

export function getSpotifyToken(): string | null {
  const token  = localStorage.getItem('sp_token');
  const expiry = Number(localStorage.getItem('sp_expiry') ?? 0);
  if (!token || Date.now() > expiry) return null;
  return token;
}

export function clearSpotifyToken(): void {
  localStorage.removeItem('sp_token');
  localStorage.removeItem('sp_expiry');
}

// ── URL parsing ───────────────────────────────────────────────────────────────

function parseSpotifyUrl(raw: string): { type: 'track' | 'playlist' | 'album'; id: string } | null {
  const s   = raw.trim();
  const uri = s.match(/^spotify:(track|playlist|album):([A-Za-z0-9]+)/);
  if (uri) return { type: uri[1] as 'track' | 'playlist' | 'album', id: uri[2] };
  const url = s.match(/open\.spotify\.com\/(?:[^/?]+\/)*(track|playlist|album)\/([A-Za-z0-9]+)/);
  if (url) return { type: url[1] as 'track' | 'playlist' | 'album', id: url[2] };
  return null;
}

// ── API fetch ─────────────────────────────────────────────────────────────────

async function spotifyFetch(path: string, token: string): Promise<any> {
  const url = path.startsWith('http') ? path : `${API}${path}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    if (res.status === 401) clearSpotifyToken();
    const body = await res.text().catch(() => '');
    throw new Error(`Spotify ${res.status}${body ? ` — ${body}` : ''}`);
  }
  return res.json();
}

// ── Resolvers ─────────────────────────────────────────────────────────────────

export async function resolveSpotifyUrl(rawUrl: string, token: string) {
  const parsed = parseSpotifyUrl(rawUrl);
  if (!parsed) throw new Error('URL do Spotify inválida');
  if (parsed.type === 'track')    return resolveTrack(parsed.id, token);
  if (parsed.type === 'playlist') return resolvePlaylist(parsed.id, token);
  return resolveAlbum(parsed.id, token);
}

async function resolveTrack(id: string, token: string) {
  const t       = await spotifyFetch(`/tracks/${id}`, token);
  const artists = (t.artists ?? []).map((a: any) => a.name).join(', ');
  return {
    sourceProvider: 'spotify' as const,
    sourceType:     'video'   as const,
    spotifyUri:     `spotify:track:${id}`,
    title:          t.name,
    thumbnail:      t.album?.images?.[0]?.url ?? '',
    tracks: [{ id, title: `${t.name} — ${artists}`, thumbnail: t.album?.images?.[1]?.url ?? '' }],
  };
}

async function resolvePlaylist(id: string, token: string) {
  const meta   = await spotifyFetch(`/playlists/${id}?fields=name,images`, token);
  const tracks: any[] = [];
  let   path: string | null = `/playlists/${id}/tracks?limit=100`;
  while (path) {
    const page = await spotifyFetch(path, token);
    tracks.push(
      ...(page.items ?? [])
        .filter((i: any) => i.track?.id)
        .map((i: any) => ({
          id:        i.track.id,
          title:     `${i.track.name} — ${(i.track.artists ?? []).map((a: any) => a.name).join(', ')}`,
          thumbnail: i.track.album?.images?.[2]?.url ?? '',
        })),
    );
    path = page.next ?? null;
  }
  return {
    sourceProvider: 'spotify' as const,
    sourceType:     'playlist' as const,
    spotifyUri:     `spotify:playlist:${id}`,
    title:          meta.name,
    thumbnail:      meta.images?.[0]?.url ?? '',
    tracks,
  };
}

async function resolveAlbum(id: string, token: string) {
  const album   = await spotifyFetch(`/albums/${id}`, token);
  const artists = (album.artists ?? []).map((a: any) => a.name).join(', ');
  const thumb   = album.images?.[2]?.url ?? '';
  const tracks: any[] = [];
  let page: any = album.tracks;
  while (page) {
    tracks.push(
      ...(page.items ?? []).map((t: any) => ({
        id:        t.id,
        title:     `${t.name} — ${(t.artists ?? []).map((a: any) => a.name).join(', ')}`,
        thumbnail: thumb,
      })),
    );
    page = page.next ? await spotifyFetch(page.next, token) : null;
  }
  return {
    sourceProvider: 'spotify' as const,
    sourceType:     'playlist' as const,
    spotifyUri:     `spotify:album:${id}`,
    title:          `${album.name} — ${artists}`,
    thumbnail:      album.images?.[0]?.url ?? '',
    tracks,
  };
}
