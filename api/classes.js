import { createClient } from '@libsql/client';

import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]"; // adjust import if needed

const session = await getServerSession(req, res, authOptions);
const userId = session?.user?.id;

if (!userId) return res.status(401).json({ error: "Unauthorized" });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const result = await db.execute('SELECT * FROM attended_classes ORDER BY id');
      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      const { name, attended = 0, total = 0 } = req.body;
      const result = await db.execute({
        sql: 'INSERT INTO attended_classes (name, attended, total) VALUES (?, ?, ?) RETURNING *',
        args: [name, attended, total],
      });
      return res.status(201).json(result.rows[0]);
    }

    if (req.method === 'PATCH') {
      const { id, name, attended, total } = req.body;
      await db.execute({
        sql: 'UPDATE attended_classes SET name = ?, attended = ?, total = ? WHERE id = ?',
        args: [name, attended, total, id],
      });
      const result = await db.execute({
        sql: 'SELECT * FROM attended_classes WHERE id = ?',
        args: [id],
      });
      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      await db.execute({
        sql: 'DELETE FROM attended_classes WHERE id = ?',
        args: [id],
      });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}