import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Currency } from '../entities/wallet.entity';

export class FundWalletDto {
  @ApiProperty({ enum: Currency, example: Currency.NGN })
  @IsEnum(Currency)
  currency: Currency;

  @ApiProperty({ example: 1000, minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'Initial wallet funding', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    example: 'uuid-v4-idempotency-key', 
    description: 'Unique key to prevent duplicate transactions',
    required: false 
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
