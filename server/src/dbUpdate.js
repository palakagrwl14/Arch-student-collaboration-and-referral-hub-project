import pool from './config/database.js';

async function updateSchema() {
  try {
    console.log('Connecting to PostgreSQL database...');
    // We add IF NOT EXISTS checks or run it directly. In PostgreSQL, ADD COLUMN does not support IF NOT EXISTS directly in some older versions,
    // but in PG 9.6+ it does! So we can use ADD COLUMN IF NOT EXISTS safely since modern postgres versions support it.
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_otp VARCHAR(6);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMP WITH TIME ZONE;
    `);
    console.log('PostgreSQL database schema updated with OTP columns successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to update database schema:', error);
    process.exit(1);
  }
}

updateSchema();
