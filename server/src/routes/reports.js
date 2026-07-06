import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import auth from '../middleware/auth.js';
import { formatResponse } from '../utils/helpers.js';
import { logAudit } from '../utils/auditLog.js';

const router = express.Router();

// POST /api/reports - Report/flag a referral
router.post('/', auth, async (req, res) => {
  const { referral_id, reason } = req.body;

  if (!referral_id || !reason) {
    return res.status(400).json(formatResponse(false, null, 'referral_id and reason are required'));
  }

  try {
    const refRes = await pool.query('SELECT id, company, job_role FROM referrals WHERE id = $1', [referral_id]);
    const referral = refRes.rows[0];
    if (!referral) {
      return res.status(404).json(formatResponse(false, null, 'Referral post not found'));
    }

    const reportId = uuidv4();
    await pool.query(`
      INSERT INTO reports (id, referral_id, reported_by, reason, status)
      VALUES ($1, $2, $3, $4, 'pending')
    `, [reportId, referral_id, req.user.id, reason]);

    await logAudit({
      entityType: 'report',
      entityId: reportId,
      action: 'FILE_REPORT',
      newStatus: 'pending',
      performedBy: req.user.id,
      metadata: { referral_id, reason }
    });

    res.status(201).json(formatResponse(true, null, 'Thank you. The posting has been flagged for admin review.'));
  } catch (error) {
    console.error('File report error:', error);
    res.status(500).json(formatResponse(false, null, 'Error filing report'));
  }
});

export default router;
