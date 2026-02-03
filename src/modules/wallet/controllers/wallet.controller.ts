import { Controller, Get, Post, UseGuards, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WalletOperationsService } from '../services/wallet-operations.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { FundWalletDto } from '../dto/fund-wallet.dto';
import { ConvertCurrencyDto } from '../dto/convert-currency.dto';
import { TradeCurrencyDto } from '../dto/trade-currency.dto';

@ApiTags('Wallet')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(private readonly walletOperationsService: WalletOperationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user wallet balances' })
  @ApiResponse({ status: 200, description: 'Wallet balances retrieved successfully' })
  async getWallets(@Req() req) {
    return this.walletOperationsService.getUserWallets(req.user.id);
  }

  @Post('fund')
  @ApiOperation({ summary: 'Fund wallet with specified currency' })
  @ApiResponse({ status: 200, description: 'Wallet funded successfully' })
  async fundWallet(@Req() req, @Body() fundWalletDto: FundWalletDto) {
    return this.walletOperationsService.fundWallet(req.user.id, fundWalletDto);
  }

  @Post('convert')
  @ApiOperation({ summary: 'Convert between currencies using real-time FX rates' })
  @ApiResponse({ status: 200, description: 'Currency converted successfully' })
  async convertCurrency(@Req() req, @Body() convertDto: ConvertCurrencyDto) {
    return this.walletOperationsService.convertCurrency(req.user.id, convertDto);
  }

  @Post('trade')
  @ApiOperation({ summary: 'Trade Naira with other currencies and vice versa' })
  @ApiResponse({ status: 200, description: 'Trade executed successfully' })
  async tradeCurrency(@Req() req, @Body() tradeDto: TradeCurrencyDto) {
    return this.walletOperationsService.tradeCurrency(req.user.id, tradeDto);
  }
}
