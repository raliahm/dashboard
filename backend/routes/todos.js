
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


// GET /api/todos
router.get('/', async (req, res) => {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM todos WHERE user_id = ? ORDER BY id',
      args: [userId],
    });
    res.json(result.rows.map(row => ({ ...row, done: !!row.done })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// POST /api/todos
router.post('/', async (req, res) => {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { text, done } = req.body;
    const result = await db.execute({
      sql: 'INSERT INTO todos (text, done, user_id) VALUES (?, ?, ?) RETURNING *',
      args: [text, done ? 1 : 0, userId],
    });
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

