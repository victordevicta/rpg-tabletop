import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface YoutubeTrack {
  id: string;
  title: string;
  thumbnail: string;
}

export interface ResolvedYoutubeSource {
  sourceType: 'playlist' | 'video';
  youtubeId: string;
  title: string;
  thumbnail: string;
  tracks: YoutubeTrack[];
}

// ── URL parsing ───────────────────────────────────────────────────────────────

function parseYoutubeUrl(raw: string): { type: 'playlist' | 'video'; id: string } | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^(www\.|m\.)/, '');
  if (host !== 'youtube.com' && host !== 'youtu.be') return null;

  const listId  = url.searchParams.get('list');
  const videoId = host === 'youtu.be'
    ? url.pathname.slice(1).split('?')[0]
    : url.searchParams.get('v');

  // Playlist takes priority when both params present
  if (listId) return { type: 'playlist', id: listId };
  if (videoId) return { type: 'video', id: videoId };
  return null;
}

// ── YouTube Data API helpers ──────────────────────────────────────────────────

const YT_API = 'https://www.googleapis.com/youtube/v3';

function bestThumb(thumbnails: Record<string, { url: string }> | undefined): string {
  if (!thumbnails) return '';
  return (thumbnails.maxres ?? thumbnails.high ?? thumbnails.medium ?? thumbnails.default)?.url ?? '';
}

@Injectable()
export class YoutubeService {
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('youtubeApiKey') ?? '';
  }

  async resolve(url: string): Promise<ResolvedYoutubeSource> {
    if (!this.apiKey) throw new BadRequestException('YOUTUBE_API_KEY not configured');

    const parsed = parseYoutubeUrl(url);
    if (!parsed) throw new BadRequestException('URL do YouTube inválida');

    return parsed.type === 'playlist'
      ? this.resolvePlaylist(parsed.id)
      : this.resolveVideo(parsed.id);
  }

  // ── Playlist ──────────────────────────────────────────────────────────────

  private async resolvePlaylist(id: string): Promise<ResolvedYoutubeSource> {
    const [playlistRes, itemsRes] = await Promise.all([
      this.ytFetch(`/playlists?part=snippet&id=${id}&key=${this.apiKey}`),
      this.ytFetch(`/playlistItems?part=snippet&playlistId=${id}&maxResults=50&key=${this.apiKey}`),
    ]);

    const playlist = playlistRes.items?.[0];
    if (!playlist) throw new BadRequestException('Playlist não encontrada');

    const tracks: YoutubeTrack[] = (itemsRes.items ?? [])
      .filter((item: any) => item.snippet?.resourceId?.kind === 'youtube#video')
      .map((item: any) => ({
        id:        item.snippet.resourceId.videoId,
        title:     item.snippet.title,
        thumbnail: bestThumb(item.snippet.thumbnails),
      }));

    return {
      sourceType: 'playlist',
      youtubeId:  id,
      title:      playlist.snippet.title,
      thumbnail:  bestThumb(playlist.snippet.thumbnails),
      tracks,
    };
  }

  // ── Single video ──────────────────────────────────────────────────────────

  private async resolveVideo(id: string): Promise<ResolvedYoutubeSource> {
    const res = await this.ytFetch(`/videos?part=snippet&id=${id}&key=${this.apiKey}`);

    const video = res.items?.[0];
    if (!video) throw new BadRequestException('Vídeo não encontrado');

    const track: YoutubeTrack = {
      id,
      title:     video.snippet.title,
      thumbnail: bestThumb(video.snippet.thumbnails),
    };

    return {
      sourceType: 'video',
      youtubeId:  id,
      title:      video.snippet.title,
      thumbnail:  bestThumb(video.snippet.thumbnails),
      tracks:     [track],
    };
  }

  // ── Fetch wrapper ─────────────────────────────────────────────────────────

  private async ytFetch(path: string): Promise<any> {
    const res = await fetch(`${YT_API}${path}`);
    if (!res.ok) throw new BadRequestException(`YouTube API error: ${res.status}`);
    return res.json();
  }
}
