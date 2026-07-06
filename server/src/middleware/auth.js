import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { sanitizeUser } from '../utils/helpers.js';

export default async function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'campuscollab-secret-key-dev');
    
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    const user = userResult.rows[0];
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    req.user = sanitizeUser(user);
    next();
  } catch (error) {
    console.error('JWT authentication middleware error:', error);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied: insufficient permissions' });
    }
    
    next();
  };
}

export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'campuscollab-secret-key-dev');
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    const user = userResult.rows[0];
    req.user = user ? sanitizeUser(user) : null;
  } catch (error) {
    req.user = null;
  }
  next();
}
