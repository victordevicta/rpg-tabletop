import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../../prisma.module';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let prisma: {
    document: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const mockDoc = { id: 'doc-1', worldId: 'w-1', type: 'character', name: 'Aragorn', data: {}, flags: {} };

  beforeEach(async () => {
    prisma = {
      document: {
        findMany:  jest.fn().mockResolvedValue([mockDoc]),
        findUnique: jest.fn().mockResolvedValue(mockDoc),
        create:    jest.fn().mockResolvedValue(mockDoc),
        update:    jest.fn().mockResolvedValue(mockDoc),
        delete:    jest.fn().mockResolvedValue(undefined),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(DocumentsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('queries only by worldId when no type provided', async () => {
      await service.findAll('w-1');

      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { worldId: 'w-1' } }),
      );
    });

    it('includes type in query when provided', async () => {
      await service.findAll('w-1', 'character');

      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { worldId: 'w-1', type: 'character' } }),
      );
    });

    it('sorts by sort asc then name asc', async () => {
      await service.findAll('w-1');

      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: [{ sort: 'asc' }, { name: 'asc' }] }),
      );
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns document when found', async () => {
      const result = await service.findOne('doc-1');
      expect(result).toEqual(mockDoc);
    });

    it('throws NotFoundException when document does not exist', async () => {
      prisma.document.findUnique.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates with the provided worldId, type and name', async () => {
      await service.create('w-1', { type: 'playlist', name: 'Ambient Mix' });

      const { data } = prisma.document.create.mock.calls[0][0];
      expect(data.worldId).toBe('w-1');
      expect(data.type).toBe('playlist');
      expect(data.name).toBe('Ambient Mix');
    });

    it('defaults data and flags to empty objects when omitted', async () => {
      await service.create('w-1', { type: 'note', name: 'Lore' });

      const { data } = prisma.document.create.mock.calls[0][0];
      expect(data.data).toEqual({});
      expect(data.flags).toEqual({});
    });

    it('persists provided data and flags', async () => {
      const payload = { type: 'character', name: 'Legolas', data: { hp: 30 }, flags: { exported: true } };
      await service.create('w-1', payload);

      const { data } = prisma.document.create.mock.calls[0][0];
      expect(data.data).toEqual({ hp: 30 });
      expect(data.flags).toEqual({ exported: true });
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates document when it exists', async () => {
      await service.update('doc-1', { name: 'Legolas' });

      expect(prisma.document.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'doc-1' } }),
      );
    });

    it('only includes provided fields in the update payload', async () => {
      await service.update('doc-1', { name: 'Gimli' });

      const { data } = prisma.document.update.mock.calls[0][0];
      expect(data.name).toBe('Gimli');
      expect(data.data).toBeUndefined();
      expect(data.flags).toBeUndefined();
    });

    it('throws NotFoundException when document does not exist', async () => {
      prisma.document.findUnique.mockResolvedValue(null);
      await expect(service.update('bad-id', { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes document when it exists', async () => {
      await service.delete('doc-1');
      expect(prisma.document.delete).toHaveBeenCalledWith({ where: { id: 'doc-1' } });
    });

    it('throws NotFoundException when document does not exist', async () => {
      prisma.document.findUnique.mockResolvedValue(null);
      await expect(service.delete('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── scene documents ───────────────────────────────────────────────────────

  describe('scene documents', () => {
    const sceneData = {
      img: 'https://example.com/map.jpg',
      width: 1024,
      height: 768,
      gridSize: 64,
      gridType: 'square',
      padding: 0,
      backgroundColor: '#0a0a0f',
      active: false,
      tokens: [],
    };

    it('creates a scene document with the correct type and data', async () => {
      await service.create('w-1', {
        type: 'scene',
        name: 'Dark Forest',
        data: sceneData,
      });

      const { data } = prisma.document.create.mock.calls[0][0];
      expect(data.type).toBe('scene');
      expect(data.name).toBe('Dark Forest');
      expect(data.data).toEqual(sceneData);
    });

    it('findAll with type=scene filters to scenes only', async () => {
      await service.findAll('w-1', 'scene');

      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { worldId: 'w-1', type: 'scene' } }),
      );
    });

    it('updates scene data when activating (active: true)', async () => {
      const activated = { ...sceneData, active: true };
      await service.update('doc-1', { data: activated });

      const { data } = prisma.document.update.mock.calls[0][0];
      expect(data.data).toEqual(activated);
    });

    it('stores img URL in the data payload', async () => {
      const imgUrl = 'https://example.com/dungeon.jpg';
      await service.create('w-1', {
        type: 'scene',
        name: 'Stone Dungeon',
        data: { ...sceneData, img: imgUrl },
      });

      const { data } = prisma.document.create.mock.calls[0][0];
      expect((data.data as Record<string, unknown>).img).toBe(imgUrl);
    });

    it('stores base64 image data URLs in the img field', async () => {
      const base64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      await service.create('w-1', {
        type: 'scene',
        name: 'Uploaded Map',
        data: { ...sceneData, img: base64 },
      });

      const { data } = prisma.document.create.mock.calls[0][0];
      expect((data.data as Record<string, unknown>).img).toBe(base64);
    });
  });
});
