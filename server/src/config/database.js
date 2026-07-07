import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Connection string sourced from environment variables (Neon/Render/AWS or local PG)
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Palak14@localhost:5432/CampusCollab';

const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

// Verify Connection
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error connecting to PostgreSQL database:', err.stack);
  }
  console.log('Successfully connected to PostgreSQL Database.');
  release();
});

export default pool;