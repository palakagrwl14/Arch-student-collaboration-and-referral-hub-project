import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import auth, { requireRole } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import { formatResponse, parseJSON } from '../utils/helpers.js';
import { logAudit } from '../utils/auditLog.js';

const router = express.Router();

// POST /api/referral-applications - Apply for a referral
router.post('/', auth, upload.single('resume'), async (req, res) => {
  const { referral_id, github_url, linkedin_url, portfolio_url, intro_text } = req.body;

  if (!referral_id || !intro_text) {
    return res.status(400).json(formatResponse(false, null, 'referral_id and introduction text are required'));
  }

  if (intro_text.length > 200) {
    return res.status(400).json(formatResponse(false, null, 'Introduction must be at most 200 characters'));
  }

  try {
    // Check if referral exists and is active
    const refRes = await pool.query('SELECT status, posted_by, company, job_role, slots_remaining FROM referrals WHERE id = $1', [referral_id]);
    const referral = refRes.rows[0];
    if (!referral) {
      return res.status(404).json(formatResponse(false, null, 'Referral posting not found'));
    }

    if (referral.status !== 'active') {
      return res.status(400).json(formatResponse(false, null, `This referral is closed (Status: ${referral.status})`));
    }

    if (parseInt(referral.slots_remaining, 10) <= 0) {
      return res.status(400).json(formatResponse(false, null, 'All available referral slots are filled'));
    }

    // Check duplicate applications
    const existingRes = await pool.query('SELECT id FROM referral_applications WHERE referral_id = $1 AND student_id = $2', [referral_id, req.user.id]);
    if (existingRes.rows.length > 0) {
      return res.status(400).json(formatResponse(false, null, 'You have already applied to this referral'));
    }

    const resumePath = req.file ? `/uploads/${req.file.filename}` : '/uploads/placeholder_resume.pdf';
    const appId = uuidv4();

    await pool.query(`
      INSERT INTO referral_applications (id, referral_id, student_id, resume_path, github_url, linkedin_url, portfolio_url, intro_text, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'applied')
    `, [appId, referral_id, req.user.id, resumePath, github_url || null, linkedin_url || null, portfolio_url || null, intro_text]);

    // Notify Alumni
    await pool.query(`
      INSERT INTO notifications (id, user_id, type, title, message, link)
      VALUES ($1, $2, 'referral_application', $3, $4, $5)
    `, [
      uuidv4(),
      referral.posted_by,
      'New Referral Applicant',
      `${req.user.name} applied for your ${referral.company} - ${referral.job_role} referral slot.`,
      `/my-referrals`
    ]);

    res.status(201).json(formatResponse(true, null, 'Referral application submitted successfully'));
  } catch (error) {
    console.error('Submit referral application error:', error);
    res.status(500).json(formatResponse(false, null, 'Error submitting application'));
  }
});

// GET /api/referral-applications/my-apps - Get logged-in student's applications
router.get('/my-apps', auth, requireRole('student'), async (req, res) => {
  try {
    const appsRes = await pool.query(`
      SELECT ra.*, r.company, r.job_role, r.type, r.company_logo, r.posted_by as alumni_id, u.name as alumni_name
      FROM referral_applications ra
      JOIN referrals r ON ra.referral_id = r.id
      JOIN users u ON r.posted_by = u.id
      WHERE ra.student_id = $1
      ORDER BY ra.applied_at DESC
    `, [req.user.id]);

    res.json(formatResponse(true, appsRes.rows));
  } catch (error) {
    console.error('Fetch student applications error:', error);
    res.status(500).json(formatResponse(false, null, 'Error fetching applications'));
  }
});

// GET /api/referral-applications/referral/:referralId - View candidates (Alumni only)
router.get('/referral/:referralId', auth, requireRole('alumni'), async (req, res) => {
  const { referralId } = req.params;

  try {
    const refRes = await pool.query('SELECT posted_by FROM referrals WHERE id = $1', [referralId]);
    const referral = refRes.rows[0];
    if (!referral) {
      return res.status(404).json(formatResponse(false, null, 'Referral not found'));
    }

    if (referral.posted_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json(formatResponse(false, null, 'Access denied'));
    }

    const candRes = await pool.query(`
      SELECT ra.*, u.name, u.avatar_url, u.college, u.skills, u.email
      FROM referral_applications ra
      JOIN users u ON ra.student_id = u.id
      WHERE ra.referral_id = $1
      ORDER BY ra.applied_at DESC
    `, [referralId]);

    const formatted = candRes.rows.map(c => ({
      ...c,
      skills: parseJSON(c.skills, [])
    }));

    res.json(formatResponse(true, formatted));
  } catch (error) {
    console.error('Fetch candidates error:', error);
    res.status(500).json(formatResponse(false, null, 'Error fetching candidates'));
  }
});

