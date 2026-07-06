import jwt from 'jsonwebtoken';

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'campuscollab-secret-key-dev',
    { expiresIn: '7d' }
  );
}

export function parseJSON(str, fallback = []) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch (error) {
    return fallback;
  }
}

export function formatResponse(success, data = null, message = '') {
  return { success, data, message };
}

export function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, ...sanitized } = user;
  
  // Parse JSON fields
  sanitized.skills = parseJSON(sanitized.skills, []);
  sanitized.interests = parseJSON(sanitized.interests, []);
  
  return sanitized;
}
