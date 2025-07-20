
import express from 'express';
import { createClient } from '@libsql/client';


const router = express.Router();

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});


async function getUserId(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.replace('Bearer ', '');
    try {
      const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
      const googleData = await googleRes.json();
      if (googleData && googleData.sub) {
        return googleData.sub;
      }
    } catch (err) {
      // ignore
    }
  }
  return null;
}


// GET /api/trackers
router.get('/', async (req, res) => {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM assignments_tracker WHERE user_id = ? ORDER BY due_date ASC',
      args: [userId],
    });
    const rows = (result.rows || []).map(row => ({ ...row, completed: !!row.completed }));
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// POST /api/trackers
router.post('/', async (req, res) => {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { name, due_date, completed } = req.body;
    if (!name || !due_date) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    const result = await db.execute({
      sql: 'INSERT INTO assignments_tracker (name, due_date, user_id, completed) VALUES (?, ?, ?, ?) RETURNING *',
      args: [name, due_date, userId, completed ? 1 : 0],
    });
    const row = result.rows[0];
    row.completed = !!row.completed;
    res.status(201).json(row);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;