# Dashboard Monorepo

This project is a single-page dashboard application with a React (Vite) frontend and a Node.js/Express backend. The backend will use SQLite for persistent storage of all task-related items.

## Features
- Todo-list
- Google Calendar integration
- Class attendance tracker
- Homework/task tracker
- Canvas-style due date overview
- Cottagecore/pastel theme with animated, interactive UI

## Getting Started

### Frontend
1. Install dependencies:
   ```sh
   npm install
   ```
2. Start the development server:
   ```sh
   npm run dev
   ```

### Backend
1. Go to the backend folder:
   ```sh
   cd backend
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the backend server:
   ```sh
   npm start
   ```

The backend runs on port 4000 by default.

## Notes
- The backend is currently a dummy server with in-memory data. Postgres integration will be added next.
- Google Calendar and Canvas API integrations are placeholders and should be implemented as needed.
- For the cottagecore/pastel theme, use CSS variables and animated SVGs or Lottie files for interactive elements.

---

For more details, see `.github/copilot-instructions.md`.
