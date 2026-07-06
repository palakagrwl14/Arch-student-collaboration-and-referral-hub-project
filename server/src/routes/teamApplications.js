import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import auth from '../middleware/auth.js';
import validateRequest from '../middleware/validate.js';
import { formatResponse, parseJSON } from '../utils/helpers.js';
import { logAudit } from '../utils/auditLog.js';

const router = express.Router();

const applySchema = {
  body: {
    project_id: { required: true },
    role_applied: { required: true },
    pitch: { required: true, minLength: 10 }
  }
};

// POST /api/team-applications - Apply to join a project
router.post('/', auth, validateRequest(applySchema), async (req, res) => {
  const { project_id, role_applied, pitch, portfolio_link } = req.body;

  try {
    const projectRes = await pool.query('SELECT status, created_by FROM projects WHERE id = $1', [project_id]);
    const project = projectRes.rows[0];
    if (!project) {
      return res.status(404).json(formatResponse(false, null, 'Project not found'));
    }

    if (project.status !== 'forming' && project.status !== 'open') {
      return res.status(400).json(formatResponse(false, null, 'Project is not accepting applications'));
    }

    if (project.created_by === req.user.id) {
      return res.status(400).json(formatResponse(false, null, 'Project creators cannot apply to their own project'));
    }

    const isMemberRes = await pool.query('SELECT id FROM team_members WHERE project_id = $1 AND user_id = $2', [project_id, req.user.id]);
    if (isMemberRes.rows.length > 0) {
      return res.status(400).json(formatResponse(false, null, 'You are already a member of this project'));
    }

    const hasAppliedRes = await pool.query("SELECT id FROM team_applications WHERE project_id = $1 AND student_id = $2 AND status = 'pending'", [project_id, req.user.id]);
    if (hasAppliedRes.rows.length > 0) {
      return res.status(400).json(formatResponse(false, null, 'You have a pending application for this project'));
    }

    const appId = uuidv4();
    await pool.query(`
      INSERT INTO team_applications (id, project_id, student_id, role_applied, pitch, portfolio_link, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
    `, [appId, project_id, req.user.id, role_applied, pitch, portfolio_link || null]);

    await pool.query(`
      INSERT INTO notifications (id, user_id, type, title, message, link)
      VALUES ($1, $2, 'team_application', $3, $4, $5)
    `, [
      uuidv4(),
      project.created_by,
      'New Project Applicant',
      `${req.user.name} applied for "${role_applied}" in your project.`,
      '/workspace'
    ]);

    res.status(201).json(formatResponse(true, null, 'Application submitted successfully'));
  } catch (error) {
    console.error('Submit team application error:', error);
    res.status(500).json(formatResponse(false, null, 'Error submitting application'));
  }
});

// GET /api/team-applications/project/:projectId
router.get('/project/:projectId', auth, async (req, res) => {
  const { projectId } = req.params;

  try {
    const projectRes = await pool.query('SELECT created_by FROM projects WHERE id = $1', [projectId]);
    const project = projectRes.rows[0];
    if (!project) {
      return res.status(404).json(formatResponse(false, null, 'Project not found'));
    }

    if (project.created_by !== req.user.id) {
      return res.status(403).json(formatResponse(false, null, 'Access denied'));
    }

    const appsRes = await pool.query(`
      SELECT ta.*, u.name, u.avatar_url, u.college, u.skills
      FROM team_applications ta
      JOIN users u ON ta.student_id = u.id
      WHERE ta.project_id = $1 AND ta.status = 'pending'
    `, [projectId]);

    const formatted = appsRes.rows.map(a => ({
      ...a,
      skills: parseJSON(a.skills, [])
    }));

    res.json(formatResponse(true, formatted));
  } catch (error) {
    console.error('Fetch applications error:', error);
    res.status(500).json(formatResponse(false, null, 'Error fetching applications'));
  }
});

