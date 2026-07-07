import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const { Pool } = pg;

// Connection string sourced from environment variables (Neon/Render/AWS or local PG)
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Palak14@localhost:5432/CampusCollab';

const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

// Database schema auto-initialization function
const initializeDatabase = async () => {
  try {
    const res = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    const tablesExist = res.rows[0].exists;
    if (!tablesExist) {
      console.log('Database tables not found. Initializing PostgreSQL schema...');
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL CHECK(role IN ('student', 'alumni', 'admin')) DEFAULT 'student',
          name VARCHAR(255) NOT NULL,
          avatar_url VARCHAR(500),
          bio TEXT,
          college VARCHAR(255),
          skills JSONB DEFAULT '[]'::jsonb,
          interests JSONB DEFAULT '[]'::jsonb,
          company VARCHAR(255),
          designation VARCHAR(255),
          graduation_year INTEGER,
          linkedin_url VARCHAR(500),
          github_url VARCHAR(500),
          verification_status VARCHAR(50) DEFAULT 'unverified' CHECK(verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
          verification_proof VARCHAR(500),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          is_email_verified BOOLEAN DEFAULT FALSE,
          email_otp VARCHAR(6),
          otp_expiry TIMESTAMP WITH TIME ZONE,
          settings JSONB DEFAULT '{}'::jsonb
        );

        CREATE TABLE IF NOT EXISTS projects (
          id VARCHAR(255) PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          skills_required JSONB DEFAULT '[]'::jsonb,
          open_roles JSONB DEFAULT '[]'::jsonb,
          team_size INTEGER DEFAULT 4,
          status VARCHAR(50) DEFAULT 'open' CHECK(status IN ('open', 'forming', 'active', 'completed', 'abandoned')),
          created_by VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS team_members (
          id VARCHAR(255) PRIMARY KEY,
          project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role VARCHAR(100),
          joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(project_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS team_applications (
          id VARCHAR(255) PRIMARY KEY,
          project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          student_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role_applied VARCHAR(100),
          pitch TEXT,
          portfolio_link VARCHAR(500),
          status VARCHAR(50) DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(project_id, student_id)
        );

        CREATE TABLE IF NOT EXISTS workspace_tasks (
          id VARCHAR(255) PRIMARY KEY,
          project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          assigned_to VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
          status VARCHAR(50) DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'review', 'done')),
          priority VARCHAR(50) DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS workspace_notes (
          id VARCHAR(255) PRIMARY KEY,
          project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          content TEXT,
          created_by VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS milestones (
          id VARCHAR(255) PRIMARY KEY,
          project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          due_date TIMESTAMP WITH TIME ZONE,
          completed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS portfolio_entries (
          id VARCHAR(255) PRIMARY KEY,
          student_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          project_id VARCHAR(255) REFERENCES projects(id) ON DELETE SET NULL,
          role_played VARCHAR(100) NOT NULL,
          contribution_notes TEXT,
          skills_used JSONB DEFAULT '[]'::jsonb,
          completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          verified BOOLEAN DEFAULT TRUE
        );

        CREATE TABLE IF NOT EXISTS referrals (
          id VARCHAR(255) PRIMARY KEY,
          company VARCHAR(255) NOT NULL,
          company_logo VARCHAR(500),
          job_role VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL CHECK(type IN ('internship', 'fulltime')),
          location VARCHAR(255),
          work_mode VARCHAR(50) DEFAULT 'onsite' CHECK(work_mode IN ('onsite', 'remote', 'hybrid')),
          salary VARCHAR(100),
          skills_required JSONB DEFAULT '[]'::jsonb,
          eligibility_cgpa REAL,
          eligibility_branches JSONB DEFAULT '[]'::jsonb,
          eligibility_batch_years JSONB DEFAULT '[]'::jsonb,
          eligibility_text TEXT,
          description TEXT,
          responsibilities TEXT,
          last_date DATE,
          slots_total INTEGER DEFAULT 1,
          slots_remaining INTEGER DEFAULT 1,
          status VARCHAR(50) DEFAULT 'active' CHECK(status IN ('active', 'closed')),
          posted_by VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS referral_applications (
          id VARCHAR(255) PRIMARY KEY,
          referral_id VARCHAR(255) NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
          student_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          resume_path VARCHAR(500) NOT NULL,
          github_url VARCHAR(500),
          linkedin_url VARCHAR(500),
          portfolio_url VARCHAR(500),
          intro_text TEXT,
          status VARCHAR(50) DEFAULT 'applied' CHECK(status IN ('applied', 'review', 'referred', 'rejected', 'withdrawn')),
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(referral_id, student_id)
        );

        CREATE TABLE IF NOT EXISTS ratings (
          id VARCHAR(255) PRIMARY KEY,
          referral_id VARCHAR(255) NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
          student_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          alumni_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
          submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(referral_id, student_id)
        );

        CREATE TABLE IF NOT EXISTS reports (
          id VARCHAR(255) PRIMARY KEY,
          referral_id VARCHAR(255) NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
          reported_by VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          reason TEXT NOT NULL,
          status VARCHAR(50) DEFAULT 'pending' CHECK(status IN ('pending', 'resolved', 'dismissed')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS notifications (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          link VARCHAR(255),
          read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS audit_log (
          id VARCHAR(255) PRIMARY KEY,
          entity_type VARCHAR(100) NOT NULL,
          entity_id VARCHAR(255) NOT NULL,
          action VARCHAR(255) NOT NULL,
          old_status VARCHAR(100),
          new_status VARCHAR(100),
          performed_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Database tables successfully initialized.');
    } else {
      console.log('Database tables exist. Skipping table initialization.');
    }

    // Always ensure the default System Admin account exists
    const adminRes = await pool.query("SELECT id FROM users WHERE email = 'admin@arch.com'");
    if (adminRes.rows.length === 0) {
      console.log('System Admin account not found. Creating default admin...');
      const adminId = uuidv4();
      const adminPasswordHash = bcrypt.hashSync('password123', 12);
      await pool.query(`
        INSERT INTO users (id, email, password_hash, role, name, college, skills, interests, verification_status, is_email_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
      `, [
        adminId,
        'admin@arch.com',
        adminPasswordHash,
        'admin',
        'System Admin',
        'Arch HQ',
        '[]',
        '[]',
        'verified'
      ]);
      console.log('Default System Admin created.');
    }
  } catch (err) {
    console.error('Error initializing database tables/admin account:', err);
  }
};

// Verify Connection
pool.connect(async (err, client, release) => {
  if (err) {
    return console.error('Error connecting to PostgreSQL database:', err.stack);
  }
  console.log('Successfully connected to PostgreSQL Database.');
  release();

  // Run schema auto-init (Skip if running the seed script to prevent race conditions!)
  const isSeeding = process.argv[1] && (process.argv[1].endsWith('seed.js') || process.argv[1].endsWith('seed'));
  if (!isSeeding) {
    await initializeDatabase();
  } else {
    console.log('Database auto-init bypassed during database seeding.');
  }
});

export default pool;