
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

// POST /api/classes (add new class or get all classes)
router.post('/', async (req, res) => {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { name, attended, total } = req.body;
    if (!name) {
      // Return all classes for user
      const result = await db.execute({
        sql: 'SELECT * FROM attended_classes WHERE user_id = ? ORDER BY id',
        args: [userId],
      });
      return res.json(result.rows);
    }
    // Otherwise, add a new class
    const result = await db.execute({
      sql: 'INSERT INTO attended_classes (name, attended, total, user_id) VALUES (?, ?, ?, ?) RETURNING *',
      args: [name, attended || 0, total, userId],
    });
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
