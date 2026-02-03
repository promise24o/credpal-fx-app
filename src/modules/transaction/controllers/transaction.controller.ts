import { Controller, Get, Query, UseGuards, Req, Param } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { TransactionService } from '../services/transaction.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TransactionType, TransactionStatus } from '../entities/transaction.entity';

@ApiTags('Transactions')
@Controller('transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionController {
  constructor(private transactionService: TransactionService) {}

  @Get()
  @ApiOperation({ summary: 'Get user transaction history' })
  @ApiResponse({ status: 200, description: 'Transaction history retrieved successfully' })
  @ApiQuery({ name: 'type', required: false, enum: TransactionType })
  @ApiQuery({ name: 'status', required: false, enum: TransactionStatus })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getTransactions(
    @Req() req,
    @Query('type') type?: TransactionType,
    @Query('status') status?: TransactionStatus,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const { transactions, total } = await this.transactionService.getUserTransactions(
      req.user.id,
      {
        type,
        status,
        limit: limit ? parseInt(limit.toString()) : undefined,
        offset: offset ? parseInt(offset.toString()) : undefined,
      },
    );

    return {
      transactions: transactions.map(t => ({
        id: t.id,
        reference: t.reference,
        type: t.type,
        status: t.status,
        fromCurrency: t.fromCurrency,
        fromAmount: t.fromAmount,
        toCurrency: t.toCurrency,
        toAmount: t.toAmount,
        rate: t.rate,
        description: t.description,
        createdAt: t.createdAt,
        completedAt: t.completedAt,
        failedAt: t.failedAt,
        failureReason: t.failureReason,
      })),
      pagination: {
        total,
        limit: limit || 20,
        offset: offset || 0,
      },
    };
  }

  @Get(':transactionId')
  @ApiOperation({ summary: 'Get transaction details by ID' })
  @ApiResponse({ status: 200, description: 'Transaction details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  async getTransaction(@Req() req, @Param('transactionId') transactionId: string) {
    const transaction = await this.transactionService.getTransactionById(transactionId);

    if (!transaction || transaction.userId !== req.user.id) {
      throw new NotFoundException('Transaction not found');
    }

    return {
      id: transaction.id,
      reference: transaction.reference,
      type: transaction.type,
      status: transaction.status,
      fromCurrency: transaction.fromCurrency,
      fromAmount: transaction.fromAmount,
      toCurrency: transaction.toCurrency,
      toAmount: transaction.toAmount,
      rate: transaction.rate,
      description: transaction.description,
      metadata: transaction.metadata,
      createdAt: transaction.createdAt,
      completedAt: transaction.completedAt,
      failedAt: transaction.failedAt,
      failureReason: transaction.failureReason,
    };
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'Get transaction statistics' })
  @ApiResponse({ status: 200, description: 'Transaction statistics retrieved successfully' })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month', 'year'] })
  async getTransactionStats(
    @Req() req,
    @Query('period') period: 'day' | 'week' | 'month' | 'year' = 'month',
  ) {
    const stats = await this.transactionService.getTransactionStats(req.user.id, period);
    
    return {
      period,
      stats,
      totalTransactions: stats.reduce((sum, stat) => sum + stat.count, 0),
      totalVolume: stats.reduce((sum, stat) => sum + stat.totalVolume, 0),
    };
  }
}
