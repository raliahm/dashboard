import { createClient } from '@libsql/client';


export default async function handler(req, res) {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    if (req.method === 'GET') {
      const result = await db.execute('SELECT * FROM todos ORDER BY id');
      return res.status(200).json(result.rows.map(row => ({ ...row, done: !!row.done })));
    }

    if (req.method === 'POST') {
      const { text, done, userId } = req.body;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const result = await db.execute({
        sql: 'INSERT INTO todos (text, done, user_id) VALUES (?, ?, ?) RETURNING *',
        args: [text, done ? 1 : 0, userId],
      });
      return res.status(201).json(result.rows[0]);
    }

    if (req.method === 'PATCH') {
      const { id, text, done , userId} = req.body;
      await db.execute({
        sql: 'UPDATE todos SET text = ?, done = ? WHERE id = ? AND user_id = ?',
        args: [text, done ? 1 : 0, id, userId],
      });
      const updated = await db.execute({
        sql: 'SELECT * FROM todos WHERE id = ?',
        args: [id],
      });
      return res.status(200).json(updated.rows[0]);
    }

    if (req.method === 'DELETE') {
      const { id, userId } = req.body;
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