import { createClient } from '@libsql/client';

export default async function handler(req, res) {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    // GET: not used by frontend, but could be added if needed

    // POST: fetch all classes for user (if only userId provided), or add a new class
    if (req.method === 'POST') {
      const { userId, name, attended, total } = req.body;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      // If only userId, return all classes for user
      if (!name) {
        const result = await db.execute({
          sql: 'SELECT * FROM classes WHERE user_id = ? ORDER BY id',
          args: [userId],
        });
        return res.status(200).json(result.rows);
      }
      // Otherwise, add a new class
      const result = await db.execute({
        sql: 'INSERT INTO classes (name, attended, total, user_id) VALUES (?, ?, ?, ?) RETURNING *',
        args: [name, attended || 0, total, userId],
      });
      return res.status(201).json(result.rows[0]);
    }

    // PATCH: update a class (increment/decrement attended)
    if (req.method === 'PATCH') {
      let id = req.query.id;
      if (!id && req.url) {
        const match = req.url.match(/\/api\/classes\/(\d+)/);
        if (match) id = match[1];
      }
      if (!id) id = req.body.id;
      const { name, attended, total, userId } = req.body;
      if (!id || !userId) return res.status(400).json({ error: 'Missing id or userId' });
      await db.execute({
        sql: 'UPDATE classes SET name = ?, attended = ?, total = ? WHERE id = ? AND user_id = ?',
        args: [name, attended, total, id, userId],
      });
      const updated = await db.execute({
        sql: 'SELECT * FROM classes WHERE id = ? AND user_id = ?',
        args: [id, userId],
      });
      return res.status(200).json(updated.rows[0]);
    }

    // DELETE: delete a class
    if (req.method === 'DELETE') {
      let id = req.query.id;
      if (!id && req.url) {
        const match = req.url.match(/\/api\/classes\/(\d+)/);
        if (match) id = match[1];
      }
      if (!id) id = req.body.id;
      const userId = req.body.userId;
      if (!id || !userId) return res.status(400).json({ error: 'Missing id or userId' });
      await db.execute({
        sql: 'DELETE FROM classes WHERE id = ? AND user_id = ?',
        args: [id, userId],
      });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
