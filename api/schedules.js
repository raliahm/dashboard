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

    // GET: fetch all schedules for the logged-in user
    if (req.method === 'GET') {
      const result = await db.execute({
        sql: 'SELECT * FROM schedules WHERE user_id = ? ORDER BY created_at DESC',
        args: [userId],
      });
      return res.status(200).json(result.rows);
    }

    // POST: check if body is empty (fetch all schedules) or has data (add new schedule)
    if (req.method === 'POST') {
      const { course_id, course_name, schedule_data } = req.body;
      
      // If no course_id, return all schedules for user
      if (!course_id) {
        const result = await db.execute({
          sql: 'SELECT * FROM schedules WHERE user_id = ? ORDER BY created_at DESC',
          args: [userId],
        });
        return res.status(200).json(result.rows);
      }
      
      // Otherwise, add a new schedule
      const result = await db.execute({
        sql: 'INSERT INTO schedules (user_id, course_id, course_name, schedule_data) VALUES (?, ?, ?, ?) RETURNING *',
        args: [userId, course_id, course_name || 'Untitled Course', schedule_data || ''],
      });
      return res.status(201).json(result.rows[0]);
    }

    // PUT: update an existing schedule
    if (req.method === 'PUT') {
      const { course_id, course_name, schedule_data } = req.body;
      
      if (!course_id) {
        return res.status(400).json({ error: 'course_id is required for updates' });
      }
      
      const result = await db.execute({
        sql: 'UPDATE schedules SET course_name = ?, schedule_data = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND course_id = ? RETURNING *',
        args: [course_name, schedule_data, userId, course_id],
      });
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Schedule not found' });
      }
      
      return res.status(200).json(result.rows[0]);
    }

    // DELETE: remove a schedule
    if (req.method === 'DELETE') {
      const { course_id } = req.body;
      
      if (!course_id) {
        return res.status(400).json({ error: 'course_id is required for deletion' });
      }
      
      // First, delete related progress entries
      await db.execute({
        sql: 'DELETE FROM schedule_progress WHERE user_id = ? AND course_id = ?',
        args: [userId, course_id],
      });
      
      // Then delete the schedule
      const result = await db.execute({
        sql: 'DELETE FROM schedules WHERE user_id = ? AND course_id = ? RETURNING *',
        args: [userId, course_id],
      });
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Schedule not found' });
      }
      
      return res.status(200).json({ message: 'Schedule deleted successfully', deleted: result.rows[0] });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Schedules API error:', error);
    return res.status(500).json({ error: error.message });
  }
}