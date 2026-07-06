import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import pool from './config/database.js';

async function seed() {
  console.log('Clearing and initializing Arch database...');
  const passwordHash = bcrypt.hashSync('password123', 12);

  try {
    // Truncate all tables recursively
    console.log('Truncating existing tables...');
    await pool.query(`
      TRUNCATE TABLE 
        audit_log, 
        notifications, 
        reports, 
        ratings, 
        referral_applications, 
        referrals, 
        portfolio_entries, 
        milestones, 
        workspace_notes, 
        workspace_tasks, 
        team_applications, 
        team_members, 
        projects, 
        users 
      CASCADE;
    `);

    console.log('All tables truncated successfully.');

    // Create default System Admin
    const adminId = uuidv4();
    await pool.query(`
      INSERT INTO users (id, email, password_hash, role, name, college, skills, interests, verification_status, is_email_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
    `, [
      adminId,
      'admin@arch.com',
      passwordHash,
      'admin',
      'System Admin',
      'Arch HQ',
      '[]',
      '[]',
      'verified'
    ]);

    console.log('System Admin account created successfully:');
    console.log('  Email: admin@arch.com');
    console.log('  Password: password123');
    console.log('\nDatabase is now completely clean and ready for registration!');

  } catch (error) {
    console.error('Seeding database error:', error);
  } finally {
    process.exit(0);
  }
}

seed();