// PUT /api/team-applications/:id - Accept or Reject Application
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json(formatResponse(false, null, 'Invalid status update'));
  }

  const client = await pool.connect();

  try {
    const appRes = await client.query('SELECT * FROM team_applications WHERE id = $1', [id]);
    const app = appRes.rows[0];
    if (!app) {
      return res.status(404).json(formatResponse(false, null, 'Application not found'));
    }

    const projectRes = await client.query('SELECT created_by, open_roles, title, status FROM projects WHERE id = $1', [app.project_id]);
    const project = projectRes.rows[0];
    if (project.created_by !== req.user.id) {
      return res.status(403).json(formatResponse(false, null, 'Only project lead can manage applications'));
    }

    if (app.status !== 'pending') {
      return res.status(400).json(formatResponse(false, null, 'Application is already processed'));
    }

    // Begin PostgreSQL Transaction
    await client.query('BEGIN');

    await client.query('UPDATE team_applications SET status = $1 WHERE id = $2', [status, id]);

    if (status === 'accepted') {
      await client.query(`
        INSERT INTO team_members (id, project_id, user_id, role)
        VALUES ($1, $2, $3, $4)
      `, [uuidv4(), app.project_id, app.student_id, app.role_applied]);

      const openRoles = parseJSON(project.open_roles, []);
      const applicantUserRes = await client.query('SELECT name FROM users WHERE id = $1', [app.student_id]);
      const applicantUser = applicantUserRes.rows[0];
      
      let roleUpdated = false;
      const updatedRoles = openRoles.map(r => {
        if (r.role === app.role_applied && !r.filled_by) {
          roleUpdated = true;
          return { ...r, filled_by: applicantUser.name };
        }
        return r;
      });

      await client.query('UPDATE projects SET open_roles = $1 WHERE id = $2', [JSON.stringify(updatedRoles), app.project_id]);

      await logAudit({
        entityType: 'project',
        entityId: app.project_id,
        action: 'ACCEPT_TEAMMATE',
        performedBy: req.user.id,
        metadata: { student_id: app.student_id, role: app.role_applied }
      });

      const unfilledExists = updatedRoles.some(r => !r.filled_by);
      if (!unfilledExists && project.status === 'forming') {
        await client.query("UPDATE projects SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [app.project_id]);
        await logAudit({
          entityType: 'project',
          entityId: app.project_id,
          action: 'UPDATE_STATUS',
          oldStatus: 'forming',
          newStatus: 'active',
          performedBy: req.user.id
        });
      }
    }

    await client.query(`
      INSERT INTO notifications (id, user_id, type, title, message, link)
      VALUES ($1, $2, 'team_application_status', $3, $4, $5)
    `, [
      uuidv4(),
      app.student_id,
      status === 'accepted' ? 'Application Accepted!' : 'Application Declined',
      status === 'accepted' 
        ? `You have been accepted to join "${project.title}" as ${app.role_applied}.`
        : `Your application to join "${project.title}" has been rejected.`,
      status === 'accepted' ? '/workspace' : '/projects'
    ]);

    await client.query('COMMIT');
    res.json(formatResponse(true, null, `Application ${status} successfully`));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Accept/reject team application error:', error);
    res.status(500).json(formatResponse(false, null, 'Error processing application'));
  } finally {
    client.release();
  }
});

// POST /api/team-applications/leave
router.post('/leave', auth, async (req, res) => {
  const { project_id } = req.body;
  const client = await pool.connect();

  try {
    const isMemberRes = await client.query('SELECT role FROM team_members WHERE project_id = $1 AND user_id = $2', [project_id, req.user.id]);
    const isMember = isMemberRes.rows[0];
    if (!isMember) {
      return res.status(400).json(formatResponse(false, null, 'You are not a member of this project'));
    }

    const projectRes = await client.query('SELECT created_by, open_roles, status FROM projects WHERE id = $1', [project_id]);
    const project = projectRes.rows[0];
    if (project.created_by === req.user.id) {
      return res.status(400).json(formatResponse(false, null, 'Project leads cannot leave their own project directly. Delete the project instead.'));
    }

    await client.query('BEGIN');

    await client.query('DELETE FROM team_members WHERE project_id = $1 AND user_id = $2', [project_id, req.user.id]);

    const openRoles = parseJSON(project.open_roles, []);
    const updatedRoles = openRoles.map(r => {
      if (r.role === isMember.role && r.filled_by === req.user.name) {
        return { ...r, filled_by: null };
      }
      return r;
    });

    await client.query('UPDATE projects SET open_roles = $1 WHERE id = $2', [JSON.stringify(updatedRoles), project_id]);

    if (project.status === 'active') {
      await client.query("UPDATE projects SET status = 'forming', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [project_id]);
      
      await logAudit({
        entityType: 'project',
        entityId: project_id,
        action: 'UPDATE_STATUS',
        oldStatus: 'active',
        newStatus: 'forming',
        performedBy: req.user.id,
        metadata: { note: 'Teammate left, re-opened role.' }
      });
    }

    await client.query(`
      INSERT INTO notifications (id, user_id, type, title, message, link)
      VALUES ($1, $2, 'team_left', 'Teammate Left Project', $3, $4)
    `, [
      uuidv4(),
      project.created_by,
      `${req.user.name} has left your project. The "${isMember.role}" role is now re-opened.`,
      '/workspace'
    ]);

    await client.query('COMMIT');
    res.json(formatResponse(true, null, 'You have left the project successfully'));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Leave project error:', error);
    res.status(500).json(formatResponse(false, null, 'Error leaving project'));
  } finally {
    client.release();
  }
});

export default router;
