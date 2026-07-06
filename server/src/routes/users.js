import express from 'express';
import PDFDocument from 'pdfkit';
import pool from '../config/database.js';
import auth, { requireRole } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import { formatResponse, sanitizeUser, parseJSON } from '../utils/helpers.js';
import { logAudit } from '../utils/auditLog.js';
import { sendOtpEmail } from '../utils/mailer.js';

const router = express.Router();

// Get profile
router.get('/profile', auth, async (req, res) => {
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    res.json(formatResponse(true, sanitizeUser(userResult.rows[0])));
  } catch (error) {
    res.status(500).json(formatResponse(false, null, 'Error fetching profile'));
  }
});

// Update profile basic info
router.put('/profile', auth, async (req, res) => {
  const {
    name,
    email,
    avatar_url,
    bio,
    college,
    skills,
    interests,
    company,
    designation,
    graduation_year,
    linkedin_url,
    github_url
  } = req.body;

  try {
    const updates = [];
    const values = [];
    let paramIdx = 1;

    if (name !== undefined) { updates.push(`name = $${paramIdx++}`); values.push(name); }
    if (avatar_url !== undefined) { updates.push(`avatar_url = $${paramIdx++}`); values.push(avatar_url); }
    if (bio !== undefined) { updates.push(`bio = $${paramIdx++}`); values.push(bio); }
    if (college !== undefined) { updates.push(`college = $${paramIdx++}`); values.push(college); }
    if (skills !== undefined) { updates.push(`skills = $${paramIdx++}`); values.push(JSON.stringify(skills)); }
    if (interests !== undefined) { updates.push(`interests = $${paramIdx++}`); values.push(JSON.stringify(interests)); }
    if (company !== undefined) { updates.push(`company = $${paramIdx++}`); values.push(company); }
    if (designation !== undefined) { updates.push(`designation = $${paramIdx++}`); values.push(designation); }
    if (graduation_year !== undefined) { updates.push(`graduation_year = $${paramIdx++}`); values.push(graduation_year ? Number(graduation_year) : null); }
    if (linkedin_url !== undefined) { updates.push(`linkedin_url = $${paramIdx++}`); values.push(linkedin_url); }
    if (github_url !== undefined) { updates.push(`github_url = $${paramIdx++}`); values.push(github_url); }

    if (updates.length === 0) {
      return res.status(400).json(formatResponse(false, null, 'No fields provided for update'));
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.user.id);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIdx}`;
    await pool.query(query, values);

    const updatedResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    res.json(formatResponse(true, sanitizeUser(updatedResult.rows[0]), 'Profile updated successfully'));
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json(formatResponse(false, null, 'Error updating profile'));
  }
});

// Update settings and preferences JSONB
router.put('/settings', auth, async (req, res) => {
  const { settings, college, graduation_year, branch, cgpa, company, designation } = req.body;

  try {
    const updates = [];
    const values = [];
    let paramIdx = 1;

    if (settings !== undefined) {
      updates.push(`settings = $${paramIdx++}`);
      values.push(JSON.stringify(settings));
    }
    if (college !== undefined) {
      updates.push(`college = $${paramIdx++}`);
      values.push(college);
    }
    if (graduation_year !== undefined) {
      updates.push(`graduation_year = $${paramIdx++}`);
      values.push(graduation_year ? Number(graduation_year) : null);
    }
    if (branch !== undefined) {
      updates.push(`branch = $${paramIdx++}`);
      values.push(branch);
    }
    if (cgpa !== undefined) {
      updates.push(`cgpa = $${paramIdx++}`);
      values.push(cgpa);
    }
    if (company !== undefined) {
      updates.push(`company = $${paramIdx++}`);
      values.push(company);
    }
    if (designation !== undefined) {
      updates.push(`designation = $${paramIdx++}`);
      values.push(designation);
    }

    if (updates.length === 0) {
      return res.status(400).json(formatResponse(false, null, 'No update fields provided'));
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.user.id);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIdx}`;
    await pool.query(query, values);

    const updatedResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    res.json(formatResponse(true, sanitizeUser(updatedResult.rows[0]), 'Settings updated successfully'));
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json(formatResponse(false, null, 'Error updating settings'));
  }
});

