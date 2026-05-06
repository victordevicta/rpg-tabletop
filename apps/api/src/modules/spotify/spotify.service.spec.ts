import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SpotifyService } from './spotify.service';

const mockFetch = jest.fn();
global.fetch = mockFetch as typeof fetch;

function respondOk(data: unknown) {
  mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(data) });
}

function respondError(status: number) {
  mockFetch.mockResolvedValueOnce({ ok: false, status });
}

const tokenResponse = { access_token: 'tok-123', expires_in: 3600 };

const fakeTrack = {
  name: 'Bohemian Rhapsody',
  artists: [{ name: 'Queen' }],
  album: { images: [{ url: 'lg.jpg' }, { url: 'md.jpg' }, { url: 'sm.jpg' }] },
};

describe('SpotifyService', () => {
  let service: SpotifyService;

  async function build(clientId = 'cid', clientSecret = 'csec') {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpotifyService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'spotify.clientId' ? clientId : clientSecret,
            ),
          },
        },
      ],
    }).compile();
    return module.get(SpotifyService);
  }

  beforeEach(async () => { service = await build(); });
  afterEach(() => jest.clearAllMocks());

  // ── Guard: credentials ────────────────────────────────────────────────────

  it('throws BadRequestException when credentials are not configured', async () => {
    const svc = await build('', '');
    await expect(svc.resolve('spotify:track:abc')).rejects.toThrow(BadRequestException);
  });

  // ── URL parsing ───────────────────────────────────────────────────────────

  it('throws BadRequestException on non-Spotify URL', async () => {
    await expect(service.resolve('https://soundcloud.com/track/x')).rejects.toThrow(BadRequestException);
  });

  // ── Track resolution ──────────────────────────────────────────────────────

  describe('track', () => {
    it('resolves open.spotify.com/track/ URL', async () => {
      respondOk(tokenResponse);
      respondOk(fakeTrack);

      const result = await service.resolve('https://open.spotify.com/track/abc123');

      expect(result.sourceType).toBe('video');
      expect(result.sourceProvider).toBe('spotify');
      expect(result.spotifyUri).toBe('spotify:track:abc123');
      expect(result.title).toBe('Bohemian Rhapsody');
      expect(result.thumbnail).toBe('lg.jpg');
      expect(result.tracks).toHaveLength(1);
      expect(result.tracks[0].title).toBe('Bohemian Rhapsody — Queen');
    });

    it('resolves spotify:track: URI directly', async () => {
      respondOk(tokenResponse);
      respondOk(fakeTrack);

      const result = await service.resolve('spotify:track:abc123');
      expect(result.spotifyUri).toBe('spotify:track:abc123');
    });

    it('includes artist in track title', async () => {
      respondOk(tokenResponse);
      respondOk({ ...fakeTrack, artists: [{ name: 'Queen' }, { name: 'David Bowie' }] });

      const result = await service.resolve('spotify:track:abc');
      expect(result.tracks[0].title).toContain('Queen');
      expect(result.tracks[0].title).toContain('David Bowie');
    });
  });

  // ── Playlist resolution ───────────────────────────────────────────────────

  describe('playlist', () => {
    it('resolves open.spotify.com/playlist/ URL', async () => {
      respondOk(tokenResponse);
      // Promise.all: meta + items in parallel
      respondOk({ name: 'Chill Vibes', images: [{ url: 'cover.jpg' }] });
      respondOk({
        items: [
          { track: { id: 't1', name: 'Song 1', artists: [{ name: 'Artist' }], album: { images: [] } } },
          { track: { id: 't2', name: 'Song 2', artists: [{ name: 'Artist' }], album: { images: [] } } },
        ],
      });

      const result = await service.resolve('https://open.spotify.com/playlist/PLabc');

      expect(result.sourceType).toBe('playlist');
      expect(result.spotifyUri).toBe('spotify:playlist:PLabc');
      expect(result.title).toBe('Chill Vibes');
      expect(result.thumbnail).toBe('cover.jpg');
      expect(result.tracks).toHaveLength(2);
    });

    it('filters out null tracks from playlist items', async () => {
      respondOk(tokenResponse);
      respondOk({ name: 'PL', images: [] });
      respondOk({
        items: [
          { track: { id: 't1', name: 'Song', artists: [], album: { images: [] } } },
          { track: null }, // deleted/unavailable track
        ],
      });

      const result = await service.resolve('spotify:playlist:PL123');
      expect(result.tracks).toHaveLength(1);
    });
  });

  // ── Album resolution ──────────────────────────────────────────────────────

  describe('album', () => {
    it('resolves open.spotify.com/album/ URL', async () => {
      respondOk(tokenResponse);
      respondOk({
        name: 'A Night at the Opera',
        artists: [{ name: 'Queen' }],
        images: [{ url: 'lg.jpg' }, { url: 'md.jpg' }, { url: 'sm.jpg' }],
        tracks: {
          items: [{ id: 't1', name: 'Bohemian Rhapsody', artists: [{ name: 'Queen' }] }],
        },
      });

      const result = await service.resolve('https://open.spotify.com/album/ALBabc');

      expect(result.sourceType).toBe('playlist');
      expect(result.spotifyUri).toBe('spotify:album:ALBabc');
      expect(result.title).toContain('A Night at the Opera');
      expect(result.title).toContain('Queen');
      expect(result.tracks).toHaveLength(1);
    });

    it('limits album tracks to 20', async () => {
      respondOk(tokenResponse);
      respondOk({
        name: 'Long Album', artists: [{ name: 'Artist' }], images: [],
        tracks: { items: Array.from({ length: 30 }, (_, i) => ({ id: `t${i}`, name: `Track ${i}`, artists: [] })) },
      });

      const result = await service.resolve('spotify:album:ALB123');
      expect(result.tracks).toHaveLength(20);
    });
  });

  // ── Token caching ─────────────────────────────────────────────────────────

  describe('token caching', () => {
    it('fetches token only once across multiple resolve calls', async () => {
      respondOk(tokenResponse);
      respondOk(fakeTrack);
      await service.resolve('spotify:track:abc');

      mockFetch.mockClear();

      respondOk(fakeTrack);
      await service.resolve('spotify:track:xyz');

      // Second call: only 1 fetch (API call), no token fetch
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).not.toContain('api/token');
    });
  });

  // ── API error handling ────────────────────────────────────────────────────

  it('throws BadRequestException when token endpoint fails', async () => {
    respondError(401);
    await expect(service.resolve('spotify:track:abc')).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when Spotify API returns error', async () => {
    respondOk(tokenResponse);
    respondError(404);
    await expect(service.resolve('spotify:track:abc')).rejects.toThrow(BadRequestException);
  });
});
