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

export async function GET(request) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM assignments_tracker WHERE user_id = ? ORDER BY due_date ASC',
      args: [userId],
    });
    const rows = (result.rows || []).map(row => ({ ...row, completed: !!row.completed }));
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { name, due_date, completed } = await request.json();
    if (!name || !due_date) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    const result = await db.execute({
      sql: 'INSERT INTO assignments_tracker (name, due_date, user_id, completed) VALUES (?, ?, ?, ?) RETURNING *',
      args: [name, due_date, userId, completed ? 1 : 0],
    });
    const row = result.rows[0];
    row.completed = !!row.completed;
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}