// Upload Default Resume (Student Only)
router.post('/settings/resume', auth, requireRole('student'), upload.single('resume'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json(formatResponse(false, null, 'No resume file uploaded'));
  }

  const resumePath = `/uploads/${req.file.filename}`;

  try {
    await pool.query(`
      UPDATE users 
      SET default_resume_path = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `, [resumePath, req.user.id]);

    res.json(formatResponse(true, { resumePath }, 'Default resume uploaded successfully'));
  } catch (error) {
    console.error('Upload default resume error:', error);
    res.status(500).json(formatResponse(false, null, 'Error uploading default resume'));
  }
});

// Upload Profile Avatar (Student & Alumni)
router.post('/profile/avatar', auth, upload.single('avatar'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json(formatResponse(false, null, 'No avatar file uploaded'));
  }

  const avatarUrl = `/uploads/${req.file.filename}`;

  try {
    await pool.query(`
      UPDATE users 
      SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `, [avatarUrl, req.user.id]);

    res.json(formatResponse(true, { avatarUrl }, 'Profile photo updated successfully'));
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json(formatResponse(false, null, 'Error uploading profile photo'));
  }
});

// Request Email Change (Generates OTP and sends to new email)
router.post('/profile/change-email-request', auth, async (req, res) => {
  const { newEmail } = req.body;
  if (!newEmail) {
    return res.status(400).json(formatResponse(false, null, 'New email address is required'));
  }

  const normalizedEmail = newEmail.toLowerCase().trim();
  
  if (normalizedEmail === req.user.email) {
    return res.status(400).json(formatResponse(false, null, 'New email must be different from your current email'));
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      return res.status(400).json(formatResponse(false, null, 'Email is already registered by another account'));
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    const userResult = await pool.query('SELECT settings FROM users WHERE id = $1', [req.user.id]);
    const settings = userResult.rows[0]?.settings || {};

    const updatedSettings = {
      ...settings,
      pending_email_change: {
        new_email: normalizedEmail,
        otp,
        expiry: expiry.toISOString()
      }
    };

    await pool.query('UPDATE users SET settings = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [
      JSON.stringify(updatedSettings),
      req.user.id
    ]);

    await sendOtpEmail(normalizedEmail, otp);

    res.json(formatResponse(true, null, 'Verification OTP sent to your new email address'));
  } catch (error) {
    console.error('Request email change error:', error);
    res.status(500).json(formatResponse(false, null, 'Error requesting email change'));
  }
});

// Verify Email Change (Validates OTP and updates database email column)
router.post('/profile/verify-email-change', auth, async (req, res) => {
  const { otp } = req.body;
  if (!otp) {
    return res.status(400).json(formatResponse(false, null, 'Verification OTP is required'));
  }

  try {
    const userResult = await pool.query('SELECT settings FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];
    const settings = user?.settings || {};
    const pending = settings.pending_email_change;

    if (!pending) {
      return res.status(400).json(formatResponse(false, null, 'No pending email change request found'));
    }

    if (new Date() > new Date(pending.expiry)) {
      return res.status(400).json(formatResponse(false, null, 'Verification OTP has expired. Please request again.'));
    }

    if (pending.otp !== otp.toString().trim()) {
      return res.status(400).json(formatResponse(false, null, 'Invalid verification OTP'));
    }

    const newEmail = pending.new_email;

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [newEmail]);
    if (existing.rows.length > 0) {
      return res.status(400).json(formatResponse(false, null, 'Email was registered by another account while pending'));
    }

    const updatedSettings = { ...settings };
    delete updatedSettings.pending_email_change;

    await pool.query('UPDATE users SET email = $1, settings = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [
      newEmail,
      JSON.stringify(updatedSettings),
      req.user.id
    ]);

    const updatedUserRes = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    res.json(formatResponse(true, sanitizeUser(updatedUserRes.rows[0]), 'Email address updated successfully'));
  } catch (error) {
    console.error('Verify email change error:', error);
    res.status(500).json(formatResponse(false, null, 'Error verifying email change'));
  }
});

