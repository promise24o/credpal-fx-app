import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from '../../auth/services/user.service';
import { WalletService } from '../../wallet/services/wallet.service';
import { TransactionService } from '../../transaction/services/transaction.service';
import { FxService } from '../../fx/services/fx.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { UserStatus } from '../../auth/entities/user.entity';
import { Wallet } from '../../wallet/entities/wallet.entity';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private userService: UserService,
    private walletService: WalletService,
    private transactionService: TransactionService,
    private fxService: FxService,
  ) {}

  @Get('users')
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getAllUsers(@Query('page') page: string = '1', @Query('limit') limit: string = '10') {
    return this.userService.findAll(parseInt(page), parseInt(limit));
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  async getUserById(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Put('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend user' })
  @ApiResponse({ status: 200, description: 'User suspended successfully' })
  async suspendUser(@Param('id') id: string) {
    return this.userService.updateStatus(id, UserStatus.SUSPENDED);
  }

  @Put('users/:id/activate')
  @ApiOperation({ summary: 'Activate user' })
  @ApiResponse({ status: 200, description: 'User activated successfully' })
  async activateUser(@Param('id') id: string) {
    return this.userService.updateStatus(id, UserStatus.ACTIVE);
  }

  @Get('users/:id/wallets')
  @ApiOperation({ summary: 'Get user wallets' })
  @ApiResponse({ status: 200, description: 'User wallets retrieved successfully' })
  async getUserWallets(@Param('id') id: string) {
    return this.walletService.getUserWallets(id);
  }

  @Post('users/:id/fund')
  @ApiOperation({ summary: 'Fund user wallet (Admin)' })
  @ApiResponse({ status: 200, description: 'Wallet funded successfully' })
  async fundUserWallet(
    @Param('id') id: string,
    @Body() body: { currency: string; amount: number }
  ) {
    return this.walletService.adminFundWallet(id, body.currency, body.amount);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get all transactions' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  async getAllTransactions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: string,
    @Query('type') type?: string
  ) {
    return this.transactionService.getAllTransactions(
      parseInt(page),
      parseInt(limit),
      status,
      type
    );
  }

  @Get('transactions/:id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiResponse({ status: 200, description: 'Transaction retrieved successfully' })
  async getTransactionById(@Param('id') id: string) {
    return this.transactionService.findById(id);
  }

  @Post('fx/rates/update')
  @ApiOperation({ summary: 'Manually update FX rates' })
  @ApiResponse({ status: 200, description: 'FX rates updated successfully' })
  async updateFxRates() {
    return this.fxService.updateRates();
  }

  @Get('system/health')
  @ApiOperation({ summary: 'Get system health' })
  @ApiResponse({ status: 200, description: 'System health retrieved successfully' })
  async getSystemHealth() {
    const [
      totalUsers,
      totalTransactions,
      totalVolume,
      activeUsers,
      systemUptime
    ] = await Promise.all([
      this.userService.count(),
      this.transactionService.count(),
      this.transactionService.getTotalVolume(),
      this.userService.getActiveUsersCount(),
      Promise.resolve(process.uptime())
    ]);

    return {
      totalUsers,
      totalTransactions,
      totalVolume,
      activeUsers,
      systemUptime: `${Math.floor(systemUptime / 3600)}h ${Math.floor((systemUptime % 3600) / 60)}m`,
      timestamp: new Date().toISOString()
    };
  }
}
