import { createClient } from '@libsql/client';
import { NextResponse } from 'next/server';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function getUserId(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.replace('Bearer ', '');
    try {
      const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
      const googleData = await googleRes.json();
      if (googleData && googleData.sub) {
        return googleData.sub;
      }
    } catch (err) {
      // ignore
    }
  }
  return null;
}

export async function POST(request) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const { name, attended, total } = body;
    if (!name) {
      // Return all classes for user
      const result = await db.execute({
        sql: 'SELECT * FROM attended_classes WHERE user_id = ? ORDER BY id',
        args: [userId],
      });
      return NextResponse.json(result.rows);
    }
    // Otherwise, add a new class
    const result = await db.execute({
      sql: 'INSERT INTO attended_classes (name, attended, total, user_id) VALUES (?, ?, ?, ?) RETURNING *',
      args: [name, attended || 0, total, userId],
    });
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
