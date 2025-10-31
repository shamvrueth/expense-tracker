import dotenv from 'dotenv';
dotenv.config();
import nodemailer from 'nodemailer';

export async function sendOtpEmail(email, otp) {
  try {
    // Log environment variables (without showing full password)
    console.log('Email Sender:', process.env.EMAIL_SENDER);
    console.log('Email Password length:', process.env.EMAIL_PASSWORD?.length || 0);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_SENDER,
        pass: process.env.EMAIL_PASSWORD,
      },
      debug: true // Enable debug logs
    });

    // Verify transporter configuration
    try {
      await transporter.verify();
      console.log('✅ Email configuration verified successfully');
    } catch (verifyError) {
      console.error('❌ Email configuration verification failed:', verifyError);
      throw new Error('Email configuration invalid: ' + verifyError.message);
    }

    const mailOptions = {
      from: `"Expense Tracker" <${process.env.EMAIL_SENDER}>`,
      to: email,
      subject: 'Your OTP for registration',
      html: `<p>Your OTP for registration is <strong>${otp}</strong>. It will expire in 10 minutes.</p>`,
    };

    console.log('Attempting to send email to:', email);
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Email send error:', error);
    console.error('Error details:', {
      code: error.code,
      command: error.command,
      response: error.response
    });
    throw error;
  }
}