// PUT /api/referral-applications/:id - Update status (Accept, Shortlist, Reject, Submitted)
router.put('/:id', auth, requireRole('alumni'), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['under_review', 'shortlisted', 'referral_submitted', 'interview_scheduled', 'selected', 'rejected'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json(formatResponse(false, null, 'Invalid status transitions'));
  }

  const client = await pool.connect();

  try {
    const appRes = await client.query('SELECT * FROM referral_applications WHERE id = $1', [id]);
    const app = appRes.rows[0];
    if (!app) {
      return res.status(404).json(formatResponse(false, null, 'Application not found'));
    }

    const refRes = await client.query('SELECT posted_by, company, job_role, slots_remaining, status FROM referrals WHERE id = $1', [app.referral_id]);
    const referral = refRes.rows[0];
    if (referral.posted_by !== req.user.id) {
      return res.status(403).json(formatResponse(false, null, 'Only posting alumni can manage application status'));
    }

    // Begin PostgreSQL Transaction
    await client.query('BEGIN');
    let isDecrement = false;
    
    if (status === 'referral_submitted' && app.status !== 'referral_submitted') {
      const remaining = parseInt(referral.slots_remaining, 10);
      if (remaining <= 0) {
        throw new Error('No referral slots remaining! Cannot submit referral.');
      }
      
      isDecrement = true;
      const newSlots = remaining - 1;
      
      await client.query('UPDATE referrals SET slots_remaining = $1 WHERE id = $2', [newSlots, app.referral_id]);
      
      if (newSlots === 0) {
        await client.query("UPDATE referrals SET status = 'slots_full', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [app.referral_id]);
        await logAudit({
          entityType: 'referral',
          entityId: app.referral_id,
          action: 'UPDATE_STATUS',
          oldStatus: 'active',
          newStatus: 'slots_full',
          performedBy: req.user.id
        });
      }
    }

    await client.query('UPDATE referral_applications SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, id]);

    await logAudit({
      entityType: 'referral_application',
      entityId: id,
      action: 'UPDATE_APP_STATUS',
      oldStatus: app.status,
      newStatus: status,
      performedBy: req.user.id,
      metadata: { decremented: isDecrement }
    });

    await client.query(`
      INSERT INTO notifications (id, user_id, type, title, message, link)
      VALUES ($1, $2, 'referral_status_change', 'Referral Application Update', $3, $4)
    `, [
      uuidv4(),
      app.student_id,
      `Your application for ${referral.company} - ${referral.job_role} has been updated to "${status.replace('_', ' ')}".`,
      `/my-applications`
    ]);

    await client.query('COMMIT');
    res.json(formatResponse(true, null, 'Application status updated successfully'));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update referral application status error:', error);
    res.status(500).json(formatResponse(false, null, error.message || 'Error updating status'));
  } finally {
    client.release();
  }
});

// POST /api/referral-applications/withdraw - Student withdraw application
router.post('/withdraw', auth, requireRole('student'), async (req, res) => {
  const { referral_id } = req.body;

  try {
    const appRes = await pool.query('SELECT id, status FROM referral_applications WHERE referral_id = $1 AND student_id = $2', [referral_id, req.user.id]);
    const app = appRes.rows[0];
    if (!app) {
      return res.status(404).json(formatResponse(false, null, 'Application not found'));
    }

    if (app.status === 'referral_submitted' || app.status === 'selected' || app.status === 'rejected') {
      return res.status(400).json(formatResponse(false, null, 'You cannot withdraw an application after referral has been submitted or completed'));
    }

    await pool.query("UPDATE referral_applications SET status = 'withdrawn', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [app.id]);
    
    await logAudit({
      entityType: 'referral_application',
      entityId: app.id,
      action: 'WITHDRAW_APP',
      oldStatus: app.status,
      newStatus: 'withdrawn',
      performedBy: req.user.id
    });

    res.json(formatResponse(true, null, 'Application withdrawn successfully'));
  } catch (error) {
    console.error('Withdraw application error:', error);
    res.status(500).json(formatResponse(false, null, 'Error withdrawing application'));
  }
});

export default router;
