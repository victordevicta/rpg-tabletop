import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { YoutubeService } from './youtube.service';

const mockFetch = jest.fn();
global.fetch = mockFetch as typeof fetch;

function respondOk(data: unknown) {
  mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(data) });
}

function respondError(status: number) {
  mockFetch.mockResolvedValueOnce({ ok: false, status });
}

const fakeVideo = {
  snippet: {
    title: 'Dark Fantasy Ambient',
    thumbnails: { high: { url: 'https://img.yt/high.jpg' }, medium: { url: 'https://img.yt/med.jpg' } },
  },
};

const fakePlaylistItem = {
  snippet: {
    resourceId: { kind: 'youtube#video', videoId: 'v1' },
    title: 'Track 1',
    thumbnails: { medium: { url: 'https://img.yt/item.jpg' } },
  },
};

describe('YoutubeService', () => {
  let service: YoutubeService;

  async function build(apiKey = 'test-key') {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YoutubeService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(apiKey) } },
      ],
    }).compile();
    return module.get(YoutubeService);
  }

  beforeEach(async () => { service = await build(); });
  afterEach(() => jest.clearAllMocks());

  // ── Guard: API key ────────────────────────────────────────────────────────

  it('throws BadRequestException when API key is not configured', async () => {
    const svc = await build('');
    await expect(svc.resolve('https://youtu.be/abc')).rejects.toThrow(BadRequestException);
  });

  // ── URL parsing ───────────────────────────────────────────────────────────

  it('throws BadRequestException on non-YouTube URL', async () => {
    await expect(service.resolve('https://vimeo.com/123')).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException on malformed URL', async () => {
    await expect(service.resolve('not-a-url')).rejects.toThrow(BadRequestException);
  });

  // ── Video resolution ──────────────────────────────────────────────────────

  describe('video', () => {
    it('resolves youtube.com/watch?v= URL', async () => {
      respondOk({ items: [fakeVideo] });

      const result = await service.resolve('https://www.youtube.com/watch?v=abc123');

      expect(result.sourceType).toBe('video');
      expect(result.youtubeId).toBe('abc123');
      expect(result.title).toBe('Dark Fantasy Ambient');
      expect(result.thumbnail).toBe('https://img.yt/high.jpg');
      expect(result.tracks).toHaveLength(1);
      expect(result.tracks[0].id).toBe('abc123');
    });

    it('resolves youtu.be/ short URL', async () => {
      respondOk({ items: [fakeVideo] });

      const result = await service.resolve('https://youtu.be/xyz789');
      expect(result.sourceType).toBe('video');
      expect(result.youtubeId).toBe('xyz789');
    });

    it('resolves mobile m.youtube.com URL', async () => {
      respondOk({ items: [fakeVideo] });

      const result = await service.resolve('https://m.youtube.com/watch?v=mob123');
      expect(result.youtubeId).toBe('mob123');
    });

    it('throws NotFoundException when video ID not found in API', async () => {
      respondOk({ items: [] });
      await expect(service.resolve('https://youtu.be/ghost')).rejects.toThrow(BadRequestException);
    });
  });

  // ── Playlist resolution ───────────────────────────────────────────────────

  describe('playlist', () => {
    it('resolves playlist?list= URL', async () => {
      respondOk({ items: [{ snippet: { title: 'Epic Playlist', thumbnails: {} } }] });
      respondOk({ items: [fakePlaylistItem] });

      const result = await service.resolve('https://www.youtube.com/playlist?list=PLtest');

      expect(result.sourceType).toBe('playlist');
      expect(result.youtubeId).toBe('PLtest');
      expect(result.title).toBe('Epic Playlist');
      expect(result.tracks).toHaveLength(1);
      expect(result.tracks[0].id).toBe('v1');
    });

    it('prefers list param over v param in watch?v=&list= URL', async () => {
      respondOk({ items: [{ snippet: { title: 'PL', thumbnails: {} } }] });
      respondOk({ items: [] });

      const result = await service.resolve('https://www.youtube.com/watch?v=abc&list=PLmixed');
      expect(result.sourceType).toBe('playlist');
      expect(result.youtubeId).toBe('PLmixed');
    });

    it('filters out non-video items from playlist', async () => {
      respondOk({ items: [{ snippet: { title: 'PL', thumbnails: {} } }] });
      respondOk({
        items: [
          fakePlaylistItem,
          { snippet: { resourceId: { kind: 'youtube#channel' }, title: 'Channel', thumbnails: {} } },
        ],
      });

      const result = await service.resolve('https://www.youtube.com/playlist?list=PLtest');
      expect(result.tracks).toHaveLength(1);
    });

    it('throws when playlist not found in API', async () => {
      respondOk({ items: [] });
      respondOk({ items: [] });
      await expect(service.resolve('https://www.youtube.com/playlist?list=PLghost'))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ── API error handling ────────────────────────────────────────────────────

  it('throws BadRequestException when YouTube API returns non-ok response', async () => {
    respondError(403);
    await expect(service.resolve('https://youtu.be/abc')).rejects.toThrow(BadRequestException);
  });
});
