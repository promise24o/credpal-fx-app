import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminOperationsService } from '../services/admin-operations.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminOperationsService: AdminOperationsService) {}

  @Get('users')
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getAllUsers(@Query('page') page: string = '1', @Query('limit') limit: string = '10') {
    return this.adminOperationsService.getAllUsers();
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  async getUserById(@Param('id') id: string) {
    return this.adminOperationsService.getUserById(id);
  }

  @Put('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend user' })
  @ApiResponse({ status: 200, description: 'User suspended successfully' })
  async suspendUser(@Param('id') id: string) {
    return this.adminOperationsService.suspendUser(id);
  }

  @Put('users/:id/activate')
  @ApiOperation({ summary: 'Activate user' })
  @ApiResponse({ status: 200, description: 'User activated successfully' })
  async activateUser(@Param('id') id: string) {
    return this.adminOperationsService.activateUser(id);
  }

  @Get('users/:id/wallets')
  @ApiOperation({ summary: 'Get user wallets' })
  @ApiResponse({ status: 200, description: 'User wallets retrieved successfully' })
  async getUserWallets(@Param('id') id: string) {
    return this.adminOperationsService.getUserWallets(id);
  }

  @Post('users/:id/fund')
  @ApiOperation({ summary: 'Fund user wallet (Admin)' })
  @ApiResponse({ status: 200, description: 'Wallet funded successfully' })
  async fundUserWallet(
    @Param('id') id: string,
    @Body() body: { currency: string; amount: number }
  ) {
    return this.adminOperationsService.adminFundWallet(id, body.currency, body.amount);
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
    return this.adminOperationsService.getAllTransactions();
  }

  @Get('transactions/:id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiResponse({ status: 200, description: 'Transaction retrieved successfully' })
  async getTransactionById(@Param('id') id: string) {
    return this.adminOperationsService.getTransactionById(id);
  }

  @Post('fx/rates/update')
  @ApiOperation({ summary: 'Manually update FX rates' })
  @ApiResponse({ status: 200, description: 'FX rates updated successfully' })
  async updateFxRates() {
    return this.adminOperationsService.updateFxRates();
  }

  @Get('system/health')
  @ApiOperation({ summary: 'Get system health' })
  @ApiResponse({ status: 200, description: 'System health retrieved successfully' })
  async getSystemHealth() {
    return this.adminOperationsService.getSystemHealth();
  }
}
