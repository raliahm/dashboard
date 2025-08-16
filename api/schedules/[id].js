import { createClient } from '@libsql/client';
import fetch from 'node-fetch';

// filepath: c:\Users\rebaa\ML Engineering Course\dashboard\api\schedules\[id].js

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

        // GET: fetch a single schedule
        if (req.method === 'GET') {
            const result = await db.execute({
                sql: 'SELECT * FROM schedules WHERE user_id = ? AND course_id = ?',
                args: [userId, id],
            });
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Schedule not found' });
            }
            return res.status(200).json(result.rows[0]);
        }

        // PUT: update a schedule
        if (req.method === 'PUT') {
            const { course_name, schedule_data } = req.body;
            const result = await db.execute({
                sql: 'UPDATE schedules SET course_name = ?, schedule_data = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND course_id = ? RETURNING *',
                args: [course_name, schedule_data, userId, id],
            });
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Schedule not found' });
            }
            return res.status(200).json(result.rows[0]);
        }

        // DELETE: remove a schedule
        if (req.method === 'DELETE') {
            // First, delete related progress entries
            await db.execute({
                sql: 'DELETE FROM schedule_progress WHERE user_id = ? AND course_id = ?',
                args: [userId, id],
            });
            // Then delete the schedule
            const result = await db.execute({
                sql: 'DELETE FROM schedules WHERE user_id = ? AND course_id = ? RETURNING *',
                args: [userId, id],
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