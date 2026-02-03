import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { Transaction, TransactionType, TransactionStatus } from '../../transaction/entities/transaction.entity';
import { User } from '../../auth/entities/user.entity';
import { Wallet, Currency } from '../../wallet/entities/wallet.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
  ) {}

  async getDashboardOverview() {
    const [
      totalUsers,
      totalTransactions,
      totalVolume,
      activeUsers,
      recentTransactions
    ] = await Promise.all([
      this.userRepository.count(),
      this.transactionRepository.count(),
      this.getTotalVolume(),
      this.getActiveUsersCount(),
      this.getRecentTransactions(10)
    ]);

    return {
      totalUsers,
      totalTransactions,
      totalVolume,
      activeUsers,
      recentTransactions
    };
  }

  async getTransactionStats(period: 'day' | 'week' | 'month' | 'year' = 'month') {
    const date = this.getStartDate(period);
    
    const stats = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('transaction.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(transaction.fromAmount)', 'totalVolume')
      .where('transaction.createdAt >= :date', { date })
      .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED })
      .groupBy('transaction.type')
      .getRawMany();

    return stats.map(stat => ({
      type: stat.type,
      count: parseInt(stat.count),
      totalVolume: parseFloat(stat.totalVolume) || 0
    }));
  }

  async getCurrencyStats() {
    const currencyStats = await this.walletRepository
      .createQueryBuilder('wallet')
      .select('wallet.currency', 'currency')
      .addSelect('COUNT(*)', 'userCount')
      .addSelect('SUM(wallet.balance)', 'totalBalance')
      .where('wallet.balance > 0')
      .groupBy('wallet.currency')
      .getRawMany();

    return currencyStats.map(stat => ({
      currency: stat.currency,
      userCount: parseInt(stat.userCount),
      totalBalance: parseFloat(stat.totalBalance) || 0
    }));
  }

  async getTopTraders(limit: number = 10) {
    const topTraders = await this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoin('transaction.user', 'user')
      .select('user.email', 'email')
      .addSelect('COUNT(*)', 'transactionCount')
      .addSelect('SUM(transaction.fromAmount)', 'totalVolume')
      .where('transaction.status = :status', { status: TransactionStatus.COMPLETED })
      .andWhere('transaction.type IN (:...types)', { types: [TransactionType.CONVERSION, TransactionType.TRADE] })
      .groupBy('user.id')
      .orderBy('SUM(transaction.fromAmount)', 'DESC')
      .limit(limit)
      .getRawMany();

    return topTraders.map(trader => ({
      email: trader.email,
      transactionCount: parseInt(trader.transactionCount),
      totalVolume: parseFloat(trader.totalVolume) || 0
    }));
  }

  async getDailyVolume(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dailyVolume = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('DATE(transaction.createdAt)', 'date')
      .addSelect('SUM(transaction.fromAmount)', 'volume')
      .where('transaction.createdAt >= :startDate', { startDate })
      .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED })
      .groupBy('DATE(transaction.createdAt)')
      .orderBy('DATE(transaction.createdAt)', 'ASC')
      .getRawMany();

    return dailyVolume.map(day => ({
      date: day.date,
      volume: parseFloat(day.volume) || 0
    }));
  }

  async getFailedTransactions() {
    const failedTransactions = await this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoin('transaction.user', 'user')
      .select('transaction.type', 'type')
      .addSelect('transaction.failureReason', 'reason')
      .addSelect('COUNT(*)', 'count')
      .where('transaction.status = :status', { status: TransactionStatus.FAILED })
      .groupBy('transaction.type')
      .addGroupBy('transaction.failureReason')
      .getRawMany();

    return failedTransactions.map(failed => ({
      type: failed.type,
      reason: failed.reason || 'Unknown',
      count: parseInt(failed.count)
    }));
  }

  private async getTotalVolume(): Promise<number> {
    const result = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.fromAmount)', 'total')
      .where('transaction.status = :status', { status: TransactionStatus.COMPLETED })
      .getRawOne();
    
    return parseFloat(result?.total) || 0;
  }

  private async getActiveUsersCount(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return this.transactionRepository
      .createQueryBuilder('transaction')
      .select('COUNT(DISTINCT transaction.userId)', 'count')
      .where('transaction.createdAt >= :date', { date: thirtyDaysAgo })
      .getRawOne()
      .then(result => parseInt(result?.count) || 0);
  }

  private async getRecentTransactions(limit: number) {
    return this.transactionRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  private getStartDate(period: 'day' | 'week' | 'month' | 'year'): Date {
    const now = new Date();
    switch (period) {
      case 'day':
        now.setDate(now.getDate() - 1);
        break;
      case 'week':
        now.setDate(now.getDate() - 7);
        break;
      case 'month':
        now.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        now.setFullYear(now.getFullYear() - 1);
        break;
    }
    return now;
  }
}
