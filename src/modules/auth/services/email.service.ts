import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: parseInt(this.configService.get<string>('MAIL_PORT')),
      secure: false,
      auth: {
        user: this.configService.get<string>('MAIL_USERNAME'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
    });
  }

  async sendOtpEmail(email: string, otp: string): Promise<void> {
    try {
      const mailOptions = {
        from: `"${this.configService.get<string>('MAIL_FROM_NAME')}" <${this.configService.get<string>('MAIL_FROM_ADDRESS')}>`,
        to: email,
        subject: 'Your Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Email Verification</h2>
            <p>Thank you for registering. Please use the verification code below to complete your registration:</p>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 3px;">${otp}</h1>
            </div>
            <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`OTP email sent successfully to ${email}`);
    } catch (error) {
      // Log detailed error information
      console.error('Error sending OTP email:', {
        error: error.message,
        code: error.code,
        response: error.response,
        email: email
      });
      
      // Don't block user registration - allow manual OTP entry
      console.warn('Email service unavailable, user can proceed with manual OTP entry');
      // Note: We don't throw error to prevent blocking user flow
    }
  }

  async verifyEmailConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('Brevo SMTP connection verified successfully');
      return true;
    } catch (error) {
      console.error('Brevo SMTP connection failed:', {
        error: error.message,
        code: error.code,
        response: error.response
      });
      return false;
    }
  }
}
