import { createClient } from '@libsql/client';
import fetch from 'node-fetch';

// Support dynamic API routes: /api/classes/[id]
export default async function handler(req, res) {
  // Extract id from dynamic route if present
  let dynamicId = null;
  if (req.url) {
    const match = req.url.match(/\/api\/classes\/?(\d+)?/);
    if (match && match[1]) dynamicId = match[1];
  }

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
    // GET: Fetch all classes for user
    if (req.method === 'GET') {
      const result = await db.execute({
        sql: 'SELECT * FROM classes WHERE user_id = ? ORDER BY id',
        args: [userId],
      });
      return res.status(200).json(result.rows);
    }

    // POST: add a new todo for the logged-in user
    if (req.method === 'POST') {
      const { name, attended, total } = req.body;
       // Validate required fields
      if (!name || !total) {
        return res.status(400).json({ 
          error: 'Class name and total sessions are required' 
        });
      }

      
      // Validate numeric fields
      const attendedCount = parseInt(attended) || 0;
      const totalCount = parseInt(total);
      
      if (totalCount <= 0) {
        return res.status(400).json({ 
          error: 'Total sessions must be greater than 0' 
        });
      }

      if (attendedCount < 0 || attendedCount > totalCount) {
        return res.status(400).json({ 
          error: 'Attended sessions must be between 0 and total sessions' 
        });
      }

      // Insert new class into database
      const result = await db.execute({
        sql: 'INSERT INTO classes (name, attended, total, user_id) VALUES (?, ?, ?, ?) RETURNING *',
        args: [name.trim(), attendedCount, totalCount, userId],
      });
      
      if (result.rows.length === 0) {
        return res.status(500).json({ error: 'Failed to create class' });
      }
      return res.status(201).json(result.rows[0]);
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
    
  } 