import { NextResponse } from 'next/server';

export async function GET(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
  }
  const idToken = authHeader.replace('Bearer ', '');
  try {
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    const googleData = await googleRes.json();
    if (!googleData || !googleData.email) {
      return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 });
    }
    return NextResponse.json({ calendarId: googleData.email });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