// Get public profile
router.get('/:id/public', async (req, res) => {
  const { id } = req.params;

  try {
    const userResult = await pool.query(`
      SELECT id, name, avatar_url, bio, college, skills, role, company, designation, graduation_year, linkedin_url, github_url, verification_status, created_at, settings 
      FROM users WHERE id = $1 AND is_active = true
    `, [id]);
    const user = userResult.rows[0];
    
    if (!user) {
      return res.status(404).json(formatResponse(false, null, 'User not found or profile deactivated'));
    }

    const userSettings = parseJSON(user.settings, {});
    const privacy = userSettings.privacy || {};
    
    if (privacy.profile_visibility === 'private') {
      return res.status(403).json(formatResponse(false, null, 'This profile is set to private'));
    }

    const sanitized = {
      ...user,
      skills: privacy.show_skills !== false ? parseJSON(user.skills, []) : [],
      settings: undefined
    };

    if (user.role === 'alumni') {
      const postedRes = await pool.query('SELECT COUNT(*) as count FROM referrals WHERE posted_by = $1', [id]);
      const postedCount = parseInt(postedRes.rows[0].count, 10);
      
      const completedRes = await pool.query(`
        SELECT COUNT(*) as count 
        FROM referrals 
        WHERE posted_by = $1 AND status = 'closed'
      `, [id]);
      const completedCount = parseInt(completedRes.rows[0].count, 10);

      const ratingsRes = await pool.query('SELECT AVG(score) as avg, COUNT(*) as count FROM ratings WHERE alumni_id = $1', [id]);
      const ratings = ratingsRes.rows[0];
      
      sanitized.stats = {
        referrals_posted: postedCount,
        referrals_completed: completedCount,
        average_response_time: '24 hours',
        student_rating: ratings.avg ? Math.round(parseFloat(ratings.avg) * 10) / 10 : 5.0,
        ratings_count: parseInt(ratings.count, 10)
      };
    }

    res.json(formatResponse(true, sanitized));
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json(formatResponse(false, null, 'Error fetching profile'));
  }
});

// Submit Verification Proof (Alumni Only)
router.put('/verification', auth, requireRole('alumni'), upload.single('proof'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json(formatResponse(false, null, 'Verification proof file is required'));
  }

  const proofPath = `/uploads/${req.file.filename}`;

  try {
    await pool.query(`
      UPDATE users 
      SET verification_status = 'pending', verification_proof = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `, [proofPath, req.user.id]);

    await logAudit({
      entityType: 'user',
      entityId: req.user.id,
      action: 'SUBMIT_VERIFICATION',
      oldStatus: 'unverified',
      newStatus: 'pending',
      performedBy: req.user.id,
      metadata: { file: req.file.filename }
    });

    const updatedResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    res.json(formatResponse(true, sanitizeUser(updatedResult.rows[0]), 'Verification proof submitted successfully'));
  } catch (error) {
    console.error('Submit verification error:', error);
    res.status(500).json(formatResponse(false, null, 'Error submitting verification'));
  }
});

