import express from 'express';
import pool from '../config/database.js';
import auth from '../middleware/auth.js';
import { formatResponse } from '../utils/helpers.js';

const router = express.Router();

// GET all notifications (generates demo notifications on the fly if empty)
router.get('/', auth, async (req, res) => {
  try {
    let listResult = await pool.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [req.user.id]);
    
    if (listResult.rows.length === 0) {
      const userId = req.user.id;
      const now = new Date();
      
      console.log(`Generating demo notifications for user ${userId} (${req.user.role})...`);
      
      if (req.user.role === 'student') {
        await pool.query(`
          INSERT INTO notifications (id, user_id, type, title, message, link, read, created_at)
          VALUES 
            ($1, $2, 'application_update', 'Referral Application Shortlisted', 'Your referral application for Software Engineer at Microsoft has been shortlisted! Prepare for the technical interview.', '/my-applications', false, $3),
            ($4, $2, 'team_update', 'Teammate Request Accepted', 'Aarav Sharma accepted your request to join the ''AI Study Buddy'' project team.', '/my-teams', false, $5),
            ($6, $2, 'referral_match', 'New Referral Matching Skills', 'Google posted a new Full-Time Software Engineer position matching your ''React'' and ''Node.js'' skills.', '/referrals', false, $7),
            ($8, $2, 'deadline_alert', 'Referral Closing Soon', 'The Front-End Developer referral position at Meta closes in less than 48 hours. Apply now!', '/referrals', false, $9),
            ($10, $2, 'workspace_activity', 'New Workspace Task Assigned', 'Vikram Malhotra assigned you a new task: ''Design UI layout mockup'' in the campus events project workspace.', '/workspace', false, $11),
            ($12, $2, 'portfolio_update', 'Project Contribution Completed', 'Your project contribution for ''Campus Events App'' was verified and marked complete.', '/portfolio', false, $13)
        `, [
          'demo-1', userId, new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
          'demo-2', new Date(now.getTime() - 5 * 60 * 60 * 1000), // 5 hours ago
          'demo-3', new Date(now.getTime() - 20 * 60 * 60 * 1000), // 20 hours ago
          'demo-4', new Date(now.getTime() - 28 * 60 * 60 * 1000), // Yesterday
          'demo-5', new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          'demo-6', new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
        ]);
      } else {
        await pool.query(`
          INSERT INTO notifications (id, user_id, type, title, message, link, read, created_at)
          VALUES 
            ($1, $2, 'verification_status', 'Verification Approved', 'Admin approved your employment verification proof. You now have the verified badge!', '/settings', false, $3),
            ($4, $2, 'applicant_alert', 'New Referral Application', 'A student applied to your referral posting for Software Engineer at Google. Click to review their resume.', '/my-referrals', false, $5),
            ($6, $2, 'deadline_alert', 'Referral Closing Soon', 'Your referral posting for Frontend Developer at Amazon closes in less than 48 hours.', '/my-referrals', false, $7),
            ($8, $2, 'workspace_activity', 'New Note in Team Workspace', 'A student added a new research brief to the ''Arch'' workspace.', '/workspace', false, $9)
        `, [
          'demo-7', userId, new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
          'demo-8', new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
          'demo-9', new Date(now.getTime() - 18 * 60 * 60 * 1000), // 18 hours ago
          'demo-10', new Date(now.getTime() - 30 * 60 * 60 * 1000) // Yesterday
        ]);
      }
      
      // Query again to get the inserted records
      listResult = await pool.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [req.user.id]);
    }
    
    res.json(formatResponse(true, listResult.rows));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json(formatResponse(false, null, 'Error fetching notifications'));
  }
});

// GET unread count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const countResult = await pool.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false', [req.user.id]);
    const count = parseInt(countResult.rows[0].count, 10);
    res.json(formatResponse(true, { count }));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, 'Error fetching count'));
  }
});

// PUT mark as read
router.put('/:id/read', auth, async (req, res) => {
  const { id } = req.params;

  try {
    const noteResult = await pool.query('SELECT user_id FROM notifications WHERE id = $1', [id]);
    const note = noteResult.rows[0];
    if (!note) {
      return res.status(404).json(formatResponse(false, null, 'Notification not found'));
    }

    if (note.user_id !== req.user.id) {
      return res.status(403).json(formatResponse(false, null, 'Access denied'));
    }

    await pool.query('UPDATE notifications SET read = true WHERE id = $1', [id]);
    res.json(formatResponse(true, null, 'Notification marked as read'));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, 'Error updating notification'));
  }
});

// PUT mark all as read
router.put('/read-all', auth, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET read = true WHERE user_id = $1', [req.user.id]);
    res.json(formatResponse(true, null, 'All notifications marked as read'));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, 'Error updating notifications'));
  }
});

// GET SSE notifications stream (Real-time updates)
router.get('/stream', auth, (req, res) => {
  const userId = req.user.id;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': 'http://localhost:5173'
  });

  res.write('data: {"type": "connected"}\n\n');

  let lastCheck = new Date().toISOString();

  const checkAlerts = setInterval(async () => {
    try {
      const newNotesResult = await pool.query('SELECT * FROM notifications WHERE user_id = $1 AND created_at > $2 ORDER BY created_at ASC', [userId, lastCheck]);
      const newNotes = newNotesResult.rows;
      
      if (newNotes.length > 0) {
        lastCheck = new Date().toISOString();
        newNotes.forEach(n => {
          res.write(`data: ${JSON.stringify(n)}\n\n`);
        });
      }
    } catch (err) {
      console.error('SSE check error:', err);
    }
  }, 5000);

  req.on('close', () => {
    clearInterval(checkAlerts);
    res.end();
  });
});

export default router;
