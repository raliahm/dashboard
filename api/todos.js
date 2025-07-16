import { createClient } from '@libsql/client';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  // Verify Google id_token from Authorization header
  let userId = null;
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.replace('Bearer ', '');
    try {
      // Verify with Google
      const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
      const googleData = await googleRes.json();
      if (googleData && googleData.sub) {
        userId = googleData.sub;
      }
    } catch (err) {
      // ignore, will fail below if userId not set
    }
  }

  try {
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // GET: fetch all todos for the logged-in user
    if (req.method === 'GET') {
      const result = await db.execute({
        sql: 'SELECT * FROM todos WHERE user_id = ? ORDER BY id',
        args: [userId],
      });
      return res.status(200).json(result.rows.map(row => ({ ...row, done: !!row.done })));
    }

    // POST: add a new todo for the logged-in user
    if (req.method === 'POST') {
      const { text, done } = req.body;
      const result = await db.execute({
        sql: 'INSERT INTO todos (text, done, user_id) VALUES (?, ?, ?) RETURNING *',
        args: [text, done ? 1 : 0, userId],
      });
      return res.status(201).json(result.rows[0]);
    }

    // PATCH: update a todo for the logged-in user
    if (req.method === 'PATCH') {
      let id = req.query.id;
      if (!id && req.url) {
        const match = req.url.match(/\/api\/todos\/(\d+)/);
        if (match) id = match[1];
      }
      if (!id) id = req.body.id;
      const { text, done } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing id' });
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

    // DELETE: delete a todo for the logged-in user
    if (req.method === 'DELETE') {
      let id = req.query.id;
      if (!id && req.url) {
        const match = req.url.match(/\/api\/todos\/(\d+)/);
        if (match) id = match[1];
      }
      if (!id) id = req.body.id;
      if (!id) return res.status(400).json({ error: 'Missing id' });
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