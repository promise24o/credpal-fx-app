import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './controllers/admin.controller';
import { UserService } from '../auth/services/user.service';
import { WalletService } from '../wallet/services/wallet.service';
import { TransactionService } from '../transaction/services/transaction.service';
import { FxService } from '../fx/services/fx.service';
import { User } from '../auth/entities/user.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { Transaction } from '../transaction/entities/transaction.entity';
import { AuthModule } from '../auth/auth.module';
import { WalletModule } from '../wallet/wallet.module';
import { TransactionModule } from '../transaction/transaction.module';
import { FxModule } from '../fx/fx.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Wallet, Transaction]),
    AuthModule,
    WalletModule,
    TransactionModule,
    FxModule,
  ],
  controllers: [AdminController],
  providers: [],
  exports: [],
})
export class AdminModule {}
