import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';
import pool from '../config/database.js';
import auth from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import validateRequest from '../middleware/validate.js';
import { generateToken, sanitizeUser, formatResponse } from '../utils/helpers.js';
import { sendOtpEmail } from '../utils/mailer.js';

const router = express.Router();

const signupSchema = {
  body: {
    email: { required: true, type: 'email' },
    password: { required: true, minLength: 6 },
    name: { required: true, minLength: 2 },
    role: { required: true, enum: ['student', 'alumni'] }
  }
};

const loginSchema = {
  body: {
    email: { required: true, type: 'email' },
    password: { required: true }
  }
};

// Signup
router.post('/signup', authLimiter, validateRequest(signupSchema), async (req, res) => {
  const { email, password, name, role } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Check if email already exists
    const existingResult = await pool.query('SELECT id, is_email_verified FROM users WHERE email = $1', [normalizedEmail]);
    if (existingResult.rows.length > 0) {
      const existingUser = existingResult.rows[0];
      if (!existingUser.is_email_verified) {
        return res.status(400).json(formatResponse(false, { unverified: true, email: normalizedEmail }, 'Email registered but unverified. Please verify your email.'));
      }
      return res.status(400).json(formatResponse(false, null, 'Email already registered'));
    }

    const userId = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 12);
    const verificationStatus = role === 'alumni' ? 'unverified' : 'verified';

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(`
      INSERT INTO users (id, email, password_hash, role, name, verification_status, is_email_verified, email_otp, otp_expiry)
      VALUES ($1, $2, $3, $4, $5, $6, false, $7, $8)
    `, [userId, normalizedEmail, passwordHash, role, name, verificationStatus, otp, expiry]);

    await sendOtpEmail(normalizedEmail, otp);

    res.status(201).json(formatResponse(true, { email: normalizedEmail }, 'Signup successful. Verification OTP sent to your email.'));
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json(formatResponse(false, null, 'Internal server error during registration'));
  }
});

