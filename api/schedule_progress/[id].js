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
            const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
            const googleData = await googleRes.json();
            if (googleData && googleData.sub) {
                userId = googleData.sub;
            }
        } catch (err) {
            // ignore, will fail below if userId not set
        }
    }

    const { id } = req.query; // course_id from URL

    try {
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!id) return res.status(400).json({ error: 'Missing schedule id' });

         // DELETE: remove progress for a specific module
    if (req.method === 'DELETE') {
      const { course_id, module_id } = req.body;
      
      if (!course_id || !module_id) {
        return res.status(400).json({ error: 'course_id and module_id are required' });
      }
      
      const result = await db.execute({
        sql: 'DELETE FROM schedule_progress WHERE user_id = ? AND course_id = ? AND module_id = ? RETURNING *',
        args: [userId, course_id, module_id],
      });
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Progress not found' });
      }
      
      return res.status(200).json({ message: 'Progress deleted successfully' });
    }

   

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Schedules API error:', error);
        return res.status(500).json({ error: error.message });
    }
}