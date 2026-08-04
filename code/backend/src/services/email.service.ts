import nodemailer from 'nodemailer';
import { env } from '../config/env';

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  private static async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) return this.transporter;

    // Use environment SMTP credentials if provided
    if (env.SMTP_USER && env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    } else {
      // Auto-generate free Ethereal test account for dev mode
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`✉️ [EMAIL SYSTEM] Initialized Dev Test Account (${testAccount.user})`);
    }

    return this.transporter;
  }

  // 1. Send Teacher Invitation Email
  static async sendTeacherInvitation(toEmail: string, invitationToken: string) {
    const inviteUrl = `${env.FRONTEND_URL}/redeem-invite?token=${invitationToken}`;

    try {
      const transporter = await this.getTransporter();
      const info = await transporter.sendMail({
        from: env.EMAIL_FROM,
        to: toEmail,
        subject: 'You have been invited to join as a Teacher',
        html: `
          <h2>Welcome to the Online Exam Platform</h2>
          <p>You have been invited by the System Owner to set up your Teacher account.</p>
          <p><a href="${inviteUrl}" style="padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 4px;">Activate Account</a></p>
          <p>Or copy this link: ${inviteUrl}</p>
        `,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`✉️ [EMAIL SENT] Teacher Invitation Preview URL: ${previewUrl}`);
      }
    } catch (error) {
      console.error('❌ Failed to send teacher invitation email:', error);
    }
  }

  // 2. Send Password Reset Email
  static async sendPasswordReset(toEmail: string, resetToken: string) {
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    try {
      const transporter = await this.getTransporter();
      const info = await transporter.sendMail({
        from: env.EMAIL_FROM,
        to: toEmail,
        subject: 'Reset Your Password - Exam Platform',
        html: `
          <h2>Password Reset Request</h2>
          <p>You requested a password reset. Click the link below to set a new password:</p>
          <p><a href="${resetUrl}" style="padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 4px;">Reset Password</a></p>
          <p>Or copy this link: ${resetUrl}</p>
        `,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`✉️ [EMAIL SENT] Password Reset Preview URL: ${previewUrl}`);
      }
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
    }
  }
}