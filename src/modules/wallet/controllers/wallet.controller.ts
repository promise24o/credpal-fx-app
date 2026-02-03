import { Controller, Get, Post, UseGuards, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from '../services/wallet.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { FundWalletDto } from '../dto/fund-wallet.dto';
import { ConvertCurrencyDto } from '../dto/convert-currency.dto';
import { TradeCurrencyDto } from '../dto/trade-currency.dto';
import { TransactionService } from '../../transaction/services/transaction.service';
import { FxService } from '../../fx/services/fx.service';
import { TransactionType } from '../../transaction/entities/transaction.entity';
import { BadRequestException } from '@nestjs/common';

@ApiTags('Wallet')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(
    private walletService: WalletService,
    private transactionService: TransactionService,
    private fxService: FxService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get user wallet balances' })
  @ApiResponse({ status: 200, description: 'Wallet balances retrieved successfully' })
  async getWallets(@Req() req) {
    const wallets = await this.walletService.getUserWallets(req.user.id);
    return {
      wallets: wallets.map(w => ({
        currency: w.currency,
        balance: w.balance,
        frozenBalance: w.frozenBalance,
      })),
    };
  }

  @Post('fund')
  @ApiOperation({ summary: 'Fund wallet with specified currency' })
  @ApiResponse({ status: 200, description: 'Wallet funded successfully' })
  async fundWallet(@Req() req, @Body() fundWalletDto: FundWalletDto) {
    const transaction = await this.transactionService.createTransaction(
      req.user.id,
      TransactionType.FUNDING,
      fundWalletDto.currency,
      fundWalletDto.amount,
      fundWalletDto.description || 'Wallet funding',
    );

    await this.walletService.fundWallet(
      req.user.id,
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

  @Post('convert')
  @ApiOperation({ summary: 'Convert between currencies using real-time FX rates' })
  @ApiResponse({ status: 200, description: 'Currency converted successfully' })
  async convertCurrency(@Req() req, @Body() convertDto: ConvertCurrencyDto) {
    const rate = await this.fxService.getRate(convertDto.fromCurrency, convertDto.toCurrency);
    
    if (!rate) {
      throw new BadRequestException('Exchange rate not available for this pair');
    }

    const toAmount = convertDto.amount * rate;

    const transaction = await this.transactionService.createTransaction(
      req.user.id,
      TransactionType.CONVERSION,
      convertDto.fromCurrency,
      convertDto.amount,
      `Convert ${convertDto.amount} ${convertDto.fromCurrency} to ${convertDto.toCurrency}`,
      convertDto.toCurrency,
      toAmount,
      rate,
    );

    await this.walletService.freezeBalance(
      req.user.id,
      convertDto.fromCurrency,
      convertDto.amount,
    );

    await this.walletService.deductBalance(
      req.user.id,
      convertDto.fromCurrency,
      convertDto.amount,
    );

    await this.walletService.addBalance(
      req.user.id,
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

  @Post('trade')
  @ApiOperation({ summary: 'Trade Naira with other currencies and vice versa' })
  @ApiResponse({ status: 200, description: 'Trade executed successfully' })
  async tradeCurrency(@Req() req, @Body() tradeDto: TradeCurrencyDto) {
    const rate = await this.fxService.getRate(tradeDto.fromCurrency, tradeDto.toCurrency);
    
    if (!rate) {
      throw new BadRequestException('Exchange rate not available for this pair');
    }

    if (tradeDto.expectedRate && Math.abs(rate - tradeDto.expectedRate) > (rate * 0.01)) {
      throw new BadRequestException('Rate has changed significantly. Please try again.');
    }

    const toAmount = tradeDto.amount * rate;

    const transaction = await this.transactionService.createTransaction(
      req.user.id,
      TransactionType.TRADE,
      tradeDto.fromCurrency,
      tradeDto.amount,
      `Trade ${tradeDto.amount} ${tradeDto.fromCurrency} to ${tradeDto.toCurrency}`,
      tradeDto.toCurrency,
      toAmount,
      rate,
    );

    await this.walletService.freezeBalance(
      req.user.id,
      tradeDto.fromCurrency,
      tradeDto.amount,
    );

    await this.walletService.deductBalance(
      req.user.id,
      tradeDto.fromCurrency,
      tradeDto.amount,
    );

    await this.walletService.addBalance(
      req.user.id,
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
}
