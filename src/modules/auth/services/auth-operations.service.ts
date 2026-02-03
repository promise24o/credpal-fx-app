import { Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { VerifyOtpDto } from '../dto/verify-otp.dto';

@Injectable()
export class AuthOperationsService {
  constructor(
    private authService: AuthService,
    private userService: UserService,
  ) {}

  async register(registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  async login(loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  async resendOtp(email: string) {
    return this.authService.resendOtp(email);
  }

  async getProfile(userId: string) {
    return this.userService.findById(userId);
  }

  async verifyEmailConnection() {
    return this.authService.verifyEmailConnection();
  }
}
