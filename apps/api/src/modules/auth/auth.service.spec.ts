import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma.module';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock };
    discordAccount: { findUnique: jest.Mock; update: jest.Mock };
  };
  let jwtSign: jest.Mock;

  const mockUser = { id: 'u-1', name: 'Gandalf', email: 'gandalf@shire.com', avatarUrl: '' };

  beforeEach(async () => {
    jwtSign = jest.fn().mockReturnValue('signed-jwt');

    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create:     jest.fn().mockResolvedValue(mockUser),
      },
      discordAccount: {
        findUnique: jest.fn().mockResolvedValue(null),
        update:     jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: jwtSign } },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── mockLogin ─────────────────────────────────────────────────────────────

  describe('mockLogin', () => {
    it('creates a new user when email is not found', async () => {
      const result = await service.mockLogin('Gandalf', 'gandalf@shire.com');

      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      expect(result.user).toEqual(mockUser);
      expect(result.token).toBe('signed-jwt');
    });

    it('reuses existing user when email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.mockLogin('Gandalf', 'gandalf@shire.com');

      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(result.user).toEqual(mockUser);
    });

    it('signs JWT with user id and name', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      await service.mockLogin('Gandalf', 'gandalf@shire.com');

      expect(jwtSign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'u-1', name: 'Gandalf' }),
      );
    });

    it('skips DB lookup and always creates when no email provided', async () => {
      await service.mockLogin('Guest');

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
    });

    it('generates dicebear avatar URL from username', async () => {
      await service.mockLogin('Frodo');

      const { avatarUrl } = prisma.user.create.mock.calls[0][0].data;
      expect(avatarUrl).toContain('Frodo');
      expect(avatarUrl).toContain('dicebear.com');
    });
  });

  // ── getProfile ────────────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('queries user with Discord account included', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, discordAccount: null });

      const result = await service.getProfile('u-1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u-1' },
          include: { discordAccount: true },
        }),
      );
      expect(result).toBeDefined();
    });
  });

  // ── validateDiscordCallback ───────────────────────────────────────────────

  describe('validateDiscordCallback', () => {
    it('creates new user when Discord account does not exist', async () => {
      const result = await service.validateDiscordCallback(
        'd-123', 'DragonSlayer', null, 'access', 'refresh',
      );

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'DragonSlayer' }) }),
      );
      expect(result.token).toBe('signed-jwt');
    });

    it('links Discord account inside the user create call', async () => {
      await service.validateDiscordCallback('d-123', 'DragonSlayer', null, 'access', 'refresh');

      const { discordAccount } = prisma.user.create.mock.calls[0][0].data;
      expect(discordAccount.create.discordId).toBe('d-123');
      expect(discordAccount.create.discordUsername).toBe('DragonSlayer');
    });

    it('builds CDN avatar URL when avatar hash is provided', async () => {
      await service.validateDiscordCallback('d-123', 'User', 'abc123hash', 'access', 'refresh');

      const { avatarUrl } = prisma.user.create.mock.calls[0][0].data;
      expect(avatarUrl).toContain('cdn.discordapp.com');
      expect(avatarUrl).toContain('d-123');
      expect(avatarUrl).toContain('abc123hash');
    });

    it('sets avatarUrl to undefined when no avatar hash', async () => {
      await service.validateDiscordCallback('d-123', 'User', null, 'access', 'refresh');

      const { avatarUrl } = prisma.user.create.mock.calls[0][0].data;
      expect(avatarUrl).toBeUndefined();
    });

    it('updates existing Discord account and returns existing user', async () => {
      prisma.discordAccount.findUnique.mockResolvedValue({ discordId: 'd-123', user: mockUser });

      const result = await service.validateDiscordCallback(
        'd-123', 'NewName', 'newhash', 'tok', 'ref',
      );

      expect(prisma.discordAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { discordId: 'd-123' } }),
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(result.user).toEqual(mockUser);
    });

    it('signs JWT with existing user id when updating Discord account', async () => {
      prisma.discordAccount.findUnique.mockResolvedValue({ discordId: 'd-123', user: mockUser });

      await service.validateDiscordCallback('d-123', 'Name', null, 'tok', 'ref');

      expect(jwtSign).toHaveBeenCalledWith(expect.objectContaining({ sub: 'u-1' }));
    });
  });
});
