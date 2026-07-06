import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import auth, { requireRole } from '../middleware/auth.js';
import validateRequest from '../middleware/validate.js';
import { formatResponse, parseJSON } from '../utils/helpers.js';
import { logAudit } from '../utils/auditLog.js';

const router = express.Router();

const referralSchema = {
  body: {
    company: { required: true },
    job_role: { required: true },
    type: { required: true, enum: ['internship', 'fulltime'] },
    slots_total: { required: true, type: 'number' },
    last_date: { required: true }
  }
};

// GET /api/referrals - Get active referrals with filters
router.get('/', async (req, res) => {
  const { company, role, type, location, work_mode, search } = req.query;

  try {
    let query = `
      SELECT r.*, u.name as alumni_name, u.avatar_url as alumni_avatar, u.company as alumni_company, u.designation as alumni_designation
      FROM referrals r
      JOIN users u ON r.posted_by = u.id
      WHERE r.status = 'active'
    `;
    const conditions = [];
    const values = [];
    let paramIdx = 1;

    if (company) {
      conditions.push(`r.company ILIKE $${paramIdx++}`);
      values.push(`%${company}%`);
    }

    if (role) {
      conditions.push(`r.job_role ILIKE $${paramIdx++}`);
      values.push(`%${role}%`);
    }

    if (type) {
      conditions.push(`r.type = $${paramIdx++}`);
      values.push(type);
    }

    if (location) {
      conditions.push(`r.location ILIKE $${paramIdx++}`);
      values.push(`%${location}%`);
    }

    if (work_mode) {
      conditions.push(`r.work_mode = $${paramIdx++}`);
      values.push(work_mode);
    }

    if (search) {
      conditions.push(`(r.company ILIKE $${paramIdx} OR r.job_role ILIKE $${paramIdx} OR r.description ILIKE $${paramIdx})`);
      values.push(`%${search}%`);
      paramIdx++;
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ' ORDER BY r.created_at DESC';

    const result = await pool.query(query, values);
    const referrals = result.rows;

    const formatted = referrals.map(r => ({
      ...r,
      skills_required: parseJSON(r.skills_required, []),
      eligibility_branches: parseJSON(r.eligibility_branches, []),
      eligibility_batch_years: parseJSON(r.eligibility_batch_years, [])
    }));

    res.json(formatResponse(true, formatted));
  } catch (error) {
    console.error('Fetch referrals error:', error);
    res.status(500).json(formatResponse(false, null, 'Error fetching referrals'));
  }
});

// GET /api/referrals/my-posts - Get referrals posted by the logged-in alumni
router.get('/my-posts', auth, requireRole('alumni'), async (req, res) => {
  try {
    // In PostgreSQL GROUP BY requires non-aggregate columns to be grouped or aggregated
    const query = `
      SELECT r.id, r.company, r.company_logo, r.job_role, r.type, r.location, r.work_mode, r.salary,
             r.skills_required, r.eligibility_cgpa, r.eligibility_branches, r.eligibility_batch_years,
             r.eligibility_text, r.description, r.responsibilities, r.last_date, r.slots_total, r.slots_remaining,
             r.status, r.posted_by, r.created_at, r.updated_at,
             COUNT(ra.id) as applicant_count
      FROM referrals r
      LEFT JOIN referral_applications ra ON r.id = ra.referral_id
      WHERE r.posted_by = $1
      GROUP BY r.id, r.company, r.company_logo, r.job_role, r.type, r.location, r.work_mode, r.salary,
               r.skills_required, r.eligibility_cgpa, r.eligibility_branches, r.eligibility_batch_years,
               r.eligibility_text, r.description, r.responsibilities, r.last_date, r.slots_total, r.slots_remaining,
               r.status, r.posted_by, r.created_at, r.updated_at
      ORDER BY r.created_at DESC
    `;

    const result = await pool.query(query, [req.user.id]);
    const referrals = result.rows;

    const formatted = referrals.map(r => ({
      ...r,
      skills_required: parseJSON(r.skills_required, []),
      eligibility_branches: parseJSON(r.eligibility_branches, []),
      eligibility_batch_years: parseJSON(r.eligibility_batch_years, []),
      applicant_count: parseInt(r.applicant_count, 10)
    }));

    res.json(formatResponse(true, formatted));
  } catch (error) {
    console.error('Fetch my referrals error:', error);
    res.status(500).json(formatResponse(false, null, 'Error fetching referrals'));
  }
});

// GET /api/referrals/:id - Get referral details with alumni public stats
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const refResult = await pool.query(`
      SELECT r.*, u.name as alumni_name, u.avatar_url as alumni_avatar, u.company as alumni_company, u.designation as alumni_designation, u.verification_status as alumni_verified
      FROM referrals r
      JOIN users u ON r.posted_by = u.id
      WHERE r.id = $1
    `, [id]);
    const referral = refResult.rows[0];

    if (!referral) {
      return res.status(404).json(formatResponse(false, null, 'Referral post not found'));
    }

    // Fetch alumni stats
    const alumniId = referral.posted_by;
    const postedRes = await pool.query('SELECT COUNT(*) as count FROM referrals WHERE posted_by = $1', [alumniId]);
    const postedCount = parseInt(postedRes.rows[0].count, 10);
    
    const completedRes = await pool.query("SELECT COUNT(*) as count FROM referrals WHERE posted_by = $1 AND status = 'closed'", [alumniId]);
    const completedCount = parseInt(completedRes.rows[0].count, 10);
    
    const ratingsRes = await pool.query('SELECT AVG(score) as avg, COUNT(*) as count FROM ratings WHERE alumni_id = $1', [alumniId]);
    const ratings = ratingsRes.rows[0];

    const formatted = {
      ...referral,
      skills_required: parseJSON(referral.skills_required, []),
      eligibility_branches: parseJSON(referral.eligibility_branches, []),
      eligibility_batch_years: parseJSON(referral.eligibility_batch_years, []),
      alumni_stats: {
        referrals_posted: postedCount,
        referrals_completed: completedCount,
        average_response_time: '24 hours',
        student_rating: ratings.avg ? Math.round(parseFloat(ratings.avg) * 10) / 10 : 5.0,
        ratings_count: parseInt(ratings.count, 10)
      }
    };

    res.json(formatResponse(true, formatted));
  } catch (error) {
    console.error('Fetch referral details error:', error);
    res.status(500).json(formatResponse(false, null, 'Error fetching referral details'));
  }
});

