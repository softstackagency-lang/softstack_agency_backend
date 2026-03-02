import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

const emailTemplate = (content: string) => `
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
    <div class="container">${content}</div>
  </body>
  </html>
`

export async function sendPasswordResetEmail(to: string, resetLink: string, userName?: string) {
  const content = `
    <div class="header"><h1>Password Reset Request</h1></div>
    <div class="content">
      <p>Hello ${userName || 'there'},</p>
      <p>Click the button below to reset your password:</p>
      <div style="text-align: center;">
        <a href="${resetLink}" class="button">Reset Password</a>
      </div>
      <p style="word-break: break-all; color: #4CAF50;">${resetLink}</p>
      <p><strong>Link expires in 1 hour.</strong></p>
    </div>
  `

  await transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME || 'App'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    to,
    subject: 'Password Reset Request',
    html: emailTemplate(content),
  })
}

export async function sendPasswordResetConfirmationEmail(to: string, userName?: string) {
  const content = `
    <div class="header"><h1>✓ Password Reset Successful</h1></div>
    <div class="content">
      <p>Hello ${userName || 'there'},</p>
      <p>Your password has been successfully reset.</p>
    </div>
  `

  await transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME || 'App'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    to,
    subject: 'Password Successfully Reset',
    html: emailTemplate(content),
  })
}
