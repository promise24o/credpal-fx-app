import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserService } from '../modules/auth/services/user.service';
import { WalletService } from '../modules/wallet/services/wallet.service';
import { Role } from '../common/enums/role.enum';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const userService = app.get(UserService);
  const walletService = app.get(WalletService);

  try {
    // Check if admin user already exists
    const existingAdmin = await userService.findByEmail('admin@admin.com');
    if (existingAdmin) {
      console.log('Admin user already exists');
      await app.close();
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin', 10);
    
    const adminUser = await userService.create({
      email: 'admin@admin.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: Role.ADMIN,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    });

    console.log('Admin user created successfully:', adminUser.email);

    // Create default wallets for admin
    await walletService.createDefaultWallets(adminUser.id);
    console.log('Default wallets created for admin user');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