// Temporary Account Deactivation
router.post('/deactivate', auth, async (req, res) => {
  try {
    await pool.query('UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [req.user.id]);

    await logAudit({
      entityType: 'user',
      entityId: req.user.id,
      action: 'DEACTIVATE_ACCOUNT',
      oldStatus: 'active',
      newStatus: 'inactive',
      performedBy: req.user.id
    });

    res.json(formatResponse(true, null, 'Account deactivated successfully'));
  } catch (error) {
    console.error('Deactivate account error:', error);
    res.status(500).json(formatResponse(false, null, 'Error deactivating account'));
  }
});

// Get deletion loss info counts
router.get('/deletion-info', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const teamMembersCount = await pool.query('SELECT COUNT(*) FROM team_members WHERE user_id = $1', [userId]);
    const teamAppsCount = await pool.query('SELECT COUNT(*) FROM team_applications WHERE student_id = $1', [userId]);
    const referralAppsCount = await pool.query('SELECT COUNT(*) FROM referral_applications WHERE student_id = $1', [userId]);
    const referralsCount = await pool.query('SELECT COUNT(*) FROM referrals WHERE posted_by = $1', [userId]);
    
    res.json(formatResponse(true, {
      teams: parseInt(teamMembersCount.rows[0].count, 10),
      teamApplications: parseInt(teamAppsCount.rows[0].count, 10),
      referralApplications: parseInt(referralAppsCount.rows[0].count, 10),
      referralsPosted: parseInt(referralsCount.rows[0].count, 10)
    }));
  } catch (error) {
    console.error('Get deletion info error:', error);
    res.status(500).json(formatResponse(false, null, 'Error fetching deletion details'));
  }
});

// Permanent Account Deletion
router.delete('/delete', auth, async (req, res) => {
  const { confirmation } = req.body;

  if (confirmation !== 'DELETE') {
    return res.status(400).json(formatResponse(false, null, 'Confirmation mismatch. Must enter "DELETE" to delete account.'));
  }

  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.user.id]);

    await logAudit({
      entityType: 'user',
      entityId: req.user.id,
      action: 'DELETE_ACCOUNT',
      performedBy: req.user.id
    });

    res.json(formatResponse(true, null, 'Account permanently deleted'));
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json(formatResponse(false, null, 'Error deleting account'));
  }
});

