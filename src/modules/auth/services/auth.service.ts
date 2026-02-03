import { Injectable, ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { User, UserStatus } from '../entities/user.entity';
import { RegisterDto } from '../dto/register.dto';
import { VerifyOtpDto } from '../dto/verify-otp.dto';
import { LoginDto } from '../dto/login.dto';
import { EmailService } from './email.service';
import { WalletService } from '../../wallet/services/wallet.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private emailService: EmailService,
    private walletService: WalletService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const otp = this.generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = this.userRepository.create({
      ...registerDto,
      password: hashedPassword,
      otp,
      otpExpires,
    });

    await this.userRepository.save(user);

    try {
      await this.emailService.sendOtpEmail(user.email, otp);
    } catch (error) {
      console.error('Failed to send OTP email:', error);
    }

    return {
      message: 'Registration successful. Please check your email for OTP.',
      userId: user.id,
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const user = await this.userRepository.findOne({
      where: { email: verifyOtpDto.email },
    });

    if (!user) {
      throw new BadRequestException('Invalid email or OTP');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    if (user.otp !== verifyOtpDto.otp) {
      throw new BadRequestException('Invalid OTP');
    }

    if (user.otpExpires < new Date()) {
      throw new BadRequestException('OTP has expired');
    }

    await this.userRepository.manager.transaction(async (transactionalEntityManager) => {
      user.isEmailVerified = true;
      user.status = UserStatus.ACTIVE;
      user.emailVerifiedAt = new Date();
      user.otp = null;
      user.otpExpires = null;

      await transactionalEntityManager.save(user);

      await this.walletService.createDefaultWallets(user.id, transactionalEntityManager);
    });

    const token = this.generateToken(user);

    return {
      message: 'Email verified successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
      select: ['id', 'email', 'password', 'isEmailVerified', 'status', 'role', 'firstName', 'lastName'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        role: user.role,
      },
    };
  }

  async resendOtp(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new BadRequestException('Email not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    const otp = this.generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = otp;
    user.otpExpires = otpExpires;

    await this.userRepository.save(user);

    try {
      await this.emailService.sendOtpEmail(user.email, otp);
    } catch (error) {
      console.error('Failed to send OTP email:', error);
    }

    return { message: 'OTP sent successfully' };
  }

  async verifyEmailConnection(): Promise<boolean> {
    return this.emailService.verifyConnection();
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }
}
