import { createClient } from '@libsql/client';

export default async function handler(req, res) {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    // GET: fetch all todos for a user (userId required)
    if (req.method === 'GET') {
      const userId = req.query.userId || req.body?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const result = await db.execute({
        sql: 'SELECT * FROM todos WHERE user_id = ? ORDER BY id',
        args: [userId],
      });
      return res.status(200).json(result.rows.map(row => ({ ...row, done: !!row.done })));
    }

    // POST: add a new todo for a user
    if (req.method === 'POST') {
      const { text, done, userId } = req.body;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const result = await db.execute({
        sql: 'INSERT INTO todos (text, done, user_id) VALUES (?, ?, ?) RETURNING *',
        args: [text, done ? 1 : 0, userId],
      });
      return res.status(201).json(result.rows[0]);
    }

    // PATCH: update a todo for a user
    if (req.method === 'PATCH') {
      let id = req.query.id;
      if (!id && req.url) {
        const match = req.url.match(/\/api\/todos\/(\d+)/);
        if (match) id = match[1];
      }
      if (!id) id = req.body.id;
      const { text, done, userId } = req.body;
      if (!id || !userId) return res.status(400).json({ error: 'Missing id or userId' });
      await db.execute({
        sql: 'UPDATE todos SET text = ?, done = ? WHERE id = ? AND user_id = ?',
        args: [text, done ? 1 : 0, id, userId],
      });
      const updated = await db.execute({
        sql: 'SELECT * FROM todos WHERE id = ? AND user_id = ?',
        args: [id, userId],
      });
      return res.status(200).json(updated.rows[0]);
    }

    // DELETE: delete a todo for a user
    if (req.method === 'DELETE') {
      let id = req.query.id;
      if (!id && req.url) {
        const match = req.url.match(/\/api\/todos\/(\d+)/);
        if (match) id = match[1];
      }
      if (!id) id = req.body.id;
      const userId = req.body.userId;
      if (!id || !userId) return res.status(400).json({ error: 'Missing id or userId' });
      await db.execute({
        sql: 'DELETE FROM todos WHERE id = ? AND user_id = ?',
        args: [id, userId],
      });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}