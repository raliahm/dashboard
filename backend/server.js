// Dummy Express backend for dashboard
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();

const path = require('path');
const app = express();
const PORT = 4000;

app.use(cors());
app.use(bodyParser.json());

// SQLite connection
const dbPath = path.join(__dirname, 'dashboard.sqlite');
const db = new sqlite3.Database(dbPath);

// Ensure todos table exists
// id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT, done INTEGER (0/1)
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    done INTEGER DEFAULT 0
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS attended_classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    attended INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0
  )`);
});

// --- SQLite-based Todos ---
app.get('/api/todos', (req, res) => {
  db.all('SELECT * FROM todos ORDER BY id', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    // Convert done from 0/1 to boolean
    res.json(rows.map(row => ({ ...row, done: !!row.done })));
  });
});

app.post('/api/todos', (req, res) => {
  const { text, done } = req.body;
  db.run(
    'INSERT INTO todos (text, done) VALUES (?, ?)',
    [text, done ? 1 : 0],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM todos WHERE id = ?', [this.lastID], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ...row, done: !!row.done });
      });
    }
  );
});

app.patch('/api/todos/:id', (req, res) => {
  const id = Number(req.params.id);
  const { text, done } = req.body;
  db.run(
    'UPDATE todos SET text = ?, done = ? WHERE id = ?',
    [text, done ? 1 : 0, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM todos WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ...row, done: !!row.done });
      });
    }
  );
});

app.delete('/api/todos/:id', (req, res) => {
  const id = Number(req.params.id);
  db.run('DELETE FROM todos WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// --- SQLite-based Attended Classes ---
app.get('/api/classes', (req, res) => {
  db.all('SELECT * FROM attended_classes ORDER BY id', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/classes', (req, res) => {
  const { name, attended, total } = req.body;
  db.run(
    'INSERT INTO attended_classes (name, attended, total) VALUES (?, ?, ?)',
    [name, attended || 0, total || 0],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM attended_classes WHERE id = ?', [this.lastID], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
      });
    }
  );
});

app.patch('/api/classes/:id', (req, res) => {
  const id = Number(req.params.id);
  const { name, attended, total } = req.body;
  db.run(
    'UPDATE attended_classes SET name = ?, attended = ?, total = ? WHERE id = ?',
    [name, attended, total, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM attended_classes WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
      });
    }
  );
});

app.delete('/api/classes/:id', (req, res) => {
  const id = Number(req.params.id);
  db.run('DELETE FROM attended_classes WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});



// Classes endpoints
app.get('/api/classes', (req, res) => res.json(classes));
app.patch('/api/classes/:id', (req, res) => {
  const id = Number(req.params.id);
  classes = classes.map(c => c.id === id ? { ...c, ...req.body } : c);
  res.json(classes.find(c => c.id === id));
});

/*// Todos endpoints
// Homework endpoints
app.get('/api/homeworks', (req, res) => res.json(homeworks));
app.post('/api/homeworks', (req, res) => {
  const hw = { id: Date.now(), ...req.body };
  homeworks.push(hw);
  res.json(hw);
});
app.patch('/api/homeworks/:id', (req, res) => {
  const id = Number(req.params.id);
  homeworks = homeworks.map(h => h.id === id ? { ...h, ...req.body } : h);
  res.json(homeworks.find(h => h.id === id));
});

// Canvas due dates overview (dummy)
app.get('/api/canvas-due', (req, res) => {
  res.json([
    { title: 'HW1', dueDate: '2025-07-20' },
    { title: 'Project', dueDate: '2025-07-25' },
  ]);
});
*/

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
