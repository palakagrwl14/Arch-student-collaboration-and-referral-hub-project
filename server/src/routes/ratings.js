import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import auth, { requireRole } from '../middleware/auth.js';
import { formatResponse } from '../utils/helpers.js';

const router = express.Router();

// POST /api/ratings - Rate an alumni (Student only)
router.post('/', auth, requireRole('student'), async (req, res) => {
  const { referral_id, score, review } = req.body;

  if (!referral_id || !score || score < 1 || score > 5) {
    return res.status(400).json(formatResponse(false, null, 'referral_id and rating score (1-5) are required'));
  }

  try {
    // 1. Verify application exists and reaches terminal state
    const appRes = await pool.query(`
      SELECT ra.status as app_status, r.status as ref_status, r.posted_by as alumni_id
      FROM referral_applications ra
      JOIN referrals r ON ra.referral_id = r.id
      WHERE ra.referral_id = $1 AND ra.student_id = $2
    `, [referral_id, req.user.id]);
    const app = appRes.rows[0];

    if (!app) {
      return res.status(400).json(formatResponse(false, null, 'You did not apply to this referral post'));
    }

    const appTerminal = ['selected', 'rejected'].includes(app.app_status);
    const refTerminal = ['closed', 'slots_full', 'expired'].includes(app.ref_status);

    if (!appTerminal && !refTerminal) {
      return res.status(400).json(formatResponse(false, null, 'You can only rate an alumni after the application process completes (Selected/Rejected) or the referral closes'));
    }

    // 2. Check if student already rated
    const existingRes = await pool.query('SELECT id FROM ratings WHERE referral_id = $1 AND student_id = $2', [referral_id, req.user.id]);
    if (existingRes.rows.length > 0) {
      return res.status(400).json(formatResponse(false, null, 'You have already submitted a rating for this referral'));
    }

    // 3. Insert rating
    await pool.query(`
      INSERT INTO ratings (id, referral_id, student_id, alumni_id, score, review)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [uuidv4(), referral_id, req.user.id, app.alumni_id, parseInt(score, 10), review || null]);

    res.status(201).json(formatResponse(true, null, 'Rating submitted successfully'));
  } catch (error) {
    console.error('Submit rating error:', error);
    res.status(500).json(formatResponse(false, null, 'Error submitting rating'));
  }
});

// GET /api/ratings/alumni/:alumniId - Get all ratings for an alumni
router.get('/alumni/:alumniId', async (req, res) => {
  const { alumniId } = req.params;

  try {
    const listRes = await pool.query(`
      SELECT rt.*, u.name as student_name, u.avatar_url as student_avatar
      FROM ratings rt
      JOIN users u ON rt.student_id = u.id
      WHERE rt.alumni_id = $1
      ORDER BY rt.submitted_at DESC
    `, [alumniId]);

    res.json(formatResponse(true, listRes.rows));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, 'Error fetching ratings'));
  }
});

export default router;
