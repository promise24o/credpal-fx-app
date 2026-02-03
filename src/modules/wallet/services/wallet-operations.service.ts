import { Injectable } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { TransactionService } from '../../transaction/services/transaction.service';
import { FxService } from '../../fx/services/fx.service';
import { TransactionType } from '../../transaction/entities/transaction.entity';
import { BadRequestException } from '@nestjs/common';
import { FundWalletDto } from '../dto/fund-wallet.dto';
import { ConvertCurrencyDto } from '../dto/convert-currency.dto';
import { TradeCurrencyDto } from '../dto/trade-currency.dto';

@Injectable()
export class WalletOperationsService {
  constructor(
    private walletService: WalletService,
    private transactionService: TransactionService,
    private fxService: FxService,
  ) {}

  async fundWallet(userId: string, fundWalletDto: FundWalletDto) {
    const transaction = await this.transactionService.createTransaction(
      userId,
      TransactionType.FUNDING,
      fundWalletDto.currency,
      fundWalletDto.amount,
      fundWalletDto.description || 'Wallet funding',
    );

    await this.walletService.fundWallet(
      userId,
      fundWalletDto.currency,
      fundWalletDto.amount,
      fundWalletDto.description,
    );

    await this.transactionService.completeTransaction(transaction.id);

    return {
      message: 'Wallet funded successfully',
      transactionId: transaction.id,
      amount: fundWalletDto.amount,
      currency: fundWalletDto.currency,
    };
  }

  async convertCurrency(userId: string, convertDto: ConvertCurrencyDto) {
    const rate = await this.fxService.getRate(convertDto.fromCurrency, convertDto.toCurrency);
    
    if (!rate) {
      throw new BadRequestException('Exchange rate not available for this pair');
    }

    const toAmount = convertDto.amount * rate;

    const transaction = await this.transactionService.createTransaction(
      userId,
      TransactionType.CONVERSION,
      convertDto.fromCurrency,
      convertDto.amount,
      `Convert ${convertDto.amount} ${convertDto.fromCurrency} to ${convertDto.toCurrency}`,
      convertDto.toCurrency,
      toAmount,
      rate,
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

    const toAmount = tradeDto.amount * rate;

    const transaction = await this.transactionService.createTransaction(
      userId,
      TransactionType.TRADE,
      tradeDto.fromCurrency,
      tradeDto.amount,
      `Trade ${tradeDto.amount} ${tradeDto.fromCurrency} to ${tradeDto.toCurrency}`,
      tradeDto.toCurrency,
      toAmount,
      rate,
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
      message: 'Trade executed successfully',
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
