import nodemailer from 'nodemailer'

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
  userName?: string
) {
  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'Your App'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    to,
    subject: 'Password Reset Request',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; padding: 12px 30px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello ${userName || 'there'},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #4CAF50;">${resetLink}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
            <p>Thanks,<br>The Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log('Password reset email sent: %s', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Error sending password reset email:', error)
    throw error
  }
}

/**
 * Send password reset confirmation email
 */
export async function sendPasswordResetConfirmationEmail(
  to: string,
  userName?: string
) {
  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'Your App'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    to,
    subject: 'Password Successfully Reset',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✓ Password Reset Successful</h1>
          </div>
          <div class="content">
            <p>Hello ${userName || 'there'},</p>
            <p>Your password has been successfully reset.</p>
            <p>You can now log in with your new password.</p>
            <p>If you did not make this change or believe an unauthorized person has accessed your account, please contact support immediately.</p>
            <p>Thanks,<br>The Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log('Password reset confirmation email sent: %s', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Error sending confirmation email:', error)
    throw error
  }
}
