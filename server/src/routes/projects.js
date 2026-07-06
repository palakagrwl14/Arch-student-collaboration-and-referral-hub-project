import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import auth from '../middleware/auth.js';
import validateRequest from '../middleware/validate.js';
import { formatResponse, parseJSON } from '../utils/helpers.js';
import { logAudit } from '../utils/auditLog.js';

const router = express.Router();

const projectSchema = {
  body: {
    title: { required: true, minLength: 3 },
    description: { required: true },
    skills_required: { required: true, type: 'array' },
    open_roles: { required: true, type: 'array' },
    team_size: { required: true, type: 'number' }
  }
};

// GET /api/projects
router.get('/', async (req, res) => {
  const { search, skill, status } = req.query;
  
  try {
    let query = 'SELECT p.*, u.name as creator_name, u.avatar_url as creator_avatar FROM projects p JOIN users u ON p.created_by = u.id';
    const conditions = [];
    const values = [];
    let paramIdx = 1;

    if (status) {
      conditions.push(`p.status = $${paramIdx++}`);
      values.push(status);
    } else {
      conditions.push("p.status IN ('open', 'forming')");
    }

    if (search) {
      conditions.push(`(p.title ILIKE $${paramIdx++} OR p.description ILIKE $${paramIdx++})`);
      values.push(`%${search}%`);
      values.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY p.created_at DESC';

    const result = await pool.query(query, values);
    const projects = result.rows;

    const formatted = projects.map(p => ({
      ...p,
      skills_required: parseJSON(p.skills_required, []),
      open_roles: parseJSON(p.open_roles, [])
    }));

    let filtered = formatted;
    if (skill) {
      filtered = formatted.filter(p => 
        p.skills_required.some(s => s.toLowerCase().includes(skill.toLowerCase()))
      );
    }

    res.json(formatResponse(true, filtered));
  } catch (error) {
    console.error('Fetch projects error:', error);
    res.status(500).json(formatResponse(false, null, 'Error fetching projects'));
  }
});

// GET /api/projects/my-teams
router.get('/my-teams', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, tm.role as my_role
      FROM projects p
      JOIN team_members tm ON p.id = tm.project_id
      WHERE tm.user_id = $1
      ORDER BY p.updated_at DESC
    `, [req.user.id]);

    const formatted = result.rows.map(p => ({
      ...p,
      skills_required: parseJSON(p.skills_required, []),
      open_roles: parseJSON(p.open_roles, [])
    }));

    res.json(formatResponse(true, formatted));
  } catch (error) {
    console.error('Fetch my-teams error:', error);
    res.status(500).json(formatResponse(false, null, 'Error fetching teams'));
  }
});

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const projectResult = await pool.query(`
      SELECT p.*, u.name as creator_name, u.avatar_url as creator_avatar 
      FROM projects p 
      JOIN users u ON p.created_by = u.id 
      WHERE p.id = $1
    `, [id]);
    const project = projectResult.rows[0];

    if (!project) {
      return res.status(404).json(formatResponse(false, null, 'Project not found'));
    }

    const membersResult = await pool.query(`
      SELECT tm.role, u.id, u.name, u.email, u.avatar_url, u.college
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.project_id = $1
    `, [id]);

    const formatted = {
      ...project,
      skills_required: parseJSON(project.skills_required, []),
      open_roles: parseJSON(project.open_roles, []),
      members: membersResult.rows
    };

    res.json(formatResponse(true, formatted));
  } catch (error) {
    console.error('Fetch project details error:', error);
    res.status(500).json(formatResponse(false, null, 'Error fetching project details'));
  }
});

// POST /api/projects
router.post('/', auth, validateRequest(projectSchema), async (req, res) => {
  const { title, description, skills_required, open_roles, team_size } = req.body;
  const projectId = uuidv4();

  try {
    await pool.query(`
      INSERT INTO projects (id, title, description, skills_required, open_roles, team_size, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, 'forming', $7)
    `, [
      projectId,
      title,
      description,
      JSON.stringify(skills_required),
      JSON.stringify(open_roles),
      team_size,
      req.user.id
    ]);

    await pool.query(`
      INSERT INTO team_members (id, project_id, user_id, role)
      VALUES ($1, $2, $3, 'Project Lead')
    `, [uuidv4(), projectId, req.user.id]);

    await logAudit({
      entityType: 'project',
      entityId: projectId,
      action: 'CREATE_PROJECT',
      newStatus: 'forming',
      performedBy: req.user.id
    });

    res.status(201).json(formatResponse(true, { id: projectId }, 'Project created successfully'));
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json(formatResponse(false, null, 'Error creating project'));
  }
});

// PUT /api/projects/:id
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { title, description, skills_required, open_roles, team_size, status } = req.body;

  try {
    const projectResult = await pool.query('SELECT created_by, status FROM projects WHERE id = $1', [id]);
    const project = projectResult.rows[0];
    if (!project) {
      return res.status(404).json(formatResponse(false, null, 'Project not found'));
    }

    if (project.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json(formatResponse(false, null, 'Only project lead can edit project details'));
    }

    const updates = [];
    const values = [];
    let paramIdx = 1;

    if (title !== undefined) { updates.push(`title = $${paramIdx++}`); values.push(title); }
    if (description !== undefined) { updates.push(`description = $${paramIdx++}`); values.push(description); }
    if (skills_required !== undefined) { updates.push(`skills_required = $${paramIdx++}`); values.push(JSON.stringify(skills_required)); }
    if (open_roles !== undefined) { updates.push(`open_roles = $${paramIdx++}`); values.push(JSON.stringify(open_roles)); }
    if (team_size !== undefined) { updates.push(`team_size = $${paramIdx++}`); values.push(team_size); }
    
    let oldStatus = project.status;
    let newStatus = oldStatus;
    if (status !== undefined) { 
      updates.push(`status = $${paramIdx++}`); 
      values.push(status);
      newStatus = status;
    }

    if (updates.length === 0) {
      return res.status(400).json(formatResponse(false, null, 'No fields provided for update'));
    }

    values.push(id); // For the WHERE clause id

    const query = `UPDATE projects SET ${updates.join(', ')} WHERE id = $${paramIdx}`;
    await pool.query(query, values);

    if (oldStatus !== newStatus) {
      await logAudit({
        entityType: 'project',
        entityId: id,
        action: 'UPDATE_STATUS',
        oldStatus,
        newStatus,
        performedBy: req.user.id
      });

      if (newStatus === 'completed') {
        const membersResult = await pool.query('SELECT user_id, role FROM team_members WHERE project_id = $1', [id]);
        const members = membersResult.rows;

        for (const m of members) {
          const userResult = await pool.query('SELECT skills FROM users WHERE id = $1', [m.user_id]);
          const user = userResult.rows[0];
          const userSkills = parseJSON(user?.skills, []);
          
          let projectSkillsString = skills_required;
          if (projectSkillsString === undefined) {
            const currentProj = await pool.query('SELECT skills_required FROM projects WHERE id = $1', [id]);
            projectSkillsString = currentProj.rows[0].skills_required;
          }
          const projectSkills = parseJSON(projectSkillsString, []);
          const skillsUsed = projectSkills.filter(s => userSkills.includes(s));

          // INSERT OR IGNORE in PG (using ON CONFLICT DO NOTHING)
          await pool.query(`
            INSERT INTO portfolio_entries (id, student_id, project_id, role_played, contribution_notes, skills_used, completed_at, verified)
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, true)
            ON CONFLICT (student_id, project_id) DO NOTHING
          `, [
            uuidv4(),
            m.user_id,
            id,
            m.role || 'Teammate',
            `Collaborated as ${m.role || 'Teammate'} on the completed project.`,
            JSON.stringify(skillsUsed)
          ]);
        }
      }
    }

    res.json(formatResponse(true, null, 'Project updated successfully'));
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json(formatResponse(false, null, 'Error updating project'));
  }
});

export default router;
