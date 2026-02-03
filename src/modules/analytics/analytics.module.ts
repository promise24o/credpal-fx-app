import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './services/analytics.service';
import { AnalyticsOperationsService } from './services/analytics-operations.service';
import { AnalyticsController } from './controllers/analytics.controller';
import { Transaction } from '../transaction/entities/transaction.entity';
import { User } from '../auth/entities/user.entity';
import { Wallet } from '../wallet/entities/wallet.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, User, Wallet])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsOperationsService],
  exports: [AnalyticsService, AnalyticsOperationsService],
})
export class AnalyticsModule {}
