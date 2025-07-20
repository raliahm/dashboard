import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function addAssignmentsTable() {
  try {
    // Create assignments table for tracking assignments, exams, and projects
    await db.execute(`
      CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        type TEXT NOT NULL, -- 'assignment', 'exam', 'project'
        description TEXT,
        due_date TEXT, -- ISO date string
        class_name TEXT,
        status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
        priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
        user_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ assignments table created successfully');

    // Verify the table exists
    const result = await db.execute('SELECT name FROM sqlite_master WHERE type="table" AND name="assignments"');
    if (result.rows.length > 0) {
      console.log('🎉 Table verification successful - assignments table exists');
    }
  } catch (error) {
    console.error('❌ Error creating assignments table:', error.message);
  }
}

addAssignmentsTable();
