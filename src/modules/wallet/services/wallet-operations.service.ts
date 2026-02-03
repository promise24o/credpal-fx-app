import { Injectable } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { TransactionService } from '../../transaction/services/transaction.service';
import { FxService } from '../../fx/services/fx.service';
import { TransactionType } from '../../transaction/entities/transaction.entity';
import { BadRequestException } from '@nestjs/common';
import { FundWalletDto } from '../dto/fund-wallet.dto';
import { ConvertCurrencyDto } from '../dto/convert-currency.dto';
import { TradeCurrencyDto } from '../dto/trade-currency.dto';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

@Injectable()
export class WalletOperationsService {
  constructor(
    private walletService: WalletService,
    private transactionService: TransactionService,
    private fxService: FxService,
    @InjectEntityManager()
    private entityManager: EntityManager,
  ) {}

  async fundWallet(userId: string, fundWalletDto: FundWalletDto) {
    // 1. Check idempotency to prevent duplicate requests
    if (fundWalletDto.idempotencyKey) {
      const existingTx = await this.transactionService.findByIdempotencyKey(
        userId, 
        fundWalletDto.idempotencyKey
      );
      if (existingTx) {
        return {
          message: 'Transaction already processed',
          transactionId: existingTx.id,
          amount: existingTx.fromAmount,
          currency: existingTx.fromCurrency,
        };
      }
    }

    // 2. Check for existing pending funding transaction
    const pendingTx = await this.transactionService.findPendingTransaction(
      userId,
      TransactionType.FUNDING,
      fundWalletDto.currency
    );

    if (pendingTx) {
      throw new BadRequestException('Funding already in progress');
    }

    // 3. Use database transaction with locking to prevent race conditions
    return await this.entityManager.transaction(async manager => {
      // Lock user wallet to prevent concurrent operations
      const wallet = await manager.findOne('Wallet', {
        where: { userId, currency: fundWalletDto.currency },
        lock: { mode: 'pessimistic_write' }
      });

      const transaction = await this.transactionService.createFundingTransaction(
        userId,
        fundWalletDto.currency,
        fundWalletDto.amount,
        fundWalletDto.description || 'Wallet funding',
        manager,
        fundWalletDto.idempotencyKey
      );

      await this.walletService.fundWallet(
        userId,
        fundWalletDto.currency,
        fundWalletDto.amount,
        fundWalletDto.description,
      );

      await this.transactionService.completeTransaction(transaction.id, manager);

      return {
        message: 'Wallet funded successfully',
        transactionId: transaction.id,
        amount: fundWalletDto.amount,
        currency: fundWalletDto.currency,
      };
    });
  }

  async convertCurrency(userId: string, convertDto: ConvertCurrencyDto) {
    const rate = await this.fxService.getRate(convertDto.fromCurrency, convertDto.toCurrency);
    
    if (!rate) {
      throw new BadRequestException('Exchange rate not available for this pair');
    }

    // Validate sufficient balance before starting transaction
    await this.walletService.validateSufficientBalance(
      userId, 
      convertDto.fromCurrency, 
      convertDto.amount
    );

    const toAmount = convertDto.amount * rate;

    const transaction = await this.transactionService.createConversionTransaction(
      userId,
      convertDto.fromCurrency,
      convertDto.amount,
      convertDto.toCurrency,
      toAmount,
      rate,
      `Convert ${convertDto.amount} ${convertDto.fromCurrency} to ${convertDto.toCurrency}`
    );

    await this.walletService.freezeBalance(
      userId,
      convertDto.fromCurrency,
      convertDto.amount,
    );

    await this.walletService.deductBalance(
      userId,
      convertDto.fromCurrency,
      convertDto.amount,
    );

    await this.walletService.addBalance(
      userId,
      convertDto.toCurrency,
      toAmount,
    );

    await this.transactionService.completeTransaction(transaction.id);

    return {
      message: 'Currency converted successfully',
      transactionId: transaction.id,
      fromAmount: convertDto.amount,
      fromCurrency: convertDto.fromCurrency,
      toAmount,
      toCurrency: convertDto.toCurrency,
      rate,
    };
  }

  async tradeCurrency(userId: string, tradeDto: TradeCurrencyDto) {
    const rate = await this.fxService.getRate(tradeDto.fromCurrency, tradeDto.toCurrency);
    
    if (!rate) {
      throw new BadRequestException('Exchange rate not available for this pair');
    }

    if (tradeDto.expectedRate && Math.abs(rate - tradeDto.expectedRate) > (rate * 0.01)) {
      throw new BadRequestException('Rate has changed significantly. Please try again.');
    }

    // Validate sufficient balance before starting transaction
    await this.walletService.validateSufficientBalance(
      userId, 
      tradeDto.fromCurrency, 
      tradeDto.amount
    );

    const toAmount = tradeDto.amount * rate;

    const transaction = await this.transactionService.createTradeTransaction(
      userId,
      tradeDto.fromCurrency,
      tradeDto.amount,
      tradeDto.toCurrency,
      toAmount,
      rate,
      `Trade ${tradeDto.amount} ${tradeDto.fromCurrency} to ${tradeDto.toCurrency}`
    );

    await this.walletService.freezeBalance(
      userId,
      tradeDto.fromCurrency,
      tradeDto.amount,
    );

    await this.walletService.deductBalance(
      userId,
      tradeDto.fromCurrency,
      tradeDto.amount,
    );

    await this.walletService.addBalance(
      userId,
      tradeDto.toCurrency,
      toAmount,
    );

    await this.transactionService.completeTransaction(transaction.id);

    return {
      message: 'Currency traded successfully',
      transactionId: transaction.id,
      fromAmount: tradeDto.amount,
      fromCurrency: tradeDto.fromCurrency,
      toAmount,
      toCurrency: tradeDto.toCurrency,
      rate,
    };
  }

  async getUserWallets(userId: string) {
    const wallets = await this.walletService.getUserWallets(userId);
    return {
      wallets: wallets.map(w => ({
        currency: w.currency,
        balance: w.balance,
        frozenBalance: w.frozenBalance,
      })),
    };
  }
}
