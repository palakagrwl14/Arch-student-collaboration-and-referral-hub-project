import pool from './config/database.js';

async function updateSettingsSchema() {
  try {
    console.log('Connecting to PostgreSQL database for settings schema migration...');
    
    // Add columns: is_active, default_resume_path, and settings
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS default_resume_path VARCHAR(500);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{
        "privacy": {
          "profile_visibility": "public",
          "portfolio_visible": true,
          "show_skills": true
        },
        "student_preferences": {
          "job_type": "both",
          "locations": [],
          "work_mode": "both",
          "skills_auto_filter": false
        },
        "alumni_defaults": {
          "default_slots": 1,
          "default_deadline_days": 30,
          "auto_close": true
        },
        "app_preferences": {
          "theme": "dark",
          "default_tab": "collaboration"
        }
      }'::jsonb;
    `);

    console.log('PostgreSQL users table updated with settings, is_active, and default_resume_path columns.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to migrate database settings schema:', error);
    process.exit(1);
  }
}

updateSettingsSchema();
