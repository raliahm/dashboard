// api/calendar.js
// Returns the user's primary Google Calendar ID (or a specific calendar if needed)
// Expects a valid Google id_token in the Authorization header

import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get id_token from Authorization header
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const idToken = authHeader.replace('Bearer ', '');

  try {
    // Get user's info from Google tokeninfo
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    const googleData = await googleRes.json();
    if (!googleData || !googleData.email) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }
    // The user's primary calendar is their email address
    // (Google Calendar API uses the user's email as the calendarId for the primary calendar)
    return res.status(200).json({ calendarId: googleData.email });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
