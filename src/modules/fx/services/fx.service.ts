import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { Cache } from 'cache-manager';
import { FxRate } from '../entities/fx-rate.entity';
import { Currency } from '../../wallet/entities/wallet.entity';

@Injectable()
export class FxService {
  private readonly logger = new Logger(FxService.name);
  private readonly API_URL: string;
  private readonly API_KEY: string;
  private rateCache = new Map<string, { rate: number; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(FxRate)
    private fxRateRepository: Repository<FxRate>,
    private configService: ConfigService,
  ) {
    this.API_URL = this.configService.get<string>('FX_API_URL') || 'https://v6.exchangerate-api.com/v6';
    this.API_KEY = this.configService.get<string>('FX_API_KEY');
  }

  async getRate(fromCurrency: Currency, toCurrency: Currency): Promise<number | null> {
    if (fromCurrency === toCurrency) {
      return 1;
    }

    const cacheKey = `${fromCurrency}_${toCurrency}`;
    const cached = this.rateCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.rate;
    }

    try {
      const rate = await this.fetchRateFromAPI(fromCurrency, toCurrency);
      
      if (rate) {
        this.rateCache.set(cacheKey, {
          rate,
          timestamp: Date.now(),
        });

        await this.saveRateToDatabase(fromCurrency, toCurrency, rate);
      }

      return rate;
    } catch (error) {
      this.logger.error(`Failed to fetch rate for ${fromCurrency}-${toCurrency}:`, error);
      
      const dbRate = await this.getRateFromDatabase(fromCurrency, toCurrency);
      if (dbRate) {
        this.rateCache.set(cacheKey, {
          rate: dbRate,
          timestamp: Date.now(),
        });
        return dbRate;
      }

      return null;
    }
  }

  private async fetchRateFromAPI(fromCurrency: Currency, toCurrency: Currency): Promise<number | null> {
    if (!this.API_KEY) {
      this.logger.warn('FX API key not configured');
      return null;
    }

    try {
      const response = await axios.get(
        `${this.API_URL}/${this.API_KEY}/pair/${fromCurrency}/${toCurrency}`,
      );

      if (response.data && response.data.result === 'success') {
        return parseFloat(response.data.conversion_rate);
      }

      return null;
    } catch (error) {
      this.logger.error(`API call failed for ${fromCurrency}-${toCurrency}:`, error.response?.data || error.message);
      return null;
    }
  }

  private async getRateFromDatabase(fromCurrency: Currency, toCurrency: Currency): Promise<number | null> {
    const fxRate = await this.fxRateRepository.findOne({
      where: { fromCurrency, toCurrency, isActive: true },
      order: { updatedAt: 'DESC' },
    });

    return fxRate ? parseFloat(fxRate.rate.toString()) : null;
  }

  private async saveRateToDatabase(fromCurrency: Currency, toCurrency: Currency, rate: number) {
    const inverseRate = 1 / rate;

    await this.fxRateRepository.manager.transaction(async (manager) => {
      const existingRate = await manager.findOne(FxRate, {
        where: { fromCurrency, toCurrency },
      });

      if (existingRate) {
        existingRate.rate = rate;
        existingRate.inverseRate = inverseRate;
        existingRate.updatedAt = new Date();
        await manager.save(existingRate);
      } else {
        const newRate = manager.create(FxRate, {
          fromCurrency,
          toCurrency,
          rate,
          inverseRate,
        });
        await manager.save(newRate);
      }

      const existingInverseRate = await manager.findOne(FxRate, {
        where: { fromCurrency: toCurrency, toCurrency: fromCurrency },
      });

      if (existingInverseRate) {
        existingInverseRate.rate = inverseRate;
        existingInverseRate.inverseRate = rate;
        existingInverseRate.updatedAt = new Date();
        await manager.save(existingInverseRate);
      } else {
        const newInverseRate = manager.create(FxRate, {
          fromCurrency: toCurrency,
          toCurrency: fromCurrency,
          rate: inverseRate,
          inverseRate: rate,
        });
        await manager.save(newInverseRate);
      }
    });
  }

  async getAllRates(baseCurrency: Currency = Currency.USD): Promise<Map<string, number>> {
    const rates = new Map<string, number>();

    try {
      const response = await axios.get(
        `${this.API_URL}/${this.API_KEY}/latest/${baseCurrency}`,
      );

      if (response.data && response.data.result === 'success') {
        Object.entries(response.data.conversion_rates).forEach(([currency, rate]) => {
          rates.set(`${baseCurrency}_${currency}`, parseFloat(rate.toString()));
        });
      }
    } catch (error) {
      this.logger.error(`Failed to fetch all rates for ${baseCurrency}:`, error);
    }

    return rates;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updateRates() {
    this.logger.log('Updating FX rates...');
    
    const currencies = Object.values(Currency);
    const baseCurrency = Currency.USD;

    try {
      const rates = await this.getAllRates(baseCurrency);
      
      for (const fromCurrency of currencies) {
        for (const toCurrency of currencies) {
          if (fromCurrency !== toCurrency) {
            const rateKey = `${fromCurrency}_${toCurrency}`;
            let rate: number;

            if (fromCurrency === baseCurrency) {
              rate = rates.get(rateKey);
            } else if (toCurrency === baseCurrency) {
              const inverseKey = `${toCurrency}_${fromCurrency}`;
              const inverseRate = rates.get(inverseKey);
              rate = inverseRate ? 1 / inverseRate : null;
            } else {
              const fromToUSD = rates.get(`${fromCurrency}_${baseCurrency}`);
              const toToUSD = rates.get(`${toCurrency}_${baseCurrency}`);
              rate = fromToUSD && toToUSD ? fromToUSD / toToUSD : null;
            }

            if (rate) {
              await this.saveRateToDatabase(fromCurrency, toCurrency, rate);
              this.rateCache.set(rateKey, {
                rate,
                timestamp: Date.now(),
              });
            }
          }
        }
      }

      this.logger.log('FX rates updated successfully');
    } catch (error) {
      this.logger.error('Failed to update FX rates:', error);
    }
  }

  async getHistoricalRates(fromCurrency: Currency, toCurrency: Currency, days: number = 30) {
    this.logger.warn('Historical rates not implemented - requires premium API subscription');
    return [];
  }
}
