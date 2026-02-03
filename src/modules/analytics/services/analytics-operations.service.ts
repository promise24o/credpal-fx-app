import { Injectable } from '@nestjs/common';
import { AnalyticsService } from '../services/analytics.service';

@Injectable()
export class AnalyticsOperationsService {
  constructor(private readonly analyticsService: AnalyticsService) {}

  async getDashboardOverview() {
    return this.analyticsService.getDashboardOverview();
  }

  async getTransactionStats(period: 'day' | 'week' | 'month' | 'year' = 'month') {
    return this.analyticsService.getTransactionStats(period);
  }

  async getCurrencyStats() {
    return this.analyticsService.getCurrencyStats();
  }

  async getTopTraders() {
    return this.analyticsService.getTopTraders();
  }

  async getDailyVolume() {
    return this.analyticsService.getDailyVolume();
  }

  async getFailedTransactions() {
    return this.analyticsService.getFailedTransactions();
  }
}
