// POST: get all assignments for user, or add new assignment
import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_DB_TOKEN,
});

import { verifyGoogleToken } from './auth';

export default async function handler(req, res) {
  console.log('--- Assignment Tracker handler called ---');
  try {
    const auth = req.headers.authorization;
    if (!auth) {
      console.log('No auth header');
      return res.status(401).json({ error: 'Missing token' });
    }
    const user = await verifyGoogleToken(auth.split(' ')[1]);
    if (!user) {
      console.log('Invalid token');
      return res.status(401).json({ error: 'Invalid token' });
    }
    const user_id = user.sub;
    if (req.method === 'GET') {
      console.log('GET method');
      const rows = await db.execute(
        'SELECT id, name, due_date, formatted_due FROM assignments_tracker WHERE user_id = ? ORDER BY due_date ASC',
        [user_id]
      );
      console.log('Fetched assignments:', rows.rows);
      return res.json(rows.rows);
    } else if (req.method === 'POST') {
      console.log('POST method');
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { console.log('Body parse error', e); body = {}; }
      }
      const { name, due_date } = body;
      console.log('POST body:', body);
      if (!name || !due_date) {
        console.log('Missing fields');
        return res.status(400).json({ error: 'Missing fields' });
      }
      const d = new Date(due_date);
      const formatted_due = `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}-${d.getFullYear()}`;
      console.log('Inserting assignment:', { name, due_date, formatted_due, user_id });
      const result = await db.execute(
        'INSERT INTO assignments_tracker (name, due_date, formatted_due, user_id) VALUES (?, ?, ?, ?)',
        [name, due_date, formatted_due, user_id]
      );
      console.log('Insert result:', result);
      return res.json({ id: result.lastInsertRowid, name, due_date, formatted_due, user_id });
    } else {
      console.log('Method not allowed:', req.method);
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.log('Assignment Tracker error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}
