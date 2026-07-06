import express from 'express';
import pool from '../config/database.js';
import auth, { requireRole } from '../middleware/auth.js';
import { formatResponse } from '../utils/helpers.js';
import { logAudit } from '../utils/auditLog.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Apply admin guard to all routes in this router
router.use(auth, requireRole('admin'));

// GET /api/admin/verifications - List pending verifications
router.get('/verifications', async (req, res) => {
  try {
    const listResult = await pool.query(`
      SELECT id, name, email, college, company, designation, graduation_year, verification_status, verification_proof, created_at
      FROM users
      WHERE verification_status = 'pending'
      ORDER BY created_at ASC
    `);
    
    res.json(formatResponse(true, listResult.rows));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, 'Error fetching verifications'));
  }
});

// PUT /api/admin/verifications/:userId - Approve/Reject Verification
router.put('/verifications/:userId', async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body; // 'verified' | 'rejected'

  if (!['verified', 'rejected'].includes(status)) {
    return res.status(400).json(formatResponse(false, null, 'Invalid status choice'));
  }

  try {
    const userRes = await pool.query('SELECT name, verification_status FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];
    if (!user) {
      return res.status(404).json(formatResponse(false, null, 'User not found'));
    }

    await pool.query('UPDATE users SET verification_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, userId]);

    await logAudit({
      entityType: 'user',
      entityId: userId,
      action: status === 'verified' ? 'APPROVE_VERIFICATION' : 'REJECT_VERIFICATION',
      oldStatus: user.verification_status,
      newStatus: status,
      performedBy: req.user.id
    });

    // Notify user
    await pool.query(`
      INSERT INTO notifications (id, user_id, type, title, message, link)
      VALUES ($1, $2, 'verification_status', 'Account Verification Update', $3, $4)
    `, [
      uuidv4(),
      userId,
      status === 'verified' ? 'Account Verified!' : 'Verification Refused',
      status === 'verified'
        ? 'Congratulations! Your alumni credentials have been approved. You can now post job referrals.'
        : 'Your submitted verification credentials could not be verified. Please upload valid proof.',
      '/profile'
    ]);

    res.json(formatResponse(true, null, `Verification status updated to ${status}`));
  } catch (error) {
    console.error('Update verification status error:', error);
    res.status(500).json(formatResponse(false, null, 'Error updating status'));
  }
});

// GET /api/admin/reports - List flagged referrals
router.get('/reports', async (req, res) => {
  try {
    const listResult = await pool.query(`
      SELECT rp.*, r.company, r.job_role, r.description as referral_desc, u.name as reported_by_name
      FROM reports rp
      JOIN referrals r ON rp.referral_id = r.id
      JOIN users u ON rp.reported_by = u.id
      WHERE rp.status = 'pending'
      ORDER BY rp.created_at ASC
    `);

    res.json(formatResponse(true, listResult.rows));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, 'Error fetching reports'));
  }
});

// PUT /api/admin/reports/:reportId - Resolve report
router.put('/reports/:reportId', async (req, res) => {
  const { reportId } = req.params;
  const { status, actionTaken } = req.body; // status: 'resolved'|'dismissed', actionTaken: 'none'|'remove_posting'

  if (!['resolved', 'dismissed'].includes(status)) {
    return res.status(400).json(formatResponse(false, null, 'Invalid resolution status'));
  }

  const client = await pool.connect();

  try {
    const repRes = await client.query('SELECT * FROM reports WHERE id = $1', [reportId]);
    const report = repRes.rows[0];
    if (!report) {
      return res.status(404).json(formatResponse(false, null, 'Report not found'));
    }

    await client.query('BEGIN');

    // 1. Update report status
    await client.query("UPDATE reports SET status = $1 WHERE id = $2", [status, reportId]);

    // 2. Perform action if resolved
    if (status === 'resolved' && actionTaken === 'remove_posting') {
      const refRes = await client.query('SELECT posted_by, company, job_role, status FROM referrals WHERE id = $1', [report.referral_id]);
      const referral = refRes.rows[0];
      if (referral) {
        // Close referral
        await client.query("UPDATE referrals SET status = 'closed', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [report.referral_id]);
        
        await logAudit({
          entityType: 'referral',
          entityId: report.referral_id,
          action: 'ADMIN_REMOVE_POSTING',
          oldStatus: referral.status,
          newStatus: 'closed',
          performedBy: req.user.id,
          metadata: { reportId }
        });

        // Notify posting alumni
        await client.query(`
          INSERT INTO notifications (id, user_id, type, title, message, link)
          VALUES ($1, $2, 'referral_removed', 'Posting flagged and removed', $3, $4)
        `, [
          uuidv4(),
          referral.posted_by,
          `Your referral posting for ${referral.company} - ${referral.job_role} has been closed by admin due to compliance flags.`,
          '/my-referrals'
        ]);
      }
    }

    await logAudit({
      entityType: 'report',
      entityId: reportId,
      action: 'RESOLVE_REPORT',
      oldStatus: report.status,
      newStatus: status,
      performedBy: req.user.id,
      metadata: { actionTaken }
    });

    await client.query('COMMIT');
    res.json(formatResponse(true, null, `Report marked as ${status}`));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Resolve report error:', error);
    res.status(500).json(formatResponse(false, null, 'Error resolving report'));
  } finally {
    client.release();
  }
});

// GET /api/admin/audit-logs - View system logs
router.get('/audit-logs', async (req, res) => {
  try {
    const logsResult = await pool.query(`
      SELECT al.*, u.name as performer_name
      FROM audit_log al
      LEFT JOIN users u ON al.performed_by = u.id
      ORDER BY al.created_at DESC
      LIMIT 100
    `);

    res.json(formatResponse(true, logsResult.rows));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, 'Error fetching audit logs'));
  }
});

export default router;
