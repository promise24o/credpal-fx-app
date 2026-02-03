import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Transaction, TransactionType, TransactionStatus } from '../entities/transaction.entity';
import { Currency } from '../../wallet/entities/wallet.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
  ) {}

  async createTransaction(
    userId: string,
    type: TransactionType,
    fromCurrency: Currency,
    fromAmount: number,
    description: string,
    toCurrency?: Currency,
    toAmount?: number,
    rate?: number,
    metadata?: Record<string, any>,
    transactionalEntityManager?: EntityManager,
    idempotencyKey?: string,
  ): Promise<Transaction> {
    const transaction = {
      userId,
      type,
      fromCurrency,
      fromAmount,
      toCurrency,
      toAmount,
      rate,
      description,
      reference: this.generateReference(),
      status: TransactionStatus.PENDING,
      metadata: {
        ...metadata,
        idempotencyKey,
      },
    };

    if (transactionalEntityManager) {
      return transactionalEntityManager.save(Transaction, transaction);
    } else {
      return this.transactionRepository.save(transaction);
    }
  }

  async completeTransaction(
    transactionId: string,
    transactionalEntityManager?: EntityManager,
  ): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
    });
    
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    transaction.status = TransactionStatus.COMPLETED;
    transaction.completedAt = new Date();

    if (transactionalEntityManager) {
      return transactionalEntityManager.save(Transaction, transaction);
    } else {
      return this.transactionRepository.save(transaction);
    }
  }

  async failTransaction(
    transactionId: string,
    reason: string,
    transactionalEntityManager?: EntityManager,
  ): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
    });
    
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    transaction.status = TransactionStatus.FAILED;
    transaction.failedAt = new Date();
    transaction.failureReason = reason;

    if (transactionalEntityManager) {
      return transactionalEntityManager.save(Transaction, transaction);
    } else {
      return this.transactionRepository.save(transaction);
    }
  }

  async cancelTransaction(
    transactionId: string,
    reason?: string,
    transactionalEntityManager?: EntityManager,
  ): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
    });
    
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new Error('Cannot cancel a transaction that is not pending');
    }

    transaction.status = TransactionStatus.CANCELLED;
    transaction.metadata = { ...transaction.metadata, cancellationReason: reason };

    if (transactionalEntityManager) {
      return transactionalEntityManager.save(Transaction, transaction);
    } else {
      return this.transactionRepository.save(transaction);
    }
  }

  async getTransactionById(transactionId: string): Promise<Transaction> {
    return this.transactionRepository.findOne({
      where: { id: transactionId },
      relations: ['user'],
    });
  }

  async getUserTransactions(
    userId: string,
    options: {
      type?: TransactionType;
      status?: TransactionStatus;
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const {
      type,
      status,
      limit = 20,
      offset = 0,
      startDate,
      endDate,
    } = options;

    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.userId = :userId', { userId });

    if (type) {
      queryBuilder.andWhere('transaction.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('transaction.status = :status', { status });
    }

    if (startDate) {
      queryBuilder.andWhere('transaction.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('transaction.createdAt <= :endDate', { endDate });
    }

    const [transactions, total] = await queryBuilder
      .orderBy('transaction.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { transactions, total };
  }

  async getTransactionsByReference(reference: string): Promise<Transaction> {
    return this.transactionRepository.findOne({
      where: { reference },
      relations: ['user'],
    });
  }

  async getTransactionStats(
    userId: string,
    period: 'day' | 'week' | 'month' | 'year' = 'month',
  ): Promise<any> {
    const dateFilter = this.getDateFilter(period);

    const stats = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('transaction.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(transaction.fromAmount)', 'totalVolume')
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED })
      .andWhere('transaction.createdAt >= :startDate', { startDate: dateFilter })
      .groupBy('transaction.type')
      .getRawMany();

    return stats.map(stat => ({
      type: stat.type,
      count: parseInt(stat.count),
      totalVolume: parseFloat(stat.totalVolume) || 0,
    }));
  }

  private generateReference(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `TXN-${timestamp}-${random}`.toUpperCase();
  }

  private getDateFilter(period: 'day' | 'week' | 'month' | 'year'): Date {
    const now = new Date();
    
    switch (period) {
      case 'day':
        return new Date(now.setDate(now.getDate() - 1));
      case 'week':
        return new Date(now.setDate(now.getDate() - 7));
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1));
      case 'year':
        return new Date(now.setFullYear(now.getFullYear() - 1));
      default:
        return new Date(now.setMonth(now.getMonth() - 1));
    }
  }

  async getAllTransactions(
    page: number = 1,
    limit: number = 10,
    status?: string,
    type?: string
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [transactions, total] = await this.transactionRepository.findAndCount({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { transactions, total };
  }

  async findById(id: string): Promise<Transaction> {
    return this.transactionRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async count(): Promise<number> {
    return this.transactionRepository.count();
  }

  async getTotalVolume(): Promise<number> {
    const result = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.fromAmount)', 'total')
      .where('transaction.status = :status', { status: TransactionStatus.COMPLETED })
      .getRawOne();
    
    return parseFloat(result?.total) || 0;
  }

  async findByIdempotencyKey(userId: string, idempotencyKey: string): Promise<Transaction | null> {
    return this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.userId = :userId', { userId })
      .andWhere("transaction.metadata->>'idempotencyKey' = :idempotencyKey", { idempotencyKey })
      .getOne();
  }

  async findPendingTransaction(
    userId: string,
    type: TransactionType,
    currency: Currency,
  ): Promise<Transaction | null> {
    return this.transactionRepository.findOne({
      where: {
        userId,
        type,
        fromCurrency: currency,
        status: TransactionStatus.PENDING,
      },
      order: { createdAt: 'DESC' },
    });
  }
}
