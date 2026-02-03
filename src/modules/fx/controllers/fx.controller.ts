import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FxService } from '../services/fx.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Currency } from '../../wallet/entities/wallet.entity';

@ApiTags('FX Rates')
@Controller('fx')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FxController {
  constructor(private fxService: FxService) {}

  @Get('rates')
  @ApiOperation({ summary: 'Get current FX rates for supported currency pairs' })
  @ApiResponse({ status: 200, description: 'FX rates retrieved successfully' })
  @ApiQuery({ name: 'base', required: false, enum: Currency, description: 'Base currency (default: USD)' })
  async getRates(@Query('base') baseCurrency?: Currency) {
    const base = baseCurrency || Currency.USD;
    const rates = await this.fxService.getAllRates(base);
    
    const rateArray = Array.from(rates.entries()).map(([pair, rate]) => {
      const [from, to] = pair.split('_');
      return { fromCurrency: from, toCurrency: to, rate };
    });

    return {
      baseCurrency: base,
      rates: rateArray,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('rate')
  @ApiOperation({ summary: 'Get FX rate for a specific currency pair' })
  @ApiResponse({ status: 200, description: 'FX rate retrieved successfully' })
  @ApiQuery({ name: 'from', required: true, enum: Currency })
  @ApiQuery({ name: 'to', required: true, enum: Currency })
  async getRate(
    @Query('from') fromCurrency: Currency,
    @Query('to') toCurrency: Currency,
  ) {
    const rate = await this.fxService.getRate(fromCurrency, toCurrency);
    
    if (!rate) {
      return {
        fromCurrency,
        toCurrency,
        rate: null,
        error: 'Rate not available for this currency pair',
      };
    }

    return {
      fromCurrency,
      toCurrency,
      rate,
      timestamp: new Date().toISOString(),
    };
  }
}
