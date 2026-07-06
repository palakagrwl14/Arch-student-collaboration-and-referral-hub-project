-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE users (
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- 2. PROJECTS TABLE
CREATE TABLE projects (
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

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);

-- 3. TEAM MEMBERS TABLE
CREATE TABLE team_members (
  id VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(100),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, user_id)
);

CREATE INDEX idx_team_members_project ON team_members(project_id);

-- 4. TEAM APPLICATIONS TABLE
CREATE TABLE team_applications (
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

CREATE INDEX idx_team_apps_project ON team_applications(project_id);

-- 5. WORKSPACE TASKS TABLE
CREATE TABLE workspace_tasks (
  id VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'review', 'done')),
  priority VARCHAR(50) DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. WORKSPACE NOTES TABLE
CREATE TABLE workspace_notes (
  id VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content TEXT,
  created_by VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. MILESTONES TABLE
CREATE TABLE milestones (
  id VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  due_date VARCHAR(100),
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. PORTFOLIO ENTRIES TABLE
CREATE TABLE portfolio_entries (
  id VARCHAR(255) PRIMARY KEY,
  student_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role_played VARCHAR(100),
  contribution_notes TEXT,
  skills_used JSONB DEFAULT '[]'::jsonb,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  verified BOOLEAN DEFAULT TRUE,
  UNIQUE(student_id, project_id)
);

-- 9. REFERRALS TABLE
CREATE TABLE referrals (
  id VARCHAR(255) PRIMARY KEY,
  company VARCHAR(255) NOT NULL,
  company_logo VARCHAR(500),
  job_role VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK(type IN ('internship', 'fulltime')),
  location VARCHAR(255),
  work_mode VARCHAR(50) DEFAULT 'onsite' CHECK(work_mode IN ('onsite', 'remote', 'hybrid')),
  salary VARCHAR(255),
  skills_required JSONB DEFAULT '[]'::jsonb,
  eligibility_cgpa NUMERIC(3,1),
  eligibility_branches JSONB DEFAULT '[]'::jsonb,
  eligibility_batch_years JSONB DEFAULT '[]'::jsonb,
  eligibility_text TEXT,
  description TEXT,
  responsibilities TEXT,
  last_date DATE,
  slots_total INTEGER DEFAULT 1,
  slots_remaining INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'active' CHECK(status IN ('active', 'slots_full', 'expired', 'closed')),
  posted_by VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_referrals_posted_by ON referrals(posted_by);

-- 10. REFERRAL APPLICATIONS TABLE
CREATE TABLE referral_applications (
  id VARCHAR(255) PRIMARY KEY,
  referral_id VARCHAR(255) NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  student_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resume_path VARCHAR(500),
  github_url VARCHAR(500),
  linkedin_url VARCHAR(500),
  portfolio_url VARCHAR(500),
  intro_text VARCHAR(1000),
  status VARCHAR(50) DEFAULT 'applied' CHECK(status IN (
    'applied', 'under_review', 'shortlisted', 'referral_submitted', 
    'interview_scheduled', 'selected', 'rejected', 'withdrawn'
  )),
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(referral_id, student_id)
);

CREATE INDEX idx_referral_apps_student ON referral_applications(student_id);
CREATE INDEX idx_referral_apps_referral ON referral_applications(referral_id);

-- 11. RATINGS TABLE
CREATE TABLE ratings (
  id VARCHAR(255) PRIMARY KEY,
  referral_id VARCHAR(255) NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  student_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alumni_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER CHECK(score >= 1 AND score <= 5),
  review TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(referral_id, student_id)
);

-- 12. REPORTS TABLE
CREATE TABLE reports (
  id VARCHAR(255) PRIMARY KEY,
  referral_id VARCHAR(255) NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  reported_by VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. NOTIFICATIONS TABLE
CREATE TABLE notifications (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  link VARCHAR(255),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);

-- 14. AUDIT LOG TABLE
CREATE TABLE audit_log (
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

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);