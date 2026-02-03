import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Currency } from '../../wallet/entities/wallet.entity';

export enum TransactionType {
  FUNDING = 'funding',
  CONVERSION = 'conversion',
  TRADE = 'trade',
  TRANSFER = 'transfer',
  WITHDRAWAL = 'withdrawal',
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('transactions')
@Index(['userId', 'type'])
@Index(['reference'], { unique: true })
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ unique: true })
  reference: string;

  @Column({
    type: 'enum',
    enum: Currency,
  })
  fromCurrency: Currency;

  @Column({
    type: 'enum',
    enum: Currency,
    nullable: true,
  })
  toCurrency: Currency;

  @Column({
    type: 'decimal',
    precision: 20,
    scale: 8,
  })
  fromAmount: number;

  @Column({
    type: 'decimal',
    precision: 20,
    scale: 8,
    nullable: true,
  })
  toAmount: number;

  @Column({
    type: 'decimal',
    precision: 20,
    scale: 8,
    nullable: true,
  })
  rate: number;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ nullable: true })
  failedAt: Date;

  @Column({ nullable: true })
  failureReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
