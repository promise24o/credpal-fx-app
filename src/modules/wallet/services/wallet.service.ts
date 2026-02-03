import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Wallet, Currency } from '../entities/wallet.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
  ) {}

  async createDefaultWallets(userId: string, transactionalEntityManager?: EntityManager) {
    const repository = transactionalEntityManager || this.walletRepository;
    
    const defaultCurrencies = [Currency.NGN, Currency.USD, Currency.EUR, Currency.GBP];
    const wallets = defaultCurrencies.map(currency => {
      const walletData = {
        userId,
        currency,
        balance: 0,
        frozenBalance: 0,
      };
      
      if (transactionalEntityManager) {
        return transactionalEntityManager.create(Wallet, walletData);
      } else {
        return this.walletRepository.create(walletData);
      }
    });

    if (transactionalEntityManager) {
      await transactionalEntityManager.save(Wallet, wallets);
    } else {
      await this.walletRepository.save(wallets);
    }
    return wallets;
  }

  async getUserWallets(userId: string): Promise<Wallet[]> {
    return this.walletRepository.find({
      where: { userId },
      order: { currency: 'ASC' },
    });
  }

  async getWalletByCurrency(userId: string, currency: Currency): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({
      where: { userId, currency },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet for ${currency} not found`);
    }

    return wallet;
  }

  async fundWallet(
    userId: string,
    currency: Currency,
    amount: number,
    description?: string,
    transactionalEntityManager?: EntityManager,
  ): Promise<Wallet> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const wallet = await this.getWalletByCurrency(userId, currency);
    wallet.balance = Number(wallet.balance) + amount;
    
    if (transactionalEntityManager) {
      return transactionalEntityManager.save(Wallet, wallet);
    } else {
      return this.walletRepository.save(wallet);
    }
  }

  async freezeBalance(
    userId: string,
    currency: Currency,
    amount: number,
    transactionalEntityManager?: EntityManager,
  ): Promise<Wallet> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const wallet = await this.getWalletByCurrency(userId, currency);

    if (Number(wallet.balance) < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    wallet.balance = Number(wallet.balance) - amount;
    wallet.frozenBalance = Number(wallet.frozenBalance) + amount;
    
    if (transactionalEntityManager) {
      return transactionalEntityManager.save(Wallet, wallet);
    } else {
      return this.walletRepository.save(wallet);
    }
  }

  async unfreezeBalance(
    userId: string,
    currency: Currency,
    amount: number,
    transactionalEntityManager?: EntityManager,
  ): Promise<Wallet> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const wallet = await this.getWalletByCurrency(userId, currency);

    if (Number(wallet.frozenBalance) < amount) {
      throw new BadRequestException('Insufficient frozen balance');
    }

    wallet.frozenBalance = Number(wallet.frozenBalance) - amount;
    wallet.balance = Number(wallet.balance) + amount;
    
    if (transactionalEntityManager) {
      return transactionalEntityManager.save(Wallet, wallet);
    } else {
      return this.walletRepository.save(wallet);
    }
  }

  async deductBalance(
    userId: string,
    currency: Currency,
    amount: number,
    transactionalEntityManager?: EntityManager,
  ): Promise<Wallet> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const wallet = await this.getWalletByCurrency(userId, currency);

    if (Number(wallet.frozenBalance) < amount) {
      throw new BadRequestException('Insufficient frozen balance');
    }

    wallet.frozenBalance = Number(wallet.frozenBalance) - amount;
    
    if (transactionalEntityManager) {
      return transactionalEntityManager.save(Wallet, wallet);
    } else {
      return this.walletRepository.save(wallet);
    }
  }

  async addBalance(
    userId: string,
    currency: Currency,
    amount: number,
    transactionalEntityManager?: EntityManager,
  ): Promise<Wallet> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const wallet = await this.getWalletByCurrency(userId, currency);
    wallet.balance = Number(wallet.balance) + amount;
    
    if (transactionalEntityManager) {
      return transactionalEntityManager.save(Wallet, wallet);
    } else {
      return this.walletRepository.save(wallet);
    }
  }

  async createWalletIfNotExists(userId: string, currency: Currency): Promise<Wallet> {
    let wallet = await this.walletRepository.findOne({
      where: { userId, currency },
    });

    if (!wallet) {
      wallet = this.walletRepository.create({
        userId,
        currency,
        balance: 0,
        frozenBalance: 0,
      });
      await this.walletRepository.save(wallet);
    }

    return wallet;
  }

  async getTotalBalanceInNGN(userId: string, rates: Map<string, number>): Promise<number> {
    const wallets = await this.getUserWallets(userId);
    let totalNGN = 0;

    for (const wallet of wallets) {
      if (wallet.currency === Currency.NGN) {
        totalNGN += Number(wallet.balance);
      } else {
        const rate = rates.get(`${wallet.currency}_NGN`);
        if (rate) {
          totalNGN += Number(wallet.balance) * rate;
        }
      }
    }

    return totalNGN;
  }

  async adminFundWallet(userId: string, currency: string, amount: number): Promise<Wallet> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const wallet = await this.walletRepository.findOne({
      where: { userId, currency: currency as Currency },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet for ${currency} not found`);
    }

    wallet.balance = Number(wallet.balance) + amount;
    return this.walletRepository.save(wallet);
  }
}
