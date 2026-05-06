import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { WorldsService } from './worlds.service';
import { PrismaService } from '../../prisma.module';

describe('WorldsService', () => {
  let service: WorldsService;
  let prisma: {
    world: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    discordBinding: { upsert: jest.Mock; findFirst: jest.Mock };
  };

  const mockWorld = {
    id: 'w-1',
    slug: 'my-world',
    name: 'My World',
    ownerId: 'user-1',
    members: [{ userId: 'user-1', role: 'gm' }],
    discordBindings: [],
    owner: { id: 'user-1', name: 'GM', avatarUrl: null },
  };

  beforeEach(async () => {
    prisma = {
      world: {
        findMany:  jest.fn().mockResolvedValue([mockWorld]),
        findUnique: jest.fn().mockResolvedValue(mockWorld),
        create:    jest.fn().mockResolvedValue(mockWorld),
        update:    jest.fn().mockResolvedValue(mockWorld),
        delete:    jest.fn().mockResolvedValue(undefined),
      },
      discordBinding: {
        upsert:    jest.fn().mockResolvedValue({}),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorldsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(WorldsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns worlds where user is owner or member', async () => {
      const result = await service.findAll('user-1');

      expect(prisma.world.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { OR: [{ ownerId: 'user-1' }, { members: { some: { userId: 'user-1' } } }] },
        }),
      );
      expect(result).toEqual([mockWorld]);
    });
  });

  // ── findBySlug ────────────────────────────────────────────────────────────

  describe('findBySlug', () => {
    it('returns world when user is the owner', async () => {
      const result = await service.findBySlug('my-world', 'user-1');
      expect(result).toEqual(mockWorld);
    });

    it('returns world when user is a member (not owner)', async () => {
      const worldWithMember = { ...mockWorld, ownerId: 'owner-99', members: [{ userId: 'user-1' }] };
      prisma.world.findUnique.mockResolvedValue(worldWithMember);

      const result = await service.findBySlug('my-world', 'user-1');
      expect(result).toEqual(worldWithMember);
    });

    it('throws NotFoundException when world does not exist', async () => {
      prisma.world.findUnique.mockResolvedValue(null);
      await expect(service.findBySlug('missing', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user is not owner or member', async () => {
      const alienWorld = { ...mockWorld, ownerId: 'other', members: [] };
      prisma.world.findUnique.mockResolvedValue(alienWorld);

      await expect(service.findBySlug('my-world', 'user-1')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    beforeEach(() => {
      // First findUnique = slug check (no conflict)
      prisma.world.findUnique.mockResolvedValue(null);
    });

    it('slugifies the world name', async () => {
      await service.create('user-1', { name: 'My Cool World!' });

      const { slug } = prisma.world.create.mock.calls[0][0].data;
      expect(slug).toBe('my-cool-world');
    });

    it('strips special characters from slug', async () => {
      await service.create('user-1', { name: 'Dungeons & Dragons (5e)' });

      const { slug } = prisma.world.create.mock.calls[0][0].data;
      // '&', '(' and ')' are removed; the surrounding spaces collapse via \s+ → single dash
      expect(slug).toBe('dungeons-dragons-5e');
    });

    it('appends timestamp when slug already exists', async () => {
      prisma.world.findUnique.mockResolvedValue(mockWorld); // slug conflict

      await service.create('user-1', { name: 'My World' });

      const { slug } = prisma.world.create.mock.calls[0][0].data;
      expect(slug).toMatch(/^my-world-\d+$/);
    });

    it('adds the creator as GM member', async () => {
      await service.create('user-1', { name: 'Realm' });

      const { members } = prisma.world.create.mock.calls[0][0].data;
      expect(members.create).toEqual({ userId: 'user-1', role: 'gm' });
    });

    it('defaults systemId to generic-d20 when not provided', async () => {
      await service.create('user-1', { name: 'Realm' });

      const { systemId } = prisma.world.create.mock.calls[0][0].data;
      expect(systemId).toBe('generic-d20');
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates world when caller is the owner', async () => {
      await service.update('w-1', 'user-1', { name: 'Renamed World' });

      expect(prisma.world.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'w-1' } }),
      );
    });

    it('throws NotFoundException when world does not exist', async () => {
      prisma.world.findUnique.mockResolvedValue(null);
      await expect(service.update('bad-id', 'user-1', {})).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when caller is not the owner', async () => {
      await expect(service.update('w-1', 'intruder', { name: 'Hack' }))
        .rejects.toThrow(ForbiddenException);
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes world when caller is the owner', async () => {
      await service.delete('w-1', 'user-1');
      expect(prisma.world.delete).toHaveBeenCalledWith({ where: { id: 'w-1' } });
    });

    it('throws NotFoundException when world does not exist', async () => {
      prisma.world.findUnique.mockResolvedValue(null);
      await expect(service.delete('bad-id', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when caller is not the owner', async () => {
      await expect(service.delete('w-1', 'intruder')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── bindDiscord ───────────────────────────────────────────────────────────

  describe('bindDiscord', () => {
    it('upserts a Discord binding when caller is the owner', async () => {
      await service.bindDiscord('w-1', 'user-1', { discordGuildId: 'g-1', discordChannelId: 'c-1' });

      expect(prisma.discordBinding.upsert).toHaveBeenCalled();
    });

    it('throws ForbiddenException when caller is not the owner', async () => {
      await expect(service.bindDiscord('w-1', 'intruder', { discordGuildId: 'g-1', discordChannelId: 'c-1' }))
        .rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when world does not exist', async () => {
      prisma.world.findUnique.mockResolvedValue(null);
      await expect(service.bindDiscord('bad', 'user-1', { discordGuildId: 'g', discordChannelId: 'c' }))
        .rejects.toThrow(NotFoundException);
    });
  });
});
