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

// PATCH /api/trackers/:id
router.patch('/:id', async (req, res) => {
  const userId = await getUserId(req);
  const { id } = req.params;
  const { name, due_date, completed } = req.body;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!id) return res.status(400).json({ error: 'Missing id' });
  try {
    await db.execute({
      sql: 'UPDATE assignments_tracker SET name = ?, due_date = ?, completed = ? WHERE id = ? AND user_id = ?',
      args: [name, due_date, completed ? 1 : 0, id, userId],
    });
    const updated = await db.execute({
      sql: 'SELECT * FROM assignments_tracker WHERE id = ? AND user_id = ?',
      args: [id, userId],
    });
    res.json(updated.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/trackers/:id
router.delete('/:id', async (req, res) => {
  const userId = await getUserId(req);
  const { id } = req.params;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!id) return res.status(400).json({ error: 'Missing id' });
  try {
    await db.execute({
      sql: 'DELETE FROM assignments_tracker WHERE id = ? AND user_id = ?',
      args: [id, userId],
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
