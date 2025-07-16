import { createClient } from '@libsql/client';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  // Get id from dynamic route
  const id = req.query.id || (req.url && req.url.split('/').pop());

  // Verify Google id_token from Authorization header
  let userId = null;
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.replace('Bearer ', '');
    try {
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
    if (!id) return res.status(400).json({ error: 'Missing id' });

    if (req.method === 'PATCH') {
      const { name, attended, total } = req.body;
      await db.execute({
        sql: 'UPDATE attended_classes SET name = ?, attended = ?, total = ? WHERE id = ? AND user_id = ?',
        args: [name, attended, total, id, userId],
      });
      const updated = await db.execute({
        sql: 'SELECT * FROM attended_classes WHERE id = ? AND user_id = ?',
        args: [id, userId],
      });
      return res.status(200).json(updated.rows[0]);
    }

    if (req.method === 'DELETE') {
      await db.execute({
        sql: 'DELETE FROM attended_classes WHERE id = ? AND user_id = ?',
        args: [id, userId],
      });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}