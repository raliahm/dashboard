

import dotenv from 'dotenv';
import fs from 'fs';
// Try to load .env.local, fallback to .env
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
  console.log('Loaded .env.local');
} else {
  dotenv.config();
  console.log('Loaded .env');
}
console.log('TURSO_DATABASE_URL:', process.env.TURSO_DATABASE_URL);

import express from 'express';
import cors from 'cors';
import todosRouter from './routes/todos.js';
import classesRouter from './routes/classes.js';
import trackersRouter from './routes/trackers.js';
import todosIdRouter from './routes/todos/[id].js';
import classesIdRouter from './routes/classes/[id].js';
import trackersIdRouter from './routes/trackers/[id].js';


const app = express();

app.use(cors());
app.use(express.json());

// Main resource routes
app.use('/api/todos', todosRouter);
app.use('/api/classes', classesRouter);
app.use('/api/trackers', trackersRouter);

// Dynamic ID routes
app.use('/api/todos', todosIdRouter);
app.use('/api/classes', classesIdRouter);
app.use('/api/trackers', trackersIdRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
