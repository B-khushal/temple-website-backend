import nodemailer from 'nodemailer';
import logger from '../config/logger';

const EMAIL_HOST = process.env.EMAIL_HOST;
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587');
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: any }> {
  logger.info(`Sending email to: ${options.to} | Subject: "${options.subject}"`);

  if (!EMAIL_USER || !EMAIL_PASSWORD) {
    logger.warn('ℹ️ Email credentials are not configured in environment variables. Email content printed below:');
    logger.warn('------------------ EMAIL BODY START ------------------');
    logger.warn(options.text);
    logger.warn('------------------ EMAIL BODY END --------------------');
    return { success: true, messageId: 'Console-logged-fallback-id' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST || 'smtp.gmail.com',
      port: EMAIL_PORT,
      secure: EMAIL_PORT === 465, // True for 465, false for other ports
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: `"Sri Durga Mata Temple" <${EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    logger.info(`✅ Email sent successfully: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    logger.error(`❌ Failed to send email: ${error.message}`);
    return { success: false, error };
  }
}
