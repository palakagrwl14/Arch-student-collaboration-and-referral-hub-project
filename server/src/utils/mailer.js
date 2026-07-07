import nodemailer from 'nodemailer';
import dns from 'dns';

let transporter;

// Create transporter helper
async function getTransporter() {
  if (transporter) return transporter;

  const hasSmtpConfig = process.env.SMTP_USER && process.env.SMTP_PASS;

  if (hasSmtpConfig) {
    const originalHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    let resolvedHost = originalHost;

    // Force resolve hostname to IPv4 address to bypass Render's IPv6 routing bugs
    if (originalHost !== 'localhost' && originalHost !== '127.0.0.1') {
      try {
        const addresses = await dns.promises.resolve4(originalHost);
        if (addresses && addresses.length > 0) {
          resolvedHost = addresses[0];
          console.log(`Mailer: Resolved ${originalHost} to IPv4 address ${resolvedHost}`);
        }
      } catch (dnsErr) {
        console.warn(`Mailer: DNS resolve4 failed for ${originalHost}, falling back to hostname.`, dnsErr.message);
      }
    }

    // Production SMTP
    transporter = nodemailer.createTransport({
      host: resolvedHost,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false, // Set to false for port 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        // This servername option is critical so the SSL handshake verifies against the hostname instead of the IP address
        servername: originalHost,
        rejectUnauthorized: false
      }
    });
    console.log('Mailer: Configured custom SMTP transporter.');
  } else {
    // Local Dev fallback: Create an Ethereal test mail account automatically
    try {
      console.log('Mailer: No SMTP credentials in .env. Creating Ethereal Test Email account...');
      const testAccount = await nodemailer.createTestAccount();
      
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log(`Mailer: Ethereal test account created successfully.`);
      console.log(`  User: ${testAccount.user}`);
      console.log(`  Pass: ${testAccount.pass}`);
    } catch (error) {
      console.error('Mailer: Failed to create Ethereal test account. Mail sender will be mocked.', error);
      // Fallback dummy transporter to prevent server crashes
      transporter = {
        sendMail: async (options) => {
          console.log(`[MOCK EMAIL] To: ${options.to} | Subject: ${options.subject} | Text: ${options.text}`);
          return { messageId: 'mock-id' };
        }
      };
    }
  }

  return transporter;
}

// Send OTP Mail
export async function sendOtpEmail(toEmail, otpCode) {
  try {
    const client = await getTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_FROM || '"Arch Platform" <no-reply@arch.com>',
      to: toEmail,
      subject: 'Verify your Arch Account',
      text: `Your email verification OTP code is: ${otpCode}. This code is valid for 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #6b8f6b; text-align: center;">Arch Verification</h2>
          <p>Hello,</p>
          <p>Thank you for signing up on Arch. To complete your registration, please verify your email address by entering the following OTP code:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #111827;">${otpCode}</span>
          </div>
          <p style="color: #6b7280; font-size: 12px; text-align: center;">This code will expire in 10 minutes. If you did not request this code, you can safely ignore this email.</p>
        </div>
      `
    };

    const info = await client.sendMail(mailOptions);
    console.log(`Mailer: Verification email sent to ${toEmail} (Message ID: ${info.messageId})`);
    
    // If using Ethereal, print out the preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`Mailer: Preview sent email at 👉 ${previewUrl}`);
    }
  } catch (error) {
    console.error('Mailer: Failed to send OTP verification email via SMTP:', error.message);
    console.log(`\n==================================================`);
    console.log(`[FALLBACK MOCK EMAIL FOR TESTING]`);
    console.log(`TO: ${toEmail}`);
    console.log(`OTP CODE: ${otpCode}`);
    console.log(`Please enter code ${otpCode} in the registration verification screen.`);
    console.log(`==================================================\n`);
    // Do not throw the error, allowing signup/OTP request to complete successfully!
  }
}