// Verify OTP
router.post('/verify-otp', authLimiter, async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json(formatResponse(false, null, 'Email and OTP code are required'));
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json(formatResponse(false, null, 'User not found'));
    }

    if (user.is_email_verified) {
      const token = generateToken(user);
      return res.json(formatResponse(true, {
        token,
        user: sanitizeUser(user)
      }, 'Email is already verified. Login successful.'));
    }

    if (user.email_otp !== otp) {
      return res.status(400).json(formatResponse(false, null, 'Invalid verification code'));
    }

    const otpExpired = new Date() > new Date(user.otp_expiry);
    if (otpExpired) {
      return res.status(400).json(formatResponse(false, null, 'Verification code has expired. Please request a new OTP.'));
    }

    await pool.query(`
      UPDATE users 
      SET is_email_verified = true, email_otp = NULL, otp_expiry = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [user.id]);

    const updatedUserRes = await pool.query('SELECT * FROM users WHERE id = $1', [user.id]);
    const updatedUser = updatedUserRes.rows[0];
    const token = generateToken(updatedUser);

    res.json(formatResponse(true, {
      token,
      user: sanitizeUser(updatedUser)
    }, 'Email verification successful! Account activated.'));
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json(formatResponse(false, null, 'Internal server error during OTP verification'));
  }
});

// Resend OTP
router.post('/resend-otp', authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json(formatResponse(false, null, 'Email is required'));
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json(formatResponse(false, null, 'User not found'));
    }

    if (user.is_email_verified) {
      return res.status(400).json(formatResponse(false, null, 'Email is already verified. Go to Login.'));
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(`
      UPDATE users 
      SET email_otp = $1, otp_expiry = $2, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $3
    `, [otp, expiry, user.id]);

    await sendOtpEmail(normalizedEmail, otp);

    res.json(formatResponse(true, null, 'A new verification code has been sent to your email address.'));
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json(formatResponse(false, null, 'Internal server error while resending OTP'));
  }
});

// Login
router.post('/login', authLimiter, validateRequest(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json(formatResponse(false, null, 'Invalid email or password'));
    }

    if (user.is_email_verified === false) {
      return res.status(403).json({
        success: false,
        code: 'EMAIL_UNVERIFIED',
        message: 'Please verify your email before logging in.',
        data: { email: normalizedEmail }
      });
    }

    const matches = bcrypt.compareSync(password, user.password_hash);
    if (!matches) {
      return res.status(401).json(formatResponse(false, null, 'Invalid email or password'));
    }

    // Auto-reactivate if deactivated
    if (user.is_active === false) {
      await pool.query('UPDATE users SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
      user.is_active = true;
    }

    const token = generateToken(user);

    res.json(formatResponse(true, {
      token,
      user: sanitizeUser(user)
    }, 'Login successful'));
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json(formatResponse(false, null, 'Internal server error during login'));
  }
});

// POST /google - Google SSO Authentication (Signup & Login)
router.post('/google', authLimiter, async (req, res) => {
  const { credential, role } = req.body;
  if (!credential) {
    return res.status(400).json(formatResponse(false, null, 'Google credential token is required'));
  }

  try {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    
    const email = payload.email.toLowerCase().trim();
    const name = payload.name;
    const avatarUrl = payload.picture;

    // Check if user exists
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let user = userResult.rows[0];

    if (!user) {
      const userId = uuidv4();
      const randomPassword = uuidv4(); // Google users authenticate via OAuth, password hash is a random placeholder
      const passwordHash = bcrypt.hashSync(randomPassword, 12);
      const verificationStatus = role === 'alumni' ? 'unverified' : 'verified';

      const defaultSettings = (role || 'student') === 'student' ? {
        is_sso: true,
        privacy: { profile_visibility: 'public', portfolio_visible: true, show_skills: true },
        student_preferences: { job_type: 'both', locations: [], work_mode: 'both', skills_auto_filter: false }
      } : {
        is_sso: true,
        privacy: { profile_visibility: 'public', portfolio_visible: true, show_skills: true },
        alumni_defaults: { default_slots: 1, default_deadline_days: 30, auto_close: true }
      };

      await pool.query(`
        INSERT INTO users (id, email, password_hash, role, name, avatar_url, verification_status, is_email_verified, settings)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
      `, [userId, email, passwordHash, role || 'student', name, avatarUrl, verificationStatus, JSON.stringify(defaultSettings)]);

      const newUserRes = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      user = newUserRes.rows[0];
    } else {
      if (!user.is_email_verified) {
        await pool.query('UPDATE users SET is_email_verified = true WHERE id = $1', [user.id]);
        user.is_email_verified = true;
      }
      if (user.is_active === false) {
        await pool.query('UPDATE users SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
        user.is_active = true;
      }
    }

    const token = generateToken(user);
    res.json(formatResponse(true, {
      token,
      user: sanitizeUser(user)
    }, 'Google authentication successful'));
  } catch (error) {
    console.error('Google Auth verification error:', error);
    res.status(400).json(formatResponse(false, null, 'Invalid Google authentication token'));
  }
});

// Get Current User (Me)
router.get('/me', auth, (req, res) => {
  res.json(formatResponse(true, req.user));
});

// Update Password
router.put('/update-password', auth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json(formatResponse(false, null, 'New password must be at least 6 characters'));
  }

  try {
    const userResult = await pool.query('SELECT password_hash, settings FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];

    const settings = user.settings || {};
    const isSsoUser = settings.is_sso === true;

    if (!isSsoUser) {
      if (!oldPassword) {
        return res.status(400).json(formatResponse(false, null, 'Current password is required'));
      }
      const matches = bcrypt.compareSync(oldPassword, user.password_hash);
      if (!matches) {
        return res.status(400).json(formatResponse(false, null, 'Incorrect current password'));
      }
    }

    const newHash = bcrypt.hashSync(newPassword, 12);
    
    // Disable is_sso flag since they now have a custom password
    const updatedSettings = { ...settings };
    delete updatedSettings.is_sso;

    await pool.query(`
      UPDATE users 
      SET password_hash = $1, settings = $2, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $3
    `, [newHash, JSON.stringify(updatedSettings), req.user.id]);

    res.json(formatResponse(true, null, 'Password updated successfully'));
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json(formatResponse(false, null, 'Internal server error'));
  }
});

// POST /auth/forgot-password (Generates reset OTP)
router.post('/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json(formatResponse(false, null, 'Email address is required'));
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
    const user = userResult.rows[0];

    if (!user) {
      // Security: Do not reveal user existence
      return res.json(formatResponse(true, null, 'If your email is registered, a password reset code has been sent.'));
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const settings = user.settings || {};
    const updatedSettings = {
      ...settings,
      password_reset: {
        otp,
        expiry: expiry.toISOString()
      }
    };

    await pool.query('UPDATE users SET settings = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [
      JSON.stringify(updatedSettings),
      user.id
    ]);

    await sendOtpEmail(normalizedEmail, otp);

    res.json(formatResponse(true, null, 'If your email is registered, a password reset code has been sent.'));
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json(formatResponse(false, null, 'Internal server error'));
  }
});

// POST /auth/reset-password (Verifies OTP and resets password)
router.post('/reset-password', authLimiter, async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword || newPassword.length < 6) {
    return res.status(400).json(formatResponse(false, null, 'Please fill all fields. Password must be at least 6 characters.'));
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(400).json(formatResponse(false, null, 'Invalid email or reset parameters'));
    }

    const settings = user.settings || {};
    const reset = settings.password_reset;

    if (!reset) {
      return res.status(400).json(formatResponse(false, null, 'No active password reset request found.'));
    }

    if (new Date() > new Date(reset.expiry)) {
      return res.status(400).json(formatResponse(false, null, 'Reset code has expired. Please request a new one.'));
    }

    if (reset.otp !== otp.toString().trim()) {
      return res.status(400).json(formatResponse(false, null, 'Invalid verification code'));
    }

    const newHash = bcrypt.hashSync(newPassword, 12);

    const updatedSettings = { ...settings };
    delete updatedSettings.password_reset;
    delete updatedSettings.is_sso; // If they set a password, they are no longer restricted to just SSO!

    await pool.query('UPDATE users SET password_hash = $1, settings = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [
      newHash,
      JSON.stringify(updatedSettings),
      user.id
    ]);

    res.json(formatResponse(true, null, 'Password reset successfully! You can now log in.'));
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json(formatResponse(false, null, 'Internal server error'));
  }
});

export default router;
