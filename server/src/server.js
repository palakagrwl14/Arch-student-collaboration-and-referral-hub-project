import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './config/database.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import projectRoutes from './routes/projects.js';
import teamApplicationRoutes from './routes/teamApplications.js';
import workspaceRoutes from './routes/workspace.js';
import portfolioRoutes from './routes/portfolio.js';
import referralRoutes from './routes/referrals.js';
import referralApplicationRoutes from './routes/referralApplications.js';
import ratingRoutes from './routes/ratings.js';
import reportRoutes from './routes/reports.js';
import adminRoutes from './routes/admin.js';
import notificationRoutes from './routes/notifications.js';
import { generalLimiter } from './middleware/rateLimit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'https://arch-student-collaboration-and-refe-seven.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    const isVercel = origin.endsWith('.vercel.app') && origin.includes('arch');
    const isAllowed = allowedOrigins.includes(origin) || isVercel;
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(null, new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(generalLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/team-applications', teamApplicationRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/referral-applications', referralApplicationRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ success: true, message: 'Arch API is running' }));

// Auto-close scheduler
async function runScheduledJobs() {
  try {
    const now = new Date().toISOString().split('T')[0];
    
    // Close expired referrals
    const expiredRes = await pool.query(`
      UPDATE referrals 
      SET status = 'expired', updated_at = CURRENT_TIMESTAMP 
      WHERE status = 'active' AND last_date < $1
    `, [now]);
    if (expiredRes.rowCount > 0) {
      console.log(`Scheduler: Closed ${expiredRes.rowCount} expired referrals.`);
    }

    // Close slots-full referrals
    const fullRes = await pool.query(`
      UPDATE referrals 
      SET status = 'slots_full', updated_at = CURRENT_TIMESTAMP 
      WHERE status = 'active' AND slots_remaining <= 0
    `);
    if (fullRes.rowCount > 0) {
      console.log(`Scheduler: Marked ${fullRes.rowCount} full referrals as slots_full.`);
    }

    // Mark inactive projects as abandoned (30 days no update)
    const abandonedRes = await pool.query(`
      UPDATE projects 
      SET status = 'abandoned', updated_at = CURRENT_TIMESTAMP 
      WHERE status IN ('open','forming') AND updated_at < NOW() - INTERVAL '30 days'
    `);
    if (abandonedRes.rowCount > 0) {
      console.log(`Scheduler: Marked ${abandonedRes.rowCount} inactive projects as abandoned.`);
    }
  } catch (err) {
    console.error('Scheduler error:', err);
  }
}

// Run scheduler every 60 seconds
setInterval(runScheduledJobs, 60000);
runScheduledJobs();

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n  ╔═══════════════════════════════════════╗`);
  console.log(`  ║     🎓 Arch API Server                ║`);
  console.log(`  ║     Running on port ${PORT}             ║`);
  console.log(`  ╚═══════════════════════════════════════╝\n`);
});
export default app;
