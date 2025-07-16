import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const result = await db.execute('SELECT * FROM todos ORDER BY id');
      return res.status(200).json(result.rows.map(row => ({ ...row, done: !!row.done })));
    }

    if (req.method === 'POST') {
      const { text, done } = req.body;
      const result = await db.execute({
        sql: 'INSERT INTO todos (text, done) VALUES (?, ?) RETURNING *',
        args: [text, done ? 1 : 0],
      });
      return res.status(201).json(result.rows[0]);
    }

    if (req.method === 'PATCH') {
      const { id, text, done } = req.body;
      await db.execute({
        sql: 'UPDATE todos SET text = ?, done = ? WHERE id = ?',
        args: [text, done ? 1 : 0, id],
      });
      const updated = await db.execute({
        sql: 'SELECT * FROM todos WHERE id = ?',
        args: [id],
      });
      return res.status(200).json(updated.rows[0]);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      await db.execute({
        sql: 'DELETE FROM todos WHERE id = ?',
        args: [id],
      });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}