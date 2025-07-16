// POST: get all assignments for user, or add new assignment
import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_DB_TOKEN,
});

import { verifyGoogleToken } from './auth';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // Get all assignments for user
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'Missing token' });
    const user = await verifyGoogleToken(auth.split(' ')[1]);
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    const user_id = user.sub;
    const rows = await db.execute(
      'SELECT id, name, due_date, formatted_due FROM assignments_tracker WHERE user_id = ? ORDER BY due_date ASC',
      [user_id]
    );
    return res.json(rows.rows);
  } else if (req.method === 'PUT') {
    // Add new assignment
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'Missing token' });
    const user = await verifyGoogleToken(auth.split(' ')[1]);
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    const user_id = user.sub;
    const { name, due_date } = req.body;
    if (!name || !due_date) return res.status(400).json({ error: 'Missing fields' });
    // Format due date as MM-DD-YYYY
    const d = new Date(due_date);
    const formatted_due = `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}-${d.getFullYear()}`;
    const result = await db.execute(
      'INSERT INTO assignments_tracker (name, due_date, formatted_due, user_id) VALUES (?, ?, ?, ?)',
      [name, due_date, formatted_due, user_id]
    );
    return res.json({ id: result.lastInsertRowid, name, due_date, formatted_due, user_id });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
