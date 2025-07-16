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

export async function PATCH(request, { params }) {
  const userId = await getUserId(request);
  const id = params.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  try {
    const { name, attended, total } = await request.json();
    await db.execute({
      sql: 'UPDATE attended_classes SET name = ?, attended = ?, total = ? WHERE id = ? AND user_id = ?',
      args: [name, attended, total, id, userId],
    });
    const updated = await db.execute({
      sql: 'SELECT * FROM attended_classes WHERE id = ? AND user_id = ?',
      args: [id, userId],
    });
    return NextResponse.json(updated.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const userId = await getUserId(request);
  const id = params.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  try {
    await db.execute({
      sql: 'DELETE FROM attended_classes WHERE id = ? AND user_id = ?',
      args: [id, userId],
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}