// POST /api/referrals - Post a referral (Alumni only, must be verified)
router.post('/', auth, requireRole('alumni'), validateRequest(referralSchema), async (req, res) => {
  if (req.user.verification_status !== 'verified') {
    return res.status(403).json(formatResponse(false, null, 'Access denied: You must complete verification before posting referrals'));
  }

  const {
    company,
    company_logo,
    job_role,
    type,
    location,
    work_mode,
    salary,
    skills_required,
    eligibility_cgpa,
    eligibility_branches,
    eligibility_batch_years,
    eligibility_text,
    description,
    responsibilities,
    last_date,
    slots_total
  } = req.body;

  const referralId = uuidv4();

  try {
    // In PostgreSQL, DATE types must be in ISO format or valid DATE values.
    // slots_total and slots_remaining must be integers.
    await pool.query(`
      INSERT INTO referrals (
        id, company, company_logo, job_role, type, location, work_mode, salary, 
        skills_required, eligibility_cgpa, eligibility_branches, eligibility_batch_years, 
        eligibility_text, description, responsibilities, last_date, slots_total, slots_remaining, status, posted_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'active', $19)
    `, [
      referralId,
      company,
      company_logo || null,
      job_role,
      type,
      location || null,
      work_mode || 'onsite',
      salary || null,
      JSON.stringify(skills_required || []),
      eligibility_cgpa ? parseFloat(eligibility_cgpa) : null,
      JSON.stringify(eligibility_branches || []),
      JSON.stringify(eligibility_batch_years || []),
      eligibility_text || null,
      description || null,
      responsibilities || null,
      last_date, // 'YYYY-MM-DD' works natively in PG DATE columns
      parseInt(slots_total, 10),
      parseInt(slots_total, 10),
      req.user.id
    ]);

    await logAudit({
      entityType: 'referral',
      entityId: referralId,
      action: 'POST_REFERRAL',
      newStatus: 'active',
      performedBy: req.user.id
    });

    res.status(201).json(formatResponse(true, { id: referralId }, 'Referral posted successfully'));
  } catch (error) {
    console.error('Post referral error:', error);
    res.status(500).json(formatResponse(false, null, 'Error posting referral'));
  }
});

// PUT /api/referrals/:id - Close referral manually / edit details
router.put('/:id', auth, requireRole('alumni'), async (req, res) => {
  const { id } = req.params;
  const { status, description, responsibilities, last_date } = req.body;

  try {
    const refResult = await pool.query('SELECT posted_by, status FROM referrals WHERE id = $1', [id]);
    const referral = refResult.rows[0];
    if (!referral) {
      return res.status(404).json(formatResponse(false, null, 'Referral not found'));
    }

    if (referral.posted_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json(formatResponse(false, null, 'Only the alumni who posted can edit this referral'));
    }

    const updates = [];
    const values = [];
    let paramIdx = 1;

    if (description !== undefined) { updates.push(`description = $${paramIdx++}`); values.push(description); }
    if (responsibilities !== undefined) { updates.push(`responsibilities = $${paramIdx++}`); values.push(responsibilities); }
    if (last_date !== undefined) { updates.push(`last_date = $${paramIdx++}`); values.push(last_date); }
    
    let oldStatus = referral.status;
    let newStatus = oldStatus;
    if (status !== undefined) {
      updates.push(`status = $${paramIdx++}`);
      values.push(status);
      newStatus = status;
    }

    if (updates.length === 0) {
      return res.status(400).json(formatResponse(false, null, 'No update parameters provided'));
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id); // For the WHERE clause

    const query = `UPDATE referrals SET ${updates.join(', ')} WHERE id = $${paramIdx}`;
    await pool.query(query, values);

    if (oldStatus !== newStatus) {
      await logAudit({
        entityType: 'referral',
        entityId: id,
        action: 'UPDATE_STATUS',
        oldStatus,
        newStatus,
        performedBy: req.user.id
      });
    }

    res.json(formatResponse(true, null, 'Referral updated successfully'));
  } catch (error) {
    console.error('Update referral error:', error);
    res.status(500).json(formatResponse(false, null, 'Error updating referral'));
  }
});

export default router;
