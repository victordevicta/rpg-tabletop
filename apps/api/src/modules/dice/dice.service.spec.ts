import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DiceService } from './dice.service';
import { PrismaService } from '../../prisma.module';
import { roll } from '@eldertable/dice-engine';

jest.mock('@eldertable/dice-engine', () => ({ roll: jest.fn() }));
const mockRoll = roll as jest.MockedFunction<typeof roll>;

describe('DiceService', () => {
  let service: DiceService;
  let prisma: { chatMessage: { create: jest.Mock }; diceRoll: { create: jest.Mock; findMany: jest.Mock } };

  const fakeMessage  = { id: 'msg-1', worldId: 'w-1', type: 'roll', content: '' };
  const fakeDiceRoll = { id: 'roll-1', expression: '2d6', result: { total: 8 } };

  beforeEach(async () => {
    prisma = {
      chatMessage: { create: jest.fn().mockResolvedValue(fakeMessage) },
      diceRoll: {
        create: jest.fn().mockResolvedValue(fakeDiceRoll),
        findMany: jest.fn().mockResolvedValue([fakeDiceRoll]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(DiceService);
    mockRoll.mockReturnValue({ total: 8, rolls: [[3, 5]], notation: '2d6' } as any);
  });

  afterEach(() => jest.clearAllMocks());

  // ── rollExpression ────────────────────────────────────────────────────────

  describe('rollExpression', () => {
    it('rolls, saves chat message and dice roll, returns all three', async () => {
      const result = await service.rollExpression({ expression: '2d6', worldId: 'w-1' });

      expect(mockRoll).toHaveBeenCalledWith('2d6');
      expect(prisma.chatMessage.create).toHaveBeenCalledTimes(1);
      expect(prisma.diceRoll.create).toHaveBeenCalledTimes(1);
      expect(result.result.total).toBe(8);
      expect(result.message).toEqual(fakeMessage);
      expect(result.diceRoll).toEqual(fakeDiceRoll);
    });

    it('prefixes content with bold label when label is provided', async () => {
      await service.rollExpression({ expression: '1d20', worldId: 'w-1', label: 'Attack' });

      const { content } = prisma.chatMessage.create.mock.calls[0][0].data;
      expect(content).toContain('**Attack**');
    });

    it('sets speaker to System when no Discord user', async () => {
      await service.rollExpression({ expression: '1d6', worldId: 'w-1' });

      const { speaker } = prisma.chatMessage.create.mock.calls[0][0].data;
      expect(speaker).toBe('System');
    });

    it('sets speaker to Discord:{id} when fromDiscord', async () => {
      await service.rollExpression({ expression: '1d6', worldId: 'w-1', fromDiscord: true, discordUserId: 'u42' });

      const { speaker } = prisma.chatMessage.create.mock.calls[0][0].data;
      expect(speaker).toBe('Discord:u42');
    });

    it('throws BadRequestException on invalid expression', async () => {
      mockRoll.mockImplementation(() => { throw new Error('parse error'); });

      await expect(service.rollExpression({ expression: 'abc!!', worldId: 'w-1' }))
        .rejects.toThrow(BadRequestException);
    });

    it('stores fromDiscord as false by default', async () => {
      await service.rollExpression({ expression: '1d6', worldId: 'w-1' });

      const { fromDiscord } = prisma.diceRoll.create.mock.calls[0][0].data;
      expect(fromDiscord).toBe(false);
    });
  });

  // ── getHistory ────────────────────────────────────────────────────────────

  describe('getHistory', () => {
    it('queries by worldId with default limit of 50', async () => {
      await service.getHistory('w-1');

      expect(prisma.diceRoll.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { worldId: 'w-1' }, take: 50 }),
      );
    });

    it('respects custom limit', async () => {
      await service.getHistory('w-1', 10);

      expect(prisma.diceRoll.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });

    it('orders by createdAt descending', async () => {
      await service.getHistory('w-1');

      expect(prisma.diceRoll.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });
  });
});
