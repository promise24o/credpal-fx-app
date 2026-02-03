import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TransactionService } from '../transaction.service';
import { Transaction, TransactionType, TransactionStatus } from '../../entities/transaction.entity';
import { Repository, EntityManager } from 'typeorm';
import { Currency } from '../../../wallet/entities/wallet.entity';
import { NotFoundException } from '@nestjs/common';

describe('TransactionService', () => {
  let service: TransactionService;
  let repository: Repository<Transaction>;

  const mockTransaction = {
    id: 'transaction-id',
    userId: 'user-id',
    type: TransactionType.CONVERSION,
    status: TransactionStatus.PENDING,
    reference: 'TXN-ABC123',
    fromCurrency: Currency.NGN,
    toCurrency: Currency.USD,
    fromAmount: 1000,
    toAmount: 6.67,
    rate: 0.00667,
    description: 'Convert NGN to USD',
    user: null,
    metadata: null,
    completedAt: null,
    failedAt: null,
    failureReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
    repository = module.get<Repository<Transaction>>(getRepositoryToken(Transaction));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTransaction', () => {
    it('should create a transaction successfully', async () => {
      const newTransaction = { ...mockTransaction };
      jest.spyOn(repository, 'create').mockReturnValue(newTransaction);
      jest.spyOn(repository, 'save').mockResolvedValue(newTransaction as any);

      const result = await service.createTransaction(
        'user-id',
        TransactionType.CONVERSION,
        Currency.NGN,
        1000,
        'Test transaction',
        Currency.USD,
        6.67,
        0.00667,
      );

      expect(repository.create).toHaveBeenCalled();
      expect(result.reference).toMatch(/^TXN-/);
      expect(result.status).toBe(TransactionStatus.PENDING);
    });
  });

  describe('completeTransaction', () => {
    it('should complete a transaction successfully', async () => {
      const completedTransaction = { ...mockTransaction, status: TransactionStatus.COMPLETED };
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockTransaction as any);
      jest.spyOn(repository, 'save').mockResolvedValue(completedTransaction as any);

      const result = await service.completeTransaction('transaction-id');
      expect(result.status).toBe(TransactionStatus.COMPLETED);
      expect(result.completedAt).toBeDefined();
    });

    it('should throw NotFoundException if transaction not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.completeTransaction('invalid-id'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('failTransaction', () => {
    it('should fail a transaction with reason', async () => {
      const failedTransaction = { 
        ...mockTransaction, 
        status: TransactionStatus.FAILED,
        failureReason: 'Insufficient balance'
      };
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockTransaction as any);
      jest.spyOn(repository, 'save').mockResolvedValue(failedTransaction as any);

      const result = await service.failTransaction('transaction-id', 'Insufficient balance');
      expect(result.status).toBe(TransactionStatus.FAILED);
      expect(result.failureReason).toBe('Insufficient balance');
      expect(result.failedAt).toBeDefined();
    });
  });

  describe('getUserTransactions', () => {
    it('should return user transactions with pagination', async () => {
      const transactions = [mockTransaction];
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([transactions, 1]),
      };

      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.getUserTransactions('user-id', {
        type: TransactionType.CONVERSION,
        limit: 10,
        offset: 0,
      });

      expect(result.transactions).toEqual(transactions);
      expect(result.total).toBe(1);
    });
  });

  describe('getTransactionStats', () => {
    it('should return transaction statistics', async () => {
      const mockStats = [
        { type: TransactionType.CONVERSION, count: 10, totalVolume: 10000 },
        { type: TransactionType.FUNDING, count: 5, totalVolume: 50000 },
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockStats),
      };

      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.getTransactionStats('user-id', 'month');
      expect(result).toEqual(mockStats);
    });
  });
});
