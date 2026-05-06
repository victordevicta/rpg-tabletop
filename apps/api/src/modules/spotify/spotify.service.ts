import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SpotifyTrack {
  id:        string;
  title:     string;
  thumbnail: string;
}

export interface ResolvedSpotifySource {
  sourceProvider: 'spotify';
  sourceType:     'playlist' | 'video';
  spotifyUri:     string;
  title:          string;
  thumbnail:      string;
  tracks:         SpotifyTrack[];
}

function parseSpotifyUrl(raw: string): { type: 'track' | 'playlist' | 'album'; id: string } | null {
  const s = raw.trim();
  const uri = s.match(/^spotify:(track|playlist|album):([A-Za-z0-9]+)/);
  if (uri) return { type: uri[1] as 'track' | 'playlist' | 'album', id: uri[2] };
  const url = s.match(/open\.spotify\.com\/(?:[^/?]+\/)*(track|playlist|album)\/([A-Za-z0-9]+)/);
  if (url) return { type: url[1] as 'track' | 'playlist' | 'album', id: url[2] };
  return null;
}

const SPOTIFY_API = 'https://api.spotify.com/v1';
const TOKEN_URL   = 'https://accounts.spotify.com/api/token';

@Injectable()
export class SpotifyService {
  private readonly clientId:     string;
  private readonly clientSecret: string;
  private tokenCache:         { token: string; expiresAt: number } | null = null;
  private tokenFetchInFlight: Promise<string> | null = null;

  constructor(private readonly config: ConfigService) {
    this.clientId     = this.config.get<string>('spotify.clientId')     ?? '';
    this.clientSecret = this.config.get<string>('spotify.clientSecret') ?? '';
  }

  async resolve(url: string): Promise<ResolvedSpotifySource> {
    if (!this.clientId || !this.clientSecret) {
      throw new BadRequestException('SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET não configurados');
    }
    const parsed = parseSpotifyUrl(url);
    if (!parsed) throw new BadRequestException('URL do Spotify inválida');

    if (parsed.type === 'track')    return this.resolveTrack(parsed.id);
    if (parsed.type === 'playlist') return this.resolvePlaylist(parsed.id);
    return this.resolveAlbum(parsed.id);
  }

  // ── Track ─────────────────────────────────────────────────────────────────

  private async resolveTrack(id: string): Promise<ResolvedSpotifySource> {
    const t = await this.spotifyGet(`/tracks/${id}`);
    const artists = (t.artists ?? []).map((a: any) => a.name).join(', ');
    return {
      sourceProvider: 'spotify',
      sourceType:     'video',
      spotifyUri:     `spotify:track:${id}`,
      title:          t.name,
      thumbnail:      t.album?.images?.[0]?.url ?? '',
      tracks: [{
        id,
        title:     `${t.name} — ${artists}`,
        thumbnail: t.album?.images?.[1]?.url ?? '',
      }],
    };
  }

  // ── Playlist ──────────────────────────────────────────────────────────────

  private async resolvePlaylist(id: string): Promise<ResolvedSpotifySource> {
    const meta = await this.spotifyGet(`/playlists/${id}?fields=name,images`);

    const tracks: SpotifyTrack[] = [];
    let path: string | null = `/playlists/${id}/tracks?limit=100`;
    while (path) {
      const page: any = await this.spotifyGet(path);
      tracks.push(
        ...(page.items ?? [])
          .filter((item: any) => item.track?.id)
          .map((item: any) => ({
            id:        item.track.id,
            title:     `${item.track.name} — ${(item.track.artists ?? []).map((a: any) => a.name).join(', ')}`,
            thumbnail: item.track.album?.images?.[2]?.url ?? '',
          })),
      );
      path = page.next ? page.next.replace('https://api.spotify.com/v1', '') : null;
    }

    return {
      sourceProvider: 'spotify',
      sourceType:     'playlist',
      spotifyUri:     `spotify:playlist:${id}`,
      title:          meta.name,
      thumbnail:      meta.images?.[0]?.url ?? '',
      tracks,
    };
  }

  // ── Album ─────────────────────────────────────────────────────────────────

  private async resolveAlbum(id: string): Promise<ResolvedSpotifySource> {
    const album   = await this.spotifyGet(`/albums/${id}`);
    const artists = (album.artists ?? []).map((a: any) => a.name).join(', ');
    const thumb   = album.images?.[2]?.url ?? '';

    const tracks: SpotifyTrack[] = [];
    let tracksPage: any = album.tracks;
    while (tracksPage) {
      tracks.push(
        ...(tracksPage.items ?? []).map((t: any) => ({
          id:        t.id,
          title:     `${t.name} — ${(t.artists ?? []).map((a: any) => a.name).join(', ')}`,
          thumbnail: thumb,
        })),
      );
      tracksPage = tracksPage.next
        ? await this.spotifyGet(tracksPage.next.replace('https://api.spotify.com/v1', ''))
        : null;
    }

    return {
      sourceProvider: 'spotify',
      sourceType:     'playlist',
      spotifyUri:     `spotify:album:${id}`,
      title:          `${album.name} — ${artists}`,
      thumbnail:      album.images?.[0]?.url ?? '',
      tracks,
    };
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  private async getToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      return this.tokenCache.token;
    }
    // Deduplicate concurrent token fetches (e.g. from Promise.all)
    if (!this.tokenFetchInFlight) {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      this.tokenFetchInFlight = fetch(TOKEN_URL, {
        method:  'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    'grant_type=client_credentials',
      }).then(async (res) => {
        if (!res.ok) throw new BadRequestException('Falha na autenticação com Spotify');
        const data = await res.json() as { access_token: string; expires_in: number };
        this.tokenCache         = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
        this.tokenFetchInFlight = null;
        return this.tokenCache.token;
      }).catch((e) => { this.tokenFetchInFlight = null; throw e; });
    }
    return this.tokenFetchInFlight;
  }

  private async spotifyGet(path: string): Promise<any> {
    const token = await this.getToken();
    const res   = await fetch(`${SPOTIFY_API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new BadRequestException(`Spotify API error: ${res.status}${body ? ` — ${body}` : ''}`);
    }
    return res.json();
  }
}
