import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Currency } from '../../wallet/entities/wallet.entity';

@Entity('fx_rates')
@Index(['fromCurrency', 'toCurrency'], { unique: true })
export class FxRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: Currency,
    name: 'from_currency',
  })
  fromCurrency: Currency;

  @Column({
    type: 'enum',
    enum: Currency,
    name: 'to_currency',
  })
  toCurrency: Currency;

  @Column({
    type: 'decimal',
    precision: 20,
    scale: 8,
  })
  rate: number;

  @Column({
    type: 'decimal',
    precision: 20,
    scale: 8,
    default: 0,
  })
  inverseRate: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
