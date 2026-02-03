import { Injectable } from '@nestjs/common';
import { UserService } from '../../auth/services/user.service';
import { WalletService } from '../../wallet/services/wallet.service';
import { TransactionService } from '../../transaction/services/transaction.service';
import { FxService } from '../../fx/services/fx.service';
import { UserStatus } from '../../auth/entities/user.entity';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class AdminOperationsService {
  constructor(
    private userService: UserService,
    private walletService: WalletService,
    private transactionService: TransactionService,
    private fxService: FxService,
  ) {}

  async getAllUsers() {
    return this.userService.findAll();
  }

  async getUserById(id: string) {
    return this.userService.findById(id);
  }

  async suspendUser(id: string) {
    return this.userService.updateStatus(id, UserStatus.SUSPENDED);
  }

  async activateUser(id: string) {
    return this.userService.updateStatus(id, UserStatus.ACTIVE);
  }

  async getUserWallets(id: string) {
    return this.walletService.getUserWallets(id);
  }

  async adminFundWallet(userId: string, currency: string, amount: number, description?: string) {
    return this.walletService.adminFundWallet(userId, currency, amount);
  }

  async getAllTransactions() {
    return this.transactionService.getAllTransactions();
  }

  async getTransactionById(id: string) {
    return this.transactionService.findById(id);
  }

  async updateFxRates() {
    return this.fxService.updateRates();
  }

  async getSystemHealth() {
    const totalUsers = await this.userService.count();
    const totalTransactions = await this.transactionService.count();
    const activeUsers = await this.userService.getActiveUsersCount();
    const totalVolume = await this.transactionService.getTotalVolume();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics: {
        totalUsers,
        activeUsers,
        totalTransactions,
        totalVolume,
      },
    };
  }
}
