import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';

export async function logAudit({ entityType, entityId, action, oldStatus, newStatus, performedBy, metadata = {} }) {
  try {
    const query = `
      INSERT INTO audit_log (id, entity_type, entity_id, action, old_status, new_status, performed_by, metadata) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    await pool.query(query, [
      uuidv4(), 
      entityType, 
      entityId, 
      action, 
      oldStatus || null, 
      newStatus || null, 
      performedBy || null, 
      JSON.stringify(metadata)
    ]);
  } catch (error) {
    console.error('Audit logging failed:', error);
  }
}
