import 'dotenv/config';
import nodemailer from 'nodemailer';

console.log('\n=========================================');
console.log('       GMAIL SMTP DIAGNOSTIC TEST        ');
console.log('=========================================');
console.log('SMTP_HOST:', process.env.SMTP_HOST || 'smtp.gmail.com');
console.log('SMTP_PORT:', process.env.SMTP_PORT || '465');
console.log('SMTP_USER:', process.env.SMTP_USER || 'NOT DEFINED');
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '******** (Loaded)' : 'NOT DEFINED');
console.log('SMTP_FROM:', process.env.SMTP_FROM || 'NOT DEFINED');
console.log('-----------------------------------------');

if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.error('❌ ERROR: SMTP_USER or SMTP_PASS is missing in your .env file!');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: process.env.SMTP_PORT === '465' || !process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function runDiagnostic() {
  try {
    console.log('1. Connecting to Gmail SMTP server...');
    await transporter.verify();
    console.log('✅ Connection verified successfully! credentials are correct.');

    console.log('2. Attempting to send test email to yourself...');
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.SMTP_USER,
      subject: 'CampusCollab SMTP Test Connection',
      text: 'Congratulations! Your Gmail SMTP configuration is fully working.',
      html: '<h3>CampusCollab Connection Test</h3><p>If you see this email, Gmail SMTP is successfully connected and working!</p>'
    });
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('=========================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ SMTP DIAGNOSTIC FAILED!');
    console.error('Error details:', error);
    console.log('=========================================\n');
    process.exit(1);
  }
}

runDiagnostic();
