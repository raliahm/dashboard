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

    // GET: fetch all assignments for the logged-in user
    if (req.method === 'GET') {
      const result = await db.execute({
        sql: 'SELECT * FROM assignments WHERE user_id = ? ORDER BY due_date ASC, created_at DESC',
        args: [userId],
      });
      return res.status(200).json(result.rows);
    }

    // POST: check if body is empty (fetch all assignments) or has data (add new assignment)
    if (req.method === 'POST') {
      const { title, type, description, due_date, class_name, status, priority } = req.body;
      
      // If no title, return all assignments for user
      if (!title) {
        const result = await db.execute({
          sql: 'SELECT * FROM assignments WHERE user_id = ? ORDER BY due_date ASC, created_at DESC',
          args: [userId],
        });
        return res.status(200).json(result.rows);
      }
      
      // Otherwise, add a new assignment
      const result = await db.execute({
        sql: 'INSERT INTO assignments (title, type, description, due_date, class_name, status, priority, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *',
        args: [
          title, 
          type || 'assignment', 
          description || '', 
          due_date || '', 
          class_name || '', 
          status || 'pending', 
          priority || 'medium', 
          userId
        ],
      });
      return res.status(201).json(result.rows[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Assignments API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
