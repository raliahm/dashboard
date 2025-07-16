import { createClient } from '@libsql/client';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Always disable caching for security
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  // Verify Google id_token from Authorization header
  let userId = null;
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.replace('Bearer ', '');
    try {
      // Verify with Google
      const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
      const googleData = await googleRes.json();
      if (googleData && googleData.sub) {
        userId = googleData.sub;
      }
    } catch (err) {
      // ignore, will fail below if userId not set
    }
  }

  try {
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // GET: fetch all assignments for the logged-in user
    if (req.method === 'GET') {
      const result = await db.execute({
        sql: 'SELECT * FROM assignments_tracker WHERE user_id = ? ORDER BY formatted_due ASC',
        args: [userId],
      });
      // Format due date for each assignment
      const rows = (result.rows || []).map(row => {
        let formatted_due = row.formatted_due;
        if (!formatted_due && row.due_date) {
          const d = new Date(row.due_date);
          formatted_due = `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}-${d.getFullYear()}`;
        }
        return { ...row, formatted_due };
      });
      return res.status(200).json(rows);
    }

    // POST: add a new assignment for the logged-in user
    if (req.method === 'POST') {
      const { name, due_date } = req.body;
      if (!name || !due_date) {
        return res.status(400).json({ error: 'Missing fields' });
      }
      const d = new Date(due_date);
      const formatted_due = `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}-${d.getFullYear()}`;
      const result = await db.execute({
        sql: 'INSERT INTO assignments_tracker (name, due_date, formatted_due, user_id) VALUES (?, ?, ?, ?) RETURNING *',
        args: [name, due_date, formatted_due, userId],
      });
      return res.status(201).json(result.rows[0]);
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}