import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletController } from './controllers/wallet.controller';
import { WalletService } from './services/wallet.service';
import { WalletOperationsService } from './services/wallet-operations.service';
import { Wallet } from './entities/wallet.entity';
import { TransactionModule } from '../transaction/transaction.module';
import { FxModule } from '../fx/fx.module';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet]), TransactionModule, FxModule],
  controllers: [WalletController],
  providers: [WalletService, WalletOperationsService],
  exports: [WalletService, WalletOperationsService],
})
export class WalletModule {}