// Change User Role Warning Flow
router.post('/change-role', auth, async (req, res) => {
  const { targetRole } = req.body;
  if (targetRole !== 'student' && targetRole !== 'alumni') {
    return res.status(400).json(formatResponse(false, null, 'Invalid target role selected'));
  }

  try {
    const userId = req.user.id;
    
    const defaultSettings = targetRole === 'student' ? {
      privacy: { profile_visibility: 'public', portfolio_visible: true, show_skills: true },
      student_preferences: { job_type: 'both', locations: [], work_mode: 'both', skills_auto_filter: false }
    } : {
      privacy: { profile_visibility: 'public', portfolio_visible: true, show_skills: true },
      alumni_defaults: { default_slots: 1, default_deadline_days: 30, auto_close: true }
    };

    await pool.query(`
      UPDATE users 
      SET role = $1, 
          verification_status = 'unverified', 
          verification_proof = NULL,
          default_resume_path = NULL,
          college = NULL,
          graduation_year = NULL,
          branch = NULL,
          cgpa = NULL,
          company = NULL,
          designation = NULL,
          settings = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [targetRole, JSON.stringify(defaultSettings), userId]);

    await logAudit({
      entityType: 'user',
      entityId: userId,
      action: 'CHANGE_ROLE',
      oldStatus: req.user.role,
      newStatus: targetRole,
      performedBy: userId
    });

    const updatedUserRes = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    res.json(formatResponse(true, sanitizeUser(updatedUserRes.rows[0]), 'Role changed successfully'));
  } catch (error) {
    console.error('Change role error:', error);
    res.status(500).json(formatResponse(false, null, 'Error changing role'));
  }
});

// GDPR Compliance Data Export (Download own data in PDF format)
router.get('/export-data', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. Fetch User profile details
    const profileRes = await pool.query(`
      SELECT id, email, role, name, college, skills, interests, company, designation, graduation_year, linkedin_url, github_url, verification_status, created_at, default_resume_path, settings 
      FROM users WHERE id = $1
    `, [userId]);
    const profile = profileRes.rows[0];

    // 2. Fetch Projects created
    const projectsRes = await pool.query('SELECT * FROM projects WHERE created_by = $1', [userId]);

    // 3. Fetch Team Memberships
    const membershipsRes = await pool.query('SELECT * FROM team_members WHERE user_id = $1', [userId]);

    // 4. Fetch Submitted applications
    const teamAppsRes = await pool.query('SELECT * FROM team_applications WHERE student_id = $1', [userId]);

    // 5. Fetch Referrals posted
    const referralsRes = await pool.query('SELECT * FROM referrals WHERE posted_by = $1', [userId]);

    // 6. Fetch Referral applications
    const referralAppsRes = await pool.query('SELECT * FROM referral_applications WHERE student_id = $1', [userId]);

    // 7. Fetch Notifications
    const notificationsRes = await pool.query('SELECT * FROM notifications WHERE user_id = $1', [userId]);

    // 8. Fetch Audit Logs
    const auditLogsRes = await pool.query('SELECT * FROM audit_log WHERE performed_by = $1', [userId]);

    // Create a PDF Document
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers for PDF download
    res.setHeader('Content-disposition', `attachment; filename=arch_data_export_${userId}.pdf`);
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    // Title Section
    doc.fontSize(24).font('Helvetica-Bold').text('Arch Data Export Report', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    // Profile Details
    doc.fontSize(16).font('Helvetica-Bold').text('User Profile Info');
    doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    doc.fontSize(11).font('Helvetica-Bold').text('User ID: ', { continued: true }).font('Helvetica').text(profile.id);
    doc.font('Helvetica-Bold').text('Name: ', { continued: true }).font('Helvetica').text(profile.name);
    doc.font('Helvetica-Bold').text('Email Address: ', { continued: true }).font('Helvetica').text(profile.email);
    doc.font('Helvetica-Bold').text('Role Classification: ', { continued: true }).font('Helvetica').text(profile.role.toUpperCase());
    doc.font('Helvetica-Bold').text('College / University: ', { continued: true }).font('Helvetica').text(profile.college || 'N/A');
    doc.font('Helvetica-Bold').text('Graduation Year: ', { continued: true }).font('Helvetica').text(profile.graduation_year || 'N/A');
    
    if (profile.role === 'alumni') {
      doc.font('Helvetica-Bold').text('Company: ', { continued: true }).font('Helvetica').text(profile.company || 'N/A');
      doc.font('Helvetica-Bold').text('Designation: ', { continued: true }).font('Helvetica').text(profile.designation || 'N/A');
      doc.font('Helvetica-Bold').text('Verification Status: ', { continued: true }).font('Helvetica').text(profile.verification_status.toUpperCase());
    }

    doc.font('Helvetica-Bold').text('Account Created At: ', { continued: true }).font('Helvetica').text(new Date(profile.created_at).toLocaleString());
    doc.moveDown(1.5);

    // Projects Created
    doc.fontSize(16).font('Helvetica-Bold').text(`Projects Created (${projectsRes.rows.length})`);
    doc.strokeColor('#cccccc').moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    if (projectsRes.rows.length === 0) {
      doc.fontSize(10).font('Helvetica-Oblique').text('No projects created yet.');
    } else {
      projectsRes.rows.forEach((p, idx) => {
        doc.fontSize(11).font('Helvetica-Bold').text(`${idx + 1}. ${p.title} (${p.status.toUpperCase()})`);
        doc.fontSize(10).font('Helvetica').text(`Description: ${p.description}`);
        doc.fontSize(10).text(`Technologies: ${p.technologies}`);
        doc.moveDown(0.5);
      });
    }
    doc.moveDown(1);

    // Team memberships
    doc.fontSize(16).font('Helvetica-Bold').text(`Team Memberships (${membershipsRes.rows.length})`);
    doc.strokeColor('#cccccc').moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    if (membershipsRes.rows.length === 0) {
      doc.fontSize(10).font('Helvetica-Oblique').text('Not a member of any project teams.');
    } else {
      membershipsRes.rows.forEach((m, idx) => {
        doc.fontSize(11).font('Helvetica-Bold').text(`${idx + 1}. Team ID: ${m.team_id} (Role: ${m.role || 'Member'})`);
        doc.fontSize(10).font('Helvetica').text(`Joined on: ${new Date(m.created_at).toLocaleString()}`);
        doc.moveDown(0.5);
      });
    }
    doc.moveDown(1);

    // Team Applications
    doc.fontSize(16).font('Helvetica-Bold').text(`Project Team Applications Submitted (${teamAppsRes.rows.length})`);
    doc.strokeColor('#cccccc').moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    if (teamAppsRes.rows.length === 0) {
      doc.fontSize(10).font('Helvetica-Oblique').text('No team applications submitted.');
    } else {
      teamAppsRes.rows.forEach((a, idx) => {
        doc.fontSize(11).font('Helvetica-Bold').text(`${idx + 1}. Project Title: ${a.project_title || 'Project'} (Status: ${a.status.toUpperCase()})`);
        doc.fontSize(10).font('Helvetica').text(`Applied Role: ${a.role || 'Any'} | Pitch: ${a.pitch || 'None'}`);
        doc.moveDown(0.5);
      });
    }
    doc.moveDown(1);

    // Referrals Posted (if alumni)
    if (profile.role === 'alumni') {
      doc.fontSize(16).font('Helvetica-Bold').text(`Referral Openings Posted (${referralsRes.rows.length})`);
      doc.strokeColor('#cccccc').moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
      if (referralsRes.rows.length === 0) {
        doc.fontSize(10).font('Helvetica-Oblique').text('No referral openings posted.');
      } else {
        referralsRes.rows.forEach((r, idx) => {
          doc.fontSize(11).font('Helvetica-Bold').text(`${idx + 1}. Company: ${r.company} | Title: ${r.title} (${r.status.toUpperCase()})`);
          doc.fontSize(10).font('Helvetica').text(`Slots: ${r.remaining_slots}/${r.total_slots} | Link: ${r.job_link || 'None'}`);
          doc.moveDown(0.5);
        });
      }
      doc.moveDown(1);
    }

    // Referral Applications (if student)
    if (profile.role === 'student') {
      doc.fontSize(16).font('Helvetica-Bold').text(`Referral Applications Submitted (${referralAppsRes.rows.length})`);
      doc.strokeColor('#cccccc').moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
      if (referralAppsRes.rows.length === 0) {
        doc.fontSize(10).font('Helvetica-Oblique').text('No referral applications submitted.');
      } else {
        referralAppsRes.rows.forEach((ra, idx) => {
          doc.fontSize(11).font('Helvetica-Bold').text(`${idx + 1}. Company: ${ra.company} | Title: ${ra.title} (Status: ${ra.status.toUpperCase()})`);
          doc.fontSize(10).font('Helvetica').text(`Applied on: ${new Date(ra.created_at).toLocaleString()} | Notes: ${ra.notes || 'None'}`);
          doc.moveDown(0.5);
        });
      }
      doc.moveDown(1);
    }

    // Audit logs performed
    doc.fontSize(16).font('Helvetica-Bold').text(`Audit Logs History (${auditLogsRes.rows.length})`);
    doc.strokeColor('#cccccc').moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    if (auditLogsRes.rows.length === 0) {
      doc.fontSize(10).font('Helvetica-Oblique').text('No log activity found.');
    } else {
      auditLogsRes.rows.slice(0, 20).forEach((l, idx) => {
        doc.fontSize(10).font('Helvetica').text(`${idx + 1}. [${new Date(l.created_at).toLocaleString()}] Action: ${l.action} | Entity: ${l.entity_type}`);
      });
      if (auditLogsRes.rows.length > 20) {
        doc.fontSize(10).font('Helvetica-Oblique').text(`... and ${auditLogsRes.rows.length - 20} more logs`);
      }
    }

    // End and send the PDF document
    doc.end();
  } catch (error) {
    console.error('GDPR Data export error:', error);
    res.status(500).json(formatResponse(false, null, 'Error generating PDF data export'));
  }
});

export default router;
