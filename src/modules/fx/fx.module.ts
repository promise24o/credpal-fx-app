import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { FxController } from './controllers/fx.controller';
import { FxService } from './services/fx.service';
import { FxRate } from './entities/fx-rate.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([FxRate]),
    ScheduleModule.forRoot(),
  ],
  controllers: [FxController],
  providers: [FxService],
  exports: [FxService],
})
export class FxModule {}
