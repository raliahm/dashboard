// PATCH/DELETE for assignments_tracker by id
import { createClient } from '@libsql/client';
const db = createClient({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_DB_TOKEN,
});
import { verifyGoogleToken } from '../auth';

export default async function handler(req, res) {
  const { id } = req.query;
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing token' });
  const user = await verifyGoogleToken(auth.split(' ')[1]);
  if (!user) return res.status(401).json({ error: 'Invalid token' });
  const user_id = user.sub;

  if (req.method === 'PATCH') {
    // Update assignment
    const { name, due_date } = req.body;
    if (!name || !due_date) return res.status(400).json({ error: 'Missing fields' });
    const d = new Date(due_date);
    const formatted_due = `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}-${d.getFullYear()}`;
    const result = await db.execute(
      'UPDATE assignments_tracker SET name=?, due_date=?, formatted_due=? WHERE id=? AND user_id=?',
      [name, due_date, formatted_due, id, user_id]
    );
    return res.json({ id, name, due_date, formatted_due, user_id });
  } else if (req.method === 'DELETE') {
    await db.execute('DELETE FROM assignments_tracker WHERE id=? AND user_id=?', [id, user_id]);
    return res.json({ success: true });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
