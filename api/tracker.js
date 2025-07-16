import { createClient } from '@libsql/client';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  // Google ID token verification
  let userId = null;
  let authHeader = req.headers['authorization'];
  if (Array.isArray(authHeader)) authHeader = authHeader[0];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.replace('Bearer ', '');
    try {
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

    // GET: List all assignments for the user
    if (req.method === 'GET') {
      const result = await db.execute({
        sql: 'SELECT * FROM assignments_tracker WHERE user_id = ? ORDER BY due_date ASC',
        args: [userId],
      });
      // Convert completed to boolean
      const rows = (result.rows || []).map(row => ({ ...row, completed: !!row.completed }));
      return res.status(200).json(rows);
    }

    // POST: Add a new assignment
    if (req.method === 'POST') {
      const { name, due_date, completed } = req.body;
      if (!name || !due_date) {
        return res.status(400).json({ error: 'Missing fields' });
      }
      const d = new Date(due_date);
      const formatted_due = `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}-${d.getFullYear()}`;
      const result = await db.execute({
        sql: 'INSERT INTO assignments_tracker (name, due_date, formatted_due, user_id, completed) VALUES (?, ?, ?, ?, ?) RETURNING *',
        args: [name, due_date, formatted_due, userId, completed ? 1 : 0],
      });
      const row = result.rows[0];
      row.completed = !!row.completed;
      return res.status(201).json(row);
    }

    // PATCH: Update an assignment (expects id, name, due_date in body)
    if (req.method === 'PATCH') {
      const { id, name, due_date, completed } = req.body;
      if (!id || !name || !due_date || typeof completed === 'undefined') {
        return res.status(400).json({ error: 'Missing fields' });
      }
      const d = new Date(due_date);
      const formatted_due = `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}-${d.getFullYear()}`;
      await db.execute({
        sql: 'UPDATE assignments_tracker SET name = ?, due_date = ?, formatted_due = ?, completed = ? WHERE id = ? AND user_id = ?',
        args: [name, due_date, formatted_due, completed ? 1 : 0, id, userId],
      });
      const updated = await db.execute({
        sql: 'SELECT * FROM assignments_tracker WHERE id = ? AND user_id = ?',
        args: [id, userId],
      });
      const row = updated.rows[0];
      row.completed = !!row.completed;
      return res.status(200).json(row);
    }

    // DELETE: Remove an assignment (expects id in body)
    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      await db.execute({
        sql: 'DELETE FROM assignments_tracker WHERE id = ? AND user_id = ?',
        args: [id, userId],
      });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}