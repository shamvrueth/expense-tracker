import pkg from 'pg';
const { Pool } = pkg;
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function setupDatabase() {
  const pool = new Pool({
    host: process.env.MYSQL_DB_HOST,
    user: process.env.MYSQL_DB_USER,
    password: process.env.MYSQL_DB_PASSWORD,
    database: process.env.MYSQL_DB_NAME,
    port: 5432
  });

  try {
    // Drop existing tables in the correct order
    await pool.query(`
      DROP TABLE IF EXISTS EmailOtps CASCADE;
      DROP TABLE IF EXISTS Notifications CASCADE;
      DROP TABLE IF EXISTS Expenses CASCADE;
      DROP TABLE IF EXISTS Budgets CASCADE;
      DROP TABLE IF EXISTS Expense_Types CASCADE;
      DROP TABLE IF EXISTS Users CASCADE;
    `);
    
    console.log('✅ Existing tables dropped successfully');

    // Read the schema file
    const schemaSQL = await fs.readFile(join(__dirname, 'schema.sql'), 'utf8');
    
    // Execute the schema
    await pool.query(schemaSQL);
    
    console.log('✅ Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    await pool.end();
  }
}

setupDatabase();