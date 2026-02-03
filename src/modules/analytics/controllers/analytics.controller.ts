import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from '../services/analytics.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, AdminGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard overview' })
  @ApiResponse({ status: 200, description: 'Dashboard overview retrieved successfully' })
  async getDashboardOverview() {
    return this.analyticsService.getDashboardOverview();
  }

  @Get('transactions/stats')
  @ApiOperation({ summary: 'Get transaction statistics' })
  @ApiResponse({ status: 200, description: 'Transaction statistics retrieved successfully' })
  async getTransactionStats(@Query('period') period: 'day' | 'week' | 'month' | 'year' = 'month') {
    return this.analyticsService.getTransactionStats(period);
  }

  @Get('currencies/stats')
  @ApiOperation({ summary: 'Get currency statistics' })
  @ApiResponse({ status: 200, description: 'Currency statistics retrieved successfully' })
  async getCurrencyStats() {
    return this.analyticsService.getCurrencyStats();
  }

  @Get('traders/top')
  @ApiOperation({ summary: 'Get top traders' })
  @ApiResponse({ status: 200, description: 'Top traders retrieved successfully' })
  async getTopTraders(@Query('limit') limit: string = '10') {
    return this.analyticsService.getTopTraders(parseInt(limit));
  }

  @Get('volume/daily')
  @ApiOperation({ summary: 'Get daily volume' })
  @ApiResponse({ status: 200, description: 'Daily volume retrieved successfully' })
  async getDailyVolume(@Query('days') days: string = '30') {
    return this.analyticsService.getDailyVolume(parseInt(days));
  }

  @Get('transactions/failed')
  @ApiOperation({ summary: 'Get failed transactions' })
  @ApiResponse({ status: 200, description: 'Failed transactions retrieved successfully' })
  async getFailedTransactions() {
    return this.analyticsService.getFailedTransactions();
  }
}
