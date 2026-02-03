import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WalletService } from '../wallet.service';
import { Wallet, Currency } from '../../entities/wallet.entity';
import { Repository, EntityManager } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('WalletService', () => {
  let service: WalletService;
  let repository: Repository<Wallet>;
  let entityManager: EntityManager;

  const mockWallet = {
    id: 'wallet-id',
    userId: 'user-id',
    currency: Currency.NGN,
    balance: 1000,
    frozenBalance: 0,
    user: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: getRepositoryToken(Wallet),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    repository = module.get<Repository<Wallet>>(getRepositoryToken(Wallet));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserWallets', () => {
    it('should return user wallets', async () => {
      jest.spyOn(repository, 'find').mockResolvedValue([mockWallet]);

      const result = await service.getUserWallets('user-id');
      expect(repository.find).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        order: { currency: 'ASC' },
      });
      expect(result).toEqual([mockWallet]);
    });
  });

  describe('getWalletByCurrency', () => {
    it('should return wallet for specific currency', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockWallet);

      const result = await service.getWalletByCurrency('user-id', Currency.NGN);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-id', currency: Currency.NGN },
      });
      expect(result).toEqual(mockWallet);
    });

    it('should throw NotFoundException if wallet not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.getWalletByCurrency('user-id', Currency.USD))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('fundWallet', () => {
    it('should fund wallet successfully', async () => {
      const updatedWallet = { ...mockWallet, balance: 2000 };
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockWallet);
      jest.spyOn(repository, 'save').mockResolvedValue(updatedWallet as any);

      const result = await service.fundWallet('user-id', Currency.NGN, 1000);
      expect(result.balance).toBe(2000);
    });

    it('should throw BadRequestException for invalid amount', async () => {
      await expect(service.fundWallet('user-id', Currency.NGN, -100))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('freezeBalance', () => {
    it('should freeze balance successfully', async () => {
      const updatedWallet = { ...mockWallet, balance: 500, frozenBalance: 500 };
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockWallet);
      jest.spyOn(repository, 'save').mockResolvedValue(updatedWallet as any);

      const result = await service.freezeBalance('user-id', Currency.NGN, 500);
      expect(result.balance).toBe(500);
      expect(result.frozenBalance).toBe(500);
    });

    it('should throw BadRequestException for insufficient balance', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockWallet);

      await expect(service.freezeBalance('user-id', Currency.NGN, 2000))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('deductBalance', () => {
    it('should deduct from frozen balance successfully', async () => {
      const walletWithFrozen = { ...mockWallet, frozenBalance: 500 };
      const updatedWallet = { ...mockWallet, frozenBalance: 0 };
      jest.spyOn(repository, 'findOne').mockResolvedValue(walletWithFrozen);
      jest.spyOn(repository, 'save').mockResolvedValue(updatedWallet as any);

      const result = await service.deductBalance('user-id', Currency.NGN, 500);
      expect(result.frozenBalance).toBe(0);
    });

    it('should throw BadRequestException for insufficient frozen balance', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockWallet);

      await expect(service.deductBalance('user-id', Currency.NGN, 100))
        .rejects.toThrow(BadRequestException);
    });
  });
});
