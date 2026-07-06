import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import auth from '../middleware/auth.js';
import { formatResponse } from '../utils/helpers.js';

const router = express.Router();

// Helper middleware to check if user is a member of the project workspace
async function checkWorkspaceAccess(req, res, next) {
  const { projectId } = req.body;
  const targetId = projectId || req.query.projectId || req.params.projectId;

  if (!targetId) {
    return res.status(400).json(formatResponse(false, null, 'projectId parameter is required'));
  }

  try {
    const isMemberRes = await pool.query('SELECT id FROM team_members WHERE project_id = $1 AND user_id = $2', [targetId, req.user.id]);
    if (isMemberRes.rows.length === 0) {
      return res.status(403).json(formatResponse(false, null, 'Access denied: You are not a member of this project workspace'));
    }
    req.projectId = targetId;
    next();
  } catch (err) {
    res.status(500).json(formatResponse(false, null, 'Error checking workspace access'));
  }
}

// GET /api/workspace/:projectId - Get all tasks, notes, milestones for a workspace
router.get('/:projectId', auth, checkWorkspaceAccess, async (req, res) => {
  const { projectId } = req;

  try {
    const tasksRes = await pool.query(`
      SELECT wt.*, u.name as assignee_name 
      FROM workspace_tasks wt 
      LEFT JOIN users u ON wt.assigned_to = u.id 
      WHERE wt.project_id = $1
    `, [projectId]);

    const notesRes = await pool.query(`
      SELECT wn.*, u.name as author_name 
      FROM workspace_notes wn 
      JOIN users u ON wn.created_by = u.id 
      WHERE wn.project_id = $1 
      ORDER BY wn.created_at DESC
    `, [projectId]);

    const milestonesRes = await pool.query(`
      SELECT * FROM milestones 
      WHERE project_id = $1 
      ORDER BY created_at ASC
    `, [projectId]);

    res.json(formatResponse(true, {
      tasks: tasksRes.rows,
      notes: notesRes.rows,
      milestones: milestonesRes.rows
    }));
  } catch (error) {
    console.error('Fetch workspace details error:', error);
    res.status(500).json(formatResponse(false, null, 'Error fetching workspace data'));
  }
});

// POST /api/workspace/tasks - Create task
router.post('/tasks', auth, checkWorkspaceAccess, async (req, res) => {
  const { projectId, title, description, assigned_to, priority } = req.body;
  if (!title) return res.status(400).json(formatResponse(false, null, 'Task title is required'));

  const taskId = uuidv4();

  try {
    await pool.query(`
      INSERT INTO workspace_tasks (id, project_id, title, description, assigned_to, status, priority)
      VALUES ($1, $2, $3, $4, $5, 'todo', $6)
    `, [taskId, projectId, title, description || null, assigned_to || null, priority || 'medium']);

    res.status(201).json(formatResponse(true, { id: taskId }, 'Task created successfully'));
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json(formatResponse(false, null, 'Error creating task'));
  }
});

// PUT /api/workspace/tasks/:taskId - Update task details / status / assignee
router.put('/tasks/:taskId', auth, async (req, res) => {
  const { taskId } = req.params;
  const { status, title, description, assigned_to, priority } = req.body;

  try {
    const taskRes = await pool.query('SELECT project_id FROM workspace_tasks WHERE id = $1', [taskId]);
    const task = taskRes.rows[0];
    if (!task) return res.status(404).json(formatResponse(false, null, 'Task not found'));

    // Check workspace access
    const isMemberRes = await pool.query('SELECT id FROM team_members WHERE project_id = $1 AND user_id = $2', [task.project_id, req.user.id]);
    if (isMemberRes.rows.length === 0) {
      return res.status(403).json(formatResponse(false, null, 'Access denied'));
    }

    const updates = [];
    const values = [];
    let paramIdx = 1;

    if (status !== undefined) { updates.push(`status = $${paramIdx++}`); values.push(status); }
    if (title !== undefined) { updates.push(`title = $${paramIdx++}`); values.push(title); }
    if (description !== undefined) { updates.push(`description = $${paramIdx++}`); values.push(description); }
    if (assigned_to !== undefined) { updates.push(`assigned_to = $${paramIdx++}`); values.push(assigned_to || null); }
    if (priority !== undefined) { updates.push(`priority = $${paramIdx++}`); values.push(priority); }

    if (updates.length === 0) {
      return res.status(400).json(formatResponse(false, null, 'No fields to update'));
    }

    values.push(taskId);

    const query = `UPDATE workspace_tasks SET ${updates.join(', ')} WHERE id = $${paramIdx}`;
    await pool.query(query, values);

    res.json(formatResponse(true, null, 'Task updated successfully'));
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json(formatResponse(false, null, 'Error updating task'));
  }
});

// POST /api/workspace/notes - Create project note
router.post('/notes', auth, checkWorkspaceAccess, async (req, res) => {
  const { projectId, content } = req.body;
  if (!content) return res.status(400).json(formatResponse(false, null, 'Note content cannot be empty'));

  const noteId = uuidv4();

  try {
    await pool.query(`
      INSERT INTO workspace_notes (id, project_id, content, created_by)
      VALUES ($1, $2, $3, $4)
    `, [noteId, projectId, content, req.user.id]);

    res.status(201).json(formatResponse(true, { id: noteId }, 'Note added successfully'));
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json(formatResponse(false, null, 'Error creating note'));
  }
});

// POST /api/workspace/milestones - Create milestone
router.post('/milestones', auth, checkWorkspaceAccess, async (req, res) => {
  const { projectId, title, due_date } = req.body;
  if (!title) return res.status(400).json(formatResponse(false, null, 'Milestone title is required'));

  const milestoneId = uuidv4();

  try {
    await pool.query(`
      INSERT INTO milestones (id, project_id, title, due_date, completed)
      VALUES ($1, $2, $3, $4, false)
    `, [milestoneId, projectId, title, due_date || null]);

    res.status(201).json(formatResponse(true, { id: milestoneId }, 'Milestone created successfully'));
  } catch (error) {
    console.error('Create milestone error:', error);
    res.status(500).json(formatResponse(false, null, 'Error creating milestone'));
  }
});

// PUT /api/workspace/milestones/:milestoneId/toggle - Toggle milestone completion
router.put('/milestones/:milestoneId/toggle', auth, async (req, res) => {
  const { milestoneId } = req.params;

  try {
    const milestoneRes = await pool.query('SELECT project_id FROM milestones WHERE id = $1', [milestoneId]);
    const milestone = milestoneRes.rows[0];
    if (!milestone) return res.status(404).json(formatResponse(false, null, 'Milestone not found'));

    // Check workspace access
    const isMemberRes = await pool.query('SELECT id FROM team_members WHERE project_id = $1 AND user_id = $2', [milestone.project_id, req.user.id]);
    if (isMemberRes.rows.length === 0) {
      return res.status(403).json(formatResponse(false, null, 'Access denied'));
    }

    // Toggle completed status using NOT boolean logic in PostgreSQL
    await pool.query('UPDATE milestones SET completed = NOT completed WHERE id = $1', [milestoneId]);

    res.json(formatResponse(true, null, 'Milestone toggled successfully'));
  } catch (error) {
    console.error('Toggle milestone error:', error);
    res.status(500).json(formatResponse(false, null, 'Error toggling milestone'));
  }
});

export default router;
