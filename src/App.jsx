
import { useState, useEffect } from 'react';
import './App.css';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
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
  const [headerCollapsed, setHeaderCollapsed] = useState(false);


  // Sign out function
  const signOut = () => {
    // Clear all user data
    setUser(null);
    setIdToken(null);
    setAccessToken(null);
    setItems([]);
    setCalendarEvents([]);
    setCalendarId('primary');
    
    // Clear localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('idToken');
    localStorage.removeItem('accessToken');
    // Reset any other component states
    setLoading(false);
    setEditingId(null);
    setNewItem("");
  };
  // Fetch user's calendarId from backend
  useEffect(() => {
    if (!idToken) {
      setCalendarId('primary');
      return;
    }
    fetch('/api/calendar', {
      headers: { Authorization: `Bearer ${idToken}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.calendarId) {
          setCalendarId(data.calendarId);
        } else if (data.error) {
          setCalendarId('primary');
          // alert('Could not fetch your calendar: ' + data.error);
        }
      })
      .catch(err => {
        setCalendarId('primary');
       // alert('Could not fetch your calendar: ' + err.message);
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
    
    // Load todos from API (consistent with other components)
    fetch('/api/todos', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        setItems(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load todos:', err);
        setItems([]);
        setLoading(false);
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
      .then(res => res.json())
      .then(added => {
        if (added && added.id) {
          setItems([...items, added]);
          setNewItem("");
        }
      })
      .catch(err => console.error('Failed to add todo:', err));
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
          {/* Dashboard Header with User Info and Sign Out - Retractable */}
      <div 
        className={`dashboard-header-retractable ${headerCollapsed ? 'collapsed' : ''}`}
        onClick={() => setHeaderCollapsed(!headerCollapsed)}
      >
        <div className="user-welcome">
          <div className="user-avatar">
            {user?.picture ? (
              <img 
                src={user.picture} 
                alt="Profile" 
                className="w-8 h-8 rounded-full border-2 border-pink-300"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-pink-200 flex items-center justify-center text-pink-600 font-semibold">
                {user?.name?.charAt(0) || user?.email?.charAt(0) || '?'}
              </div>
            )}
          </div>
          <div className="user-info">
            <span className="user-greeting">🌸 Welcome back,</span>
            <span className="user-name">{user?.name || user?.email || 'there'}!</span>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent header collapse when clicking sign out
            signOut();
          }}
          className="sign-out-btn"
          title="Sign out of your dashboard"
        >
          <span className="sign-out-icon">👋</span>
          <span className="sign-out-text">Sign Out</span>
        </button>
        <div className="header-toggle-indicator">
          {headerCollapsed ? '▲' : '▼'}
        </div>
      </div>
        {/* Todo List Card */}
        <div className="dashboard-card task-card">
          <h1 className="text-2xl font-bold text-pink-700 mb-2 text-center">🌷 Getting Things Done</h1>
          <article className="bg-yellow-100 border-2 border-yellow-200 rounded-2xl px-6 py-3 shadow-lg text-yellow-700 text-base font-semibold flex flex-col items-center min-w-[160px]">
            <span className="text-xs mb-1">Tasks Completed: </span>
            <span className="text-2xl font-bold">{doneCount}</span>
          </article>
          <form onSubmit={addItem} className="flex space-x-2 mb-2">
            <input
              className="cottagecore-input cottagecore-input-pink flex-grow"
              placeholder="Add a task..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
            />
            <button className="cottagecore-btn cottagecore-btn-medium cottagecore-btn-pink">
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
                    className={`cottagecore-input cottagecore-input-small cottagecore-input-pink w-full ${item.done ? 'line-through text-pink-400' : 'text-pink-800'}`}
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
        {/* Google Calendar Card */}
        <CalendarPicker />
      {/* Attended Classes Tracker Card */}
        <div className="dashboard-card attended-card">
          <h2 className="text-xl font-bold text-green-700 mb-2 text-center">📚 Attended Classes Tracker</h2>
          <AttendedClassesTracker user={user} idToken={idToken} />
        </div>
        {/* Assignments Tracker Card - Much Bigger for large lists */}
        <div className="dashboard-card assignments-card" style={{ gridColumn: 'span 3', minHeight: '900px', width: '100%' }}>
          <h2 className="text-xl font-bold text-purple-700 mb-4 text-center">📝 Assignments & Exams</h2>
          <AssignmentsTracker user={user} idToken={idToken} />
        </div>
      </div>
    </div>
  );
}

 

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
          className={`cottagecore-btn cottagecore-btn-medium font-semibold transition-all flex items-center justify-center ${isActive ? 'cottagecore-btn-pink' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
        >
          {isActive ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={reset}
          className="cottagecore-btn cottagecore-btn-medium cottagecore-btn-gray"
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
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        // Ensure data is an array
        setClasses(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load classes:', err);
        setClasses([]); // Set empty array on error
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
      .then(updated => setClasses(classes.map(c => c.id === id ? updated : c)))
      .catch(err => console.error('Failed to increment class:', err));
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
      .then(updated => setClasses(classes.map(c => c.id === id ? updated : c)))
      .catch(err => console.error('Failed to decrement class:', err));
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
        if (added && added.id) {
          setClasses([...classes, added]);
          setNewClass({ name: '', attended: 0, total: 0 });
        }
      })
      .catch(err => console.error('Failed to add class:', err));
  };
  const deleteClass = (id) => {
    fetch(`/api/classes/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
    })
      .then(res => res.json())
      .then(() => setClasses(classes.filter(c => c.id !== id)))
      .catch(err => console.error('Failed to delete class:', err));
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <form onSubmit={addClass} className="flex gap-2 mb-2">
        <input
          className="cottagecore-input cottagecore-input-small cottagecore-input-green"
          placeholder="Class name"
          value={newClass.name}
          onChange={e => setNewClass({ ...newClass, name: e.target.value })}
        />
        <input
          className="cottagecore-input cottagecore-input-small cottagecore-input-green w-16"
          type="number"
          min="1"
          placeholder="Total"
          value={newClass.total || ''}
          onChange={e => setNewClass({ ...newClass, total: Number(e.target.value) })}
        />
        <button className="cottagecore-btn cottagecore-btn-small cottagecore-btn-green">Add</button>
      </form>
      <div className="w-full flex flex-wrap gap-3 justify-center">
        {classes && classes.length > 0 ? classes.map(cls => (
          <div key={cls.id} className="attended-card">
            <span className="font-semibold text-green-800 mb-2 text-center">{cls.name}</span>
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => decrement(cls.id)} className="cottagecore-btn cottagecore-btn-small cottagecore-btn-green">-</button>
              <span className="font-mono text-green-900">{cls.attended} / {cls.total}</span>
              <button onClick={() => increment(cls.id)} className="cottagecore-btn cottagecore-btn-small cottagecore-btn-green">+</button>
              <button onClick={() => deleteClass(cls.id)} className="ml-2 text-red-400 hover:text-red-700">🗑️</button>
            </div>
          </div>
        )) : (
          <div className="text-gray-500 text-center py-4">
            No classes added yet. Add your first class above!
          </div>
        )}
      </div>
    </div>
  );
}

function AssignmentsTracker({ user, idToken }) {
  const [assignments, setAssignments] = useState([]);
  const [newAssignment, setNewAssignment] = useState({ 
    title: '', 
    type: 'assignment', 
    description: '', 
    due_date: '', 
    class_name: '', 
    status: 'pending', 
    priority: 'medium' 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !idToken) return;
    fetch('/api/assignments', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },    })
      .then(res => res.json())
      .then(data => {
        setAssignments(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load assignments:', err);
        setAssignments([]);
        setLoading(false);
      });
  }, [user, idToken]);

  const addAssignment = (e) => {
    e.preventDefault();
    if (!newAssignment.title.trim()) return;
    
    fetch('/api/assignments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(newAssignment)
    })
      .then(res => res.json())
      .then(added => {
        if (added && added.id) {
          setAssignments([...assignments, added]);
          setNewAssignment({ 
            title: '', 
            type: 'assignment', 
            description: '', 
            due_date: '', 
            class_name: '', 
            status: 'pending', 
            priority: 'medium' 
          });
        }
      })
      .catch(err => console.error('Failed to add assignment:', err));
  };

  const updateAssignmentStatus = (id, newStatus) => {
    const assignment = assignments.find(a => a.id === id);
    if (!assignment) return;
    
    fetch(`/api/assignments/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ ...assignment, status: newStatus })
    })
      .then(res => res.json())
      .then(updated => setAssignments(assignments.map(a => a.id === id ? updated : a)))
      .catch(err => console.error('Failed to update assignment:', err));
  };

  const deleteAssignment = (id) => {
    fetch(`/api/assignments/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
    })
      .then(() => setAssignments(assignments.filter(a => a.id !== id)))
      .catch(err => console.error('Failed to delete assignment:', err));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-800 bg-green-100 border-green-300';
      case 'in_progress': return 'text-yellow-800 bg-yellow-100 border-yellow-300';
      default: return 'text-red-800 bg-red-100 border-red-300';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100 border-red-300';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-300';
      default: return 'text-gray-600 bg-gray-100 border-gray-300';
    }
  };

  const getTypeEmoji = (type) => {
    switch (type) {
      case 'exam': return '📄';
      case 'project': return '🔨';
      default: return '📝';
    }
  };

  if (loading) return <div>Loading...</div>;

   return (
    <div className="w-full flex flex-col gap-4 h-full min-h-[800px]">
      {/* Form Section */}
      <form onSubmit={addAssignment} className="grid grid-cols-2 gap-2 mb-4">
        <input
          className="cottagecore-input cottagecore-input-small cottagecore-input-purple"
          placeholder="Title"
          value={newAssignment.title}
          onChange={e => setNewAssignment({ ...newAssignment, title: e.target.value })}
          required
        />
        <select
          className="cottagecore-select cottagecore-input-small cottagecore-input-purple"
          value={newAssignment.type}
          onChange={e => setNewAssignment({ ...newAssignment, type: e.target.value })}
        >
          <option value="assignment">Assignment</option>
          <option value="exam">Exam</option>
          <option value="project">Project</option>
        </select>
        <input
          className="cottagecore-input cottagecore-input-small cottagecore-input-purple"
          placeholder="Class name"
          value={newAssignment.class_name}
          onChange={e => setNewAssignment({ ...newAssignment, class_name: e.target.value })}
        />
        <input
          type="date"
          className="cottagecore-input cottagecore-input-small cottagecore-input-purple"
          value={newAssignment.due_date}
          onChange={e => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
        />
        <select
          className="cottagecore-select cottagecore-input-small cottagecore-input-purple"
          value={newAssignment.priority}
          onChange={e => setNewAssignment({ ...newAssignment, priority: e.target.value })}
        >
          <option value="low">Low Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="high">High Priority</option>
        </select>
        <textarea
          className="cottagecore-textarea cottagecore-input-small cottagecore-input-purple col-span-2"
          placeholder="Description (optional)"
          rows="2"
          value={newAssignment.description}
          onChange={e => setNewAssignment({ ...newAssignment, description: e.target.value })}
        />
        <button className="cottagecore-btn cottagecore-btn-small cottagecore-btn-purple col-span-2">
          Add Assignment
        </button>
      </form>
      
      {/* Legend */}
      <div className="bg-purple-100 border border-purple-200 rounded-lg p-3 mb-4">
        <h3 className="text-sm font-semibold text-purple-800 mb-2 text-center">Legend</h3>
        <div className="flex justify-center gap-6 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-base">📝</span>
            <span className="text-purple-700 font-medium">Assignment</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-base">📄</span>
            <span className="text-purple-700 font-medium">Exam</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-base">🔨</span>
            <span className="text-purple-700 font-medium">Project</span>
          </div>
        </div>
      </div>

      {/* Priority Buckets - Stacked vertically for better space usage */}
      <div className="priority-buckets-stacked flex-1 flex flex-col gap-4 min-h-[600px]">
        {/* High Priority Bucket */}
        <div className="priority-bucket high-priority">
          <div className="bucket-header bg-gradient-to-r from-red-100 to-red-200 border-2 border-red-300 rounded-t-lg p-3 text-center">
            <h3 className="text-lg font-bold text-red-800 flex items-center justify-center gap-2">
              🔥 High Priority
            </h3>
            <div className="text-sm text-red-600 mt-1 font-medium">
              {assignments.filter(a => a.priority === 'high').length} items
            </div>
          </div>
          <div className="bucket-content bg-red-50 border-2 border-t-0 border-red-300 rounded-b-lg p-3 min-h-[200px] max-h-[300px] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {assignments
                .filter(assignment => assignment.priority === 'high')
                .sort((a, b) => {
                  if (a.due_date && b.due_date) {
                    return new Date(a.due_date) - new Date(b.due_date);
                  }
                  return 0;
                })
                .map(assignment => (
                  <AssignmentCard 
                    key={assignment.id}
                    assignment={assignment}
                    updateAssignmentStatus={updateAssignmentStatus}
                    deleteAssignment={deleteAssignment}
                    getStatusColor={getStatusColor}
                    getPriorityColor={getPriorityColor}
                    getTypeEmoji={getTypeEmoji}
                  />
                ))}
            </div>
            {assignments.filter(a => a.priority === 'high').length === 0 && (
              <div className="text-center text-red-400 py-8">
                <div className="text-3xl mb-2">🔥</div>
                <div className="text-base font-medium">No high priority items</div>
                <div className="text-sm text-red-300 mt-1">Urgent tasks will appear here</div>
              </div>
            )}
          </div>
        </div>

        {/* Medium Priority Bucket */}
        <div className="priority-bucket medium-priority">
          <div className="bucket-header bg-gradient-to-r from-yellow-100 to-yellow-200 border-2 border-yellow-300 rounded-t-lg p-3 text-center">
            <h3 className="text-lg font-bold text-yellow-800 flex items-center justify-center gap-2">
              ⚡ Medium Priority
            </h3>
            <div className="text-sm text-yellow-600 mt-1 font-medium">
              {assignments.filter(a => a.priority === 'medium').length} items
            </div>
          </div>
          <div className="bucket-content bg-yellow-50 border-2 border-t-0 border-yellow-300 rounded-b-lg p-3 min-h-[200px] max-h-[300px] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {assignments
                .filter(assignment => assignment.priority === 'medium')
                .sort((a, b) => {
                  if (a.due_date && b.due_date) {
                    return new Date(a.due_date) - new Date(b.due_date);
                  }
                  return 0;
                })
                .map(assignment => (
                  <AssignmentCard 
                    key={assignment.id}
                    assignment={assignment}
                    updateAssignmentStatus={updateAssignmentStatus}
                    deleteAssignment={deleteAssignment}
                    getStatusColor={getStatusColor}
                    getPriorityColor={getPriorityColor}
                    getTypeEmoji={getTypeEmoji}
                  />
                ))}
            </div>
            {assignments.filter(a => a.priority === 'medium').length === 0 && (
              <div className="text-center text-yellow-400 py-8">
                <div className="text-3xl mb-2">⚡</div>
                <div className="text-base font-medium">No medium priority items</div>
                <div className="text-sm text-yellow-300 mt-1">Regular tasks will appear here</div>
              </div>
            )}
          </div>
        </div>

        {/* Low Priority Bucket */}
        <div className="priority-bucket low-priority">
          <div className="bucket-header bg-gradient-to-r from-gray-100 to-gray-200 border-2 border-gray-300 rounded-t-lg p-3 text-center">
            <h3 className="text-lg font-bold text-gray-800 flex items-center justify-center gap-2">
              📋 Low Priority
            </h3>
            <div className="text-sm text-gray-600 mt-1 font-medium">
              {assignments.filter(a => a.priority === 'low').length} items
            </div>
          </div>
          <div className="bucket-content bg-gray-50 border-2 border-t-0 border-gray-300 rounded-b-lg p-3 min-h-[200px] max-h-[300px] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {assignments
                .filter(assignment => assignment.priority === 'low')
                .sort((a, b) => {
                  if (a.due_date && b.due_date) {
                    return new Date(a.due_date) - new Date(b.due_date);
                  }
                  return 0;
                })
                .map(assignment => (
                  <AssignmentCard 
                    key={assignment.id}
                    assignment={assignment}
                    updateAssignmentStatus={updateAssignmentStatus}
                    deleteAssignment={deleteAssignment}
                    getStatusColor={getStatusColor}
                    getPriorityColor={getPriorityColor}
                    getTypeEmoji={getTypeEmoji}
                  />
                ))}
            </div>
            {assignments.filter(a => a.priority === 'low').length === 0 && (
              <div className="text-center text-gray-400 py-8">
                <div className="text-3xl mb-2">📋</div>
                <div className="text-base font-medium">No low priority items</div>
                <div className="text-sm text-gray-300 mt-1">Future tasks will appear here</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Empty state when no assignments at all */}
      {assignments.length === 0 && (
        <div className="text-center py-16">
          <div className="text-8xl mb-6">📝</div>
          <div className="text-gray-500 font-medium text-2xl">No assignments yet</div>
          <div className="text-gray-400 text-lg mt-2">Add your first assignment above!</div>
        </div>
      )}
    </div>
  );
}

// Assignment Card Component for Priority Buckets
function AssignmentCard({ assignment, updateAssignmentStatus, deleteAssignment, getStatusColor, getPriorityColor, getTypeEmoji }) {
  const isOverdue = assignment.due_date && new Date(assignment.due_date) < new Date() && assignment.status !== 'completed';
  
  return (
    <div className={`assignment-card bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow mb-3 ${
      isOverdue ? 'border-red-400 bg-red-50' : 'border-purple-200'
    }`}>
      {/* Assignment Header */}
      <div className="flex items-center justify-between gap-2 text-sm mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-lg flex-shrink-0">{getTypeEmoji(assignment.type)}</span>
          
          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getStatusColor(assignment.status)} border flex-shrink-0`}>
            {assignment.status === 'in_progress' ? 'IN PROGRESS' : assignment.status.toUpperCase()}
          </span>
        </div>
        
        <button
          onClick={() => deleteAssignment(assignment.id)}
          className="text-red-400 hover:text-red-700 px-1 flex-shrink-0"
          title="Delete Assignment"
        >
          🗑️
        </button>
      </div>

      {/* Assignment Title */}
      <div className="font-semibold text-purple-900 mb-2 text-base">
        {assignment.title}
        {isOverdue && <span className="text-red-600 ml-2 text-xs font-normal">(OVERDUE)</span>}
      </div>

      {/* Assignment Details */}
      <div className="flex flex-col gap-1 text-xs text-gray-600 mb-3">
        {assignment.class_name && (
          <div className="flex items-center gap-1">
            📚 <span className="font-medium">{assignment.class_name}</span>
          </div>
        )}
        
        {assignment.due_date && (
          <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
            📅 <span>{new Date(assignment.due_date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}</span>
          </div>
        )}
      </div>

      {/* Description */}
      {assignment.description && (
        <div className="text-xs text-gray-600 mb-3 italic bg-gray-50 p-2 rounded">
          {assignment.description}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-1">
        <button
          onClick={() => updateAssignmentStatus(assignment.id, 'pending')}
          className={`cottagecore-btn cottagecore-btn-small ${
            assignment.status === 'pending' 
              ? 'cottagecore-btn-pink' 
              : 'cottagecore-btn-gray'
          }`}
          title="Mark as Pending"
        >
          📋 Pending
        </button>
        <button
          onClick={() => updateAssignmentStatus(assignment.id, 'in_progress')}
          className={`cottagecore-btn cottagecore-btn-small ${
            assignment.status === 'in_progress' 
              ? 'cottagecore-btn-blue' 
              : 'cottagecore-btn-gray'
          }`}
          title="Mark as In Progress"
        >
          ⚡ Working
        </button>
        <button
          onClick={() => updateAssignmentStatus(assignment.id, 'completed')}
          className={`cottagecore-btn cottagecore-btn-small ${
            assignment.status === 'completed' 
              ? 'cottagecore-btn-green' 
              : 'cottagecore-btn-gray'
          }`}
          title="Mark as Completed"
        >
          ✅ Done
        </button>
      </div>
    </div>
  );
}



// CalendarPicker: lets user authenticate, lists all calendars, and lets user pick one
import { useGoogleLogin } from '@react-oauth/google';

function CalendarPicker() {
  const [accessToken, setAccessToken] = useState(null);
  const [calendarList, setCalendarList] = useState([]);
  const [selectedCalendar, setSelectedCalendar] = useState('');
  const [iframeError, setIframeError] = useState(false);

  // Google OAuth for Calendar API
  const loginForCalendar = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      setAccessToken(tokenResponse.access_token);
    },
    onError: () => alert('Google Calendar authorization failed'),
  });

  // Fetch user's calendar list when accessToken is available
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
      <h2 className="text-xl font-bold text-blue-700 mb-2 text-center">📅 Google Calendar</h2>
      
      {!accessToken ? (
        <button
          className="cottagecore-btn cottagecore-btn-medium cottagecore-btn-blue w-full"
          onClick={() => loginForCalendar()}
        >
          Connect Google Calendar
        </button>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <select
              className="cottagecore-select cottagecore-input-small cottagecore-input-blue calendar-select flex-1"
              value={selectedCalendar}
              onChange={e => {
                setSelectedCalendar(e.target.value);
                setIframeError(false);
              }}
            >
              {calendarList.map(cal => (
                <option key={cal.id} value={cal.id}>
                  {cal.summary}
                </option>
              ))}
            </select>
            <button
              className="cottagecore-btn cottagecore-btn-small cottagecore-btn-blue"
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
              <div className="text-red-500 text-center p-4 bg-red-50 border border-red-200 rounded-lg">
                ⚠️ Could not load this calendar. Make sure it is public or shared.
              </div>
            ) : (
              <div className="text-blue-600 text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                📅 Select a calendar from the dropdown above
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App;