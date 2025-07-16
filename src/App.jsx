import { useState, useEffect } from 'react';
import './App.css';
import { GoogleOAuthProvider, GoogleLogin, useGoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

function App() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <Dashboard />
    </GoogleOAuthProvider>
  );
}

function Dashboard() {
  // Google Calendar OAuth access
  const handleCalendarLogin = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    onSuccess: tokenResponse => {
      setAccessToken(tokenResponse.access_token);
    },
    onError: () => {
      alert('Failed to get Google Calendar access.');
    },
    flow: 'implicit',
  });
  // Try to restore user and idToken from localStorage
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [idToken, setIdToken] = useState(() => localStorage.getItem('idToken'));
  const [accessToken, setAccessToken] = useState(null);
  const [newItem, setNewItem] = useState("");
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarId, setCalendarId] = useState('primary');
  const [customCalendarId, setCustomCalendarId] = useState('');
  // User calendar options: always user's, plus any added by user
  const [calendarOptions, setCalendarOptions] = useState([{ value: calendarId }]);
  const [calendarIframeError, setCalendarIframeError] = useState(false);
  // Fetch user's calendarId from backend
  useEffect(() => {
    if (!idToken) {
      setCalendarId('primary');
      setCalendarOptions([{ value: 'primary' }]);
      return;
    }
    fetch('/api/calendar', {
      headers: { Authorization: `Bearer ${idToken}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.calendarId) {
          setCalendarId(data.calendarId);
          setCalendarOptions([{ value: data.calendarId }]);
        } else if (data.error) {
          setCalendarId('primary');
          setCalendarOptions([{ value: 'primary' }]);
          alert('Could not fetch your calendar: ' + data.error);
        }
      })
      .catch(err => {
        setCalendarId('primary');
        setCalendarOptions([{ value: 'primary' }]);
        alert('Could not fetch your calendar: ' + err.message);
      });
  }, [idToken]);

  // Keep user and idToken in sync with localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);
  useEffect(() => {
    if (idToken) {
      localStorage.setItem('idToken', idToken);
    } else {
      localStorage.removeItem('idToken');
    }
  }, [idToken]);

  useEffect(() => {
    if (!user || !idToken) return;
    setLoading(true);
    fetch('/api/todos', {
      headers: { Authorization: `Bearer ${idToken}` },
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch todos');
        return res.json();
      })
      .then(data => {
        setItems(data);
        setLoading(false);
      })
      .catch(err => {
        setLoading(false);
        alert('Error loading todos: ' + err.message);
      });
  }, [user, idToken]);

  const addItem = (e) => {
    e.preventDefault();
    if (newItem.trim() === "") return;
    fetch('/api/todos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ text: newItem.trim(), done: false })
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to add todo');
        return res.json();
      })
      .then(added => {
        setItems([...items, added]);
        setNewItem("");
      })
      .catch(err => alert(err.message));
  };

  const toggleDone = (id) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    fetch(`/api/todos/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ text: item.text, done: !item.done })
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to update todo');
        return res.json();
      })
      .then(updated => setItems(items.map(i => i.id === id ? updated : i)))
      .catch(err => alert(err.message));
  };

  const deleteItem = (id) => {
    fetch(`/api/todos/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({})
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to delete todo');
        return res.json();
      })
      .then(() => setItems(items.filter(i => i.id !== id)))
      .catch(err => alert(err.message));
  };

  const updateItem = (id, newText) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    fetch(`/api/todos/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ text: newText, done: item.done })
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to update todo');
        return res.json();
      })
      .then(updated => setItems(items.map(i => i.id === id ? updated : i)))
      .catch(err => alert(err.message));
  };

  const doneCount = items.filter(item => item.done).length;

  // Google login with calendar scope using GoogleLogin component


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
                setIdToken(credentialResponse.credential); // Save id_token for API
                // Save to localStorage immediately for smoother reloads
                localStorage.setItem('user', JSON.stringify(decoded));
                localStorage.setItem('idToken', credentialResponse.credential);
              } catch (err) {
                alert('Failed to decode id_token: ' + err.message);
              }
            } else {
              alert('No credential returned.');
            }
          }}
          onError={() => alert('Login Failed')}
          useOneTap
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="mb-4 text-lg font-semibold">Loading your dashboard...</h2>
      </div>
    );
  }

  return (
    <div className="dashboard-outer">
      <div className="dashboard-row">
        {/* Todo List Card */}
        <div className="dashboard-card task-card">
          <h1 className="text-2xl font-bold text-pink-700 mb-2 text-center">🌷 Getting Things Done</h1>
          <article className="bg-yellow-100 border-2 border-yellow-200 rounded-2xl px-6 py-3 shadow-lg text-yellow-700 text-base font-semibold flex flex-col items-center min-w-[160px]">
            <span className="text-xs mb-1">Tasks Completed: </span>
            <span className="text-2xl font-bold">{doneCount}</span>
          </article>
          <form onSubmit={addItem} className="flex space-x-2 mb-2">
            <input
              className="flex-grow p-2 border border-pink-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 bg-pink-100 placeholder-pink-500"
              placeholder="Add a task..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
            />
            <button className="bg-pink-500 text-white px-4 py-2 rounded-xl hover:bg-pink-600">
              Add
            </button>
          </form>
          <ul className="flex flex-col gap-2 list-none">
            {items.map(item => (
              <li key={item.id} className="task-card w-full grid grid-cols-[auto_1fr_auto] items-center gap-2 p-1 rounded-lg bg-pink-50 border border-pink-200 shadow-sm min-h-[28px] max-h-[36px] text-sm">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleDone(item.id)}
                  className="accent-pink-500 scale-90"
                />
                {editingId === item.id ? (
                  <input
                    className={`w-full bg-white border border-pink-200 rounded px-1 py-0.5 text-xs ${item.done ? 'line-through text-pink-400' : 'text-pink-800'}`}
                    value={item.text}
                    onChange={(e) => updateItem(item.id, e.target.value)}
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setEditingId(null);
                    }}
                    autoFocus
                  />
                ) : (
                  <span
                    onClick={() => setEditingId(item.id)}
                    className={`w-full cursor-pointer text-xs ${item.done ? 'line-through text-pink-400' : 'text-pink-800'}`}
                  >
                    {item.text}
                  </span>
                )}
                <button
                  onClick={() => deleteItem(item.id)}
                  className="text-pink-400 hover:text-pink-600 px-1 text-base"
                  title="Delete"
                  style={{ lineHeight: 1 }}
                >
                  ❌
                </button>
              </li>
            ))}
          </ul>
        </div>
        {/* Pomodoro Timer Card */}
        <div className="dashboard-card pomodoro-card">
          <h2 className="text-xl font-bold text-red-700 mb-2 text-center">Pomodoro Timer</h2>
          <article className="bg-red-50 border-2 border-red-200 rounded-2xl px-6 py-4 shadow-lg text-red-700 text-base font-semibold flex flex-col items-center min-w-[200px]">
            <PomodoroTimer />
          </article>
        </div>
        {/* Google Calendar Card (iframe embed with dynamic input and error handling) */}
        <div className="dashboard-card calendar-card">
          <h2 className="text-xl font-bold text-blue-700 mb-2 text-center">Google Calendar</h2>
          <form
            className="flex flex-col items-center gap-2 mb-2"
            onSubmit={e => {
              e.preventDefault();
              if (customCalendarId && !calendarOptions.some(opt => opt.value === customCalendarId)) {
                setCalendarOptions([...calendarOptions, { value: customCalendarId }]);
              }
            }}
            autoComplete="off"
          >
            <label htmlFor="calendar-input" className="text-xs text-blue-700">Add or select a calendar ID:</label>
            <div className="flex gap-2 w-full justify-center">
              <input
                id="calendar-input"
                className="border border-blue-200 rounded px-2 py-1 text-xs"
                placeholder="Paste any calendar ID (public or shared)"
                value={customCalendarId}
                onChange={e => {
                  setCustomCalendarId(e.target.value);
                  setCalendarIframeError(false);
                }}
                style={{ width: 220 }}
              />
              <button
                className="px-3 py-1 bg-blue-400 text-white rounded hover:bg-blue-600 text-xs"
                type="submit"
              >Add</button>
            </div>
            <select
              id="calendar-select"
              className="border border-blue-300 rounded px-2 py-1 mt-1 w-[240px]"
              value={customCalendarId || calendarId}
              onChange={e => {
                setCustomCalendarId(e.target.value);
                setCalendarIframeError(false);
              }}
            >
              {calendarOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.value}</option>
              ))}
            </select>
          </form>
          <div className="calendar-events-container" style={{ maxHeight: 400, overflowY: 'auto', width: '100%' }}>
            {!calendarIframeError ? (
              <iframe
                src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(customCalendarId || calendarId)}&ctz=auto`}
                style={{ border: 0, width: '100%', minHeight: 400 }}
                frameBorder="0"
                scrolling="no"
                title="Google Calendar"
                onError={() => setCalendarIframeError(true)}
              ></iframe>
            ) : (
              <div className="text-red-500 text-center p-4">Could not load this calendar. Make sure it is public or shared.</div>
            )}
          </div>
        </div>
      {/* Attended Classes Tracker Card */}
        <div className="dashboard-card attended-card">
          <h2 className="text-xl font-bold text-green-700 mb-2 text-center">📚 Attended Classes Tracker</h2>
          <AttendedClassesTracker user={user} idToken={idToken} />
        </div>
      </div>
    </div>
  );
}

// (UserCalendar component removed, now using iframe embed)
    

function PomodoroTimer() {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [intervalId, setIntervalId] = useState(null);

  const toggle = () => {
    setIsActive(!isActive);
    setIsPaused(false);
  };

  const reset = () => {
    setIsActive(false);
    setIsPaused(false);
    setMinutes(25);
    setSeconds(0);
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
  };

  useEffect(() => {
    if (!isActive || isPaused) return;

    const id = setInterval(() => {
      setSeconds(prev => {
        if (prev === 0) {
          if (minutes === 0) {
            clearInterval(id);
            setIsActive(false);
            setMinutes(25);
            setSeconds(0);
            return 0;
          }
          setMinutes(prev => prev - 1);
          return 59;
        }
        return prev - 1;
      });
    }, 1000);

    setIntervalId(id);

    return () => clearInterval(id);
  }, [isActive, isPaused, minutes]);

  return (
    <div className="flex flex-col items-center">
      <div className="text-4xl font-bold mb-2">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>
      <div className="flex space-x-2">
        <button
          onClick={toggle}
          className={`px-4 py-2 rounded-xl font-semibold transition-all flex items-center justify-center ${isActive ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
        >
          {isActive ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-xl bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors"
        >
          Reset
        </button>
      </div>
      <div className="mt-4 text-sm text-center text-gray-500">
        {isActive ? 'Focus on your task!' : 'Take a break or prepare for your next session.'}
      </div>
    </div>
  );
}

function AttendedClassesTracker({ user, idToken }) {
  const [classes, setClasses] = useState([]);
  const [newClass, setNewClass] = useState({ name: '', attended: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !idToken) return;
    fetch('/api/classes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({})
    })
      .then(res => res.json())
      .then(data => {
        setClasses(data);
        setLoading(false);
      });
  }, [user, idToken]);

  const increment = (id) => {
    const cls = classes.find(c => c.id === id);
    if (!cls || cls.attended >= cls.total) return;
    fetch(`/api/classes/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ ...cls, attended: cls.attended + 1 })
    })
      .then(res => res.json())
      .then(updated => setClasses(classes.map(c => c.id === id ? updated : c)));
  };
  const decrement = (id) => {
    const cls = classes.find(c => c.id === id);
    if (!cls || cls.attended <= 0) return;
    fetch(`/api/classes/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ ...cls, attended: cls.attended - 1 })
    })
      .then(res => res.json())
      .then(updated => setClasses(classes.map(c => c.id === id ? updated : c)));
  };
  const addClass = (e) => {
    e.preventDefault();
    if (!newClass.name.trim() || newClass.total <= 0) return;
    fetch('/api/classes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ ...newClass, attended: 0 })
    })
      .then(res => res.json())
      .then(added => {
        setClasses([...classes, added]);
        setNewClass({ name: '', attended: 0, total: 0 });
      });
  };
  const deleteClass = (id) => {
    fetch(`/api/classes/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({})
    })
      .then(res => res.json())
      .then(() => setClasses(classes.filter(c => c.id !== id)));
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <form onSubmit={addClass} className="flex gap-2 mb-2">
        <input
          className="border border-green-300 rounded px-2 py-1"
          placeholder="Class name"
          value={newClass.name}
          onChange={e => setNewClass({ ...newClass, name: e.target.value })}
        />
        <input
          className="border border-green-300 rounded px-2 py-1 w-16"
          type="number"
          min="1"
          placeholder="Total"
          value={newClass.total || ''}
          onChange={e => setNewClass({ ...newClass, total: Number(e.target.value) })}
        />
        <button className="bg-green-400 text-white px-3 py-1 rounded hover:bg-green-500">Add</button>
      </form>
      <div className="w-full flex flex-wrap gap-3 justify-center">
        {classes.map(cls => (
          <div key={cls.id} className="attended-card">
            <span className="font-semibold text-green-800 mb-2 text-center">{cls.name}</span>
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => decrement(cls.id)} className="bg-green-200 text-green-700 px-2 py-1 rounded hover:bg-green-300">-</button>
              <span className="font-mono text-green-900">{cls.attended} / {cls.total}</span>
              <button onClick={() => increment(cls.id)} className="bg-green-200 text-green-700 px-2 py-1 rounded hover:bg-green-300">+</button>
              <button onClick={() => deleteClass(cls.id)} className="ml-2 text-red-400 hover:text-red-700">🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;