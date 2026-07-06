import express from 'express';
import pool from '../config/database.js';
import auth, { requireRole } from '../middleware/auth.js';
import { formatResponse, parseJSON } from '../utils/helpers.js';

const router = express.Router();

// GET /api/portfolio - Fetch student's verified credentials portfolio
router.get('/', auth, requireRole('student'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pe.*, p.title as project_title, p.description as project_description
      FROM portfolio_entries pe
      JOIN projects p ON pe.project_id = p.id
      WHERE pe.student_id = $1
      ORDER BY pe.completed_at DESC
    `, [req.user.id]);

    const formatted = result.rows.map(entry => ({
      ...entry,
      skills_used: parseJSON(entry.skills_used, [])
    }));

    res.json(formatResponse(true, formatted));
  } catch (error) {
    console.error('Fetch portfolio error:', error);
    res.status(500).json(formatResponse(false, null, 'Error loading portfolio entries'));
  }
});

// PUT /api/portfolio/:id - Edit contribution notes/roles on portfolio entries (avoids lead monopolizing all credit)
router.put('/:id', auth, requireRole('student'), async (req, res) => {
  const { id } = req.params;
  const { role_played, contribution_notes } = req.body;

  if (!role_played || !contribution_notes) {
    return res.status(400).json(formatResponse(false, null, 'role_played and contribution_notes are required'));
  }

  try {
    const result = await pool.query(`
      UPDATE portfolio_entries 
      SET role_played = $1, contribution_notes = $2 
      WHERE id = $3 AND student_id = $4
    `, [role_played, contribution_notes, id, req.user.id]);

    // Check if anything changed
    if (result.rowCount === 0) {
      return res.status(404).json(formatResponse(false, null, 'Portfolio entry not found or access denied'));
    }

    res.json(formatResponse(true, null, 'Portfolio entry updated successfully'));
  } catch (error) {
    console.error('Update portfolio error:', error);
    res.status(500).json(formatResponse(false, null, 'Error updating portfolio entry'));
  }
});

export default router;
