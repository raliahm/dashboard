import React, { useState, useEffect } from 'react';
import './App.css';
import { GoogleLogin, useGoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

// CalendarPicker: lets user authenticate, lists all calendars, and lets user pick one 
function CalendarPicker() {
  const [accessToken, setAccessToken] = useState(null);
  const [calendarList, setCalendarList] = useState([]);
  const [selectedCalendar, setSelectedCalendar] = useState('');
  const [iframeError, setIframeError] = useState(false);

  // Google OAuth for Calendar API
  const loginForCalendar = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    flow: 'implicit',
    onSuccess: (tokenResponse) => {
      setAccessToken(tokenResponse.access_token);
    },
    onError: () => alert('Google Calendar authorization failed'),
  });

  useEffect(() => {
    if (!accessToken) return;
    fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.items) {
          setCalendarList(data.items);
          setSelectedCalendar(data.items.find(cal => cal.primary)?.id || data.items[0]?.id || '');
        }
      })
      .catch(() => setCalendarList([]));
  }, [accessToken]);

  return (
    <div className="dashboard-card calendar-card">
      <h2 className="text-xl font-bold text-blue-700 mb-2 text-center">Google Calendar Picker</h2>
      {!accessToken ? (
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition"
          onClick={() => loginForCalendar()}
        >
          Connect Google Calendar
        </button>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <select
              className="border border-blue-300 rounded px-2 py-1 calendar-select"
              value={selectedCalendar}
              onChange={e => {
                setSelectedCalendar(e.target.value);
                setIframeError(false);
              }}
            >
              {calendarList.map(cal => (
                <option key={cal.id} value={cal.id}>
                  {cal.summary} ({cal.id})
                </option>
              ))}
            </select>
            <button
              className="bg-blue-200 text-blue-700 px-2 py-1 rounded hover:bg-blue-300"
              onClick={() => {
                setAccessToken(null);
                setCalendarList([]);
                setSelectedCalendar('');
                setIframeError(false);
              }}
            >
              Disconnect
            </button>
          </div>
          <div className="calendar-iframe-container" style={{ maxHeight: 400, overflowY: 'auto', width: '100%' }}>
            {!iframeError && selectedCalendar ? (
              <iframe
                src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(selectedCalendar)}&ctz=auto`}
                style={{ border: 0, width: '100%', minHeight: 400 }}
                frameBorder="0"
                scrolling="no"
                title="Google Calendar"
                onError={() => setIframeError(true)}
              ></iframe>
            ) : selectedCalendar ? (
              <div className="text-red-500 text-center p-4">Could not load this calendar. Make sure it is public or shared.</div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

function App() {
  // App no longer wraps with GoogleOAuthProvider here because main.js does it
  return <Dashboard />;
}

function Dashboard() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [idToken, setIdToken] = useState(() => localStorage.getItem('idToken'));
  const [newItem, setNewItem] = useState("");
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  // other state like calendarId, assignments, classes, etc. can remain here

  useEffect(() => {
    if (!user || !idToken) return;
    setLoading(true);
    fetch('/api/todos', {
      headers: { Authorization: `Bearer ${idToken}` },
    })
      .then(res => {
        if (!res.ok) {
          if (res.status === 401) {
            alert('Session expired. Please sign in again.');
            setUser(null);
            setIdToken(null);
            localStorage.removeItem('user');
            localStorage.removeItem('idToken');
          }
          throw new Error('Failed to fetch todos');
        }
        return res.json();
      })
      .then(data => {
        setItems(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        setLoading(false);
        alert('Error loading todos: ' + err.message);
      });
  }, [user, idToken]);

  // Sync user and token to localStorage
  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  }, [user]);

  useEffect(() => {
    if (idToken) localStorage.setItem('idToken', idToken);
    else localStorage.removeItem('idToken');
  }, [idToken]);

  // Add handlers: addItem, toggleDone, deleteItem, updateItem remain unchanged...

  // Sign in UI when no user or token
  if (!user || !idToken) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="mb-4 text-lg font-semibold">Sign in to continue</h2>
        <GoogleLogin
          onSuccess={credentialResponse => {
            if (credentialResponse.credential) {
              try {
                const decoded = jwtDecode(credentialResponse.credential);
                setUser(decoded);
                setIdToken(credentialResponse.credential);
                localStorage.setItem('user', JSON.stringify(decoded));
                localStorage.setItem('idToken', credentialResponse.credential);
              } catch (err) {
                alert('Failed to decode id_token: ' + err.message);
              }
            } else {
              alert('No credential returned.');
            }
          }}
          onError={() => {
            alert('Login Failed. Please try again.');
            setUser(null);
            setIdToken(null);
            localStorage.removeItem('user');
            localStorage.removeItem('idToken');
          }}
          useOneTap
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="mb-4 text-lg font-semibold">Loading your dashboard...</h2>
        <button
          className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          onClick={() => {
            setUser(null);
            setIdToken(null);
            localStorage.removeItem('user');
            localStorage.removeItem('idToken');
          }}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-outer">
      {/* Your dashboard UI including CalendarPicker, PomodoroTimer, etc. */}
      {/* ... rest of your dashboard JSX remains unchanged ... */}
      <CalendarPicker />
    </div>
  );
}

export default App;
