# TaskFlow — Real-Time Collaborative Task Management Board

TaskFlow is a full-stack task management application that helps individuals and teams organize work, manage tasks, track progress, and collaborate in real time.

**Live Demo:** https://realtime-task-management-board.vercel.app/

## Features

- **Authentication:** User registration, login, and logout.
- **Workspaces:** Create workspaces and collaborate with members.
- **Boards and Columns:** Organize projects using customizable task boards.
- **Task Management:** Create, edit, delete, assign, and prioritize tasks.
- **Drag and Drop:** Move tasks between columns and reorder them.
- **Real-Time Collaboration:** Receive task updates across connected users without refreshing.
- **Comments:** Discuss tasks with workspace members.
- **Notifications:** Receive notifications about relevant task activity.
- **Activity History:** Track important workspace and task events.
- **Analytics:** View task statistics, priorities, and progress.
- **Advanced Search and Filters:** Find tasks by keywords, priority, assignee, due date, and overdue status.
- **Responsive UI:** Use the application on desktop, tablet, and mobile devices.
- **Access Control:** Workspace membership and role-based permissions.

## Technology Stack

### Frontend
- React
- Vite
- React Router
- Axios
- Tailwind CSS
- dnd-kit
- Lucide React

### Backend
- Python
- Django
- Django REST Framework
- Django Channels
- Daphne
- WebSockets

### Database and Infrastructure
- PostgreSQL (Neon)
- SQLite (local development fallback)
- Redis-compatible service (Render Key Value / Memurai)
- WhiteNoise
- Render
- Vercel

## Architecture

- React provides the user interface.
- Django REST Framework handles HTTP APIs.
- Django Channels and WebSockets deliver real-time task updates.
- PostgreSQL stores deployed application data.
- Redis-compatible infrastructure supports WebSocket communication.

## Local Development Setup

### Prerequisites

- Python
- Node.js and npm
- Git
- Memurai or another Redis-compatible server

### 1. Clone the repository

```bash
git clone https://github.com/yogesh180303/realtime-task-management-board.git
cd realtime-task-management-board
```

### 2. Configure the backend

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment on Windows:

```powershell
.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create your local `.env` file using `.env.example` as a reference. Configure the secret key, development settings, and local Redis URL. Leave `DATABASE_URL` unset to use the local SQLite database.

Apply migrations:

```bash
python manage.py migrate
```

Start the backend using Daphne:

```bash
python -m daphne -b 127.0.0.1 -p 8000 config.asgi:application
```

### 3. Configure the frontend

Open a second terminal:

```bash
cd frontend
npm install
```

Create a local `.env` file using `.env.example` as a reference.

Start the frontend:

```bash
npm run dev
```

Open the local Vite URL displayed in your terminal.

## Deployment

- **Frontend:** Vercel
- **Backend:** Render
- **Database:** Neon PostgreSQL
- **Real-Time Infrastructure:** Render Key Value

The live application is available at:

https://realtime-task-management-board.vercel.app/

## Testing and Quality

- Backend automated test suite: 101 tests passed.
- Frontend ESLint checks passed.
- Frontend production build completed successfully.
- Dependency vulnerability checks completed with no known vulnerabilities reported at the time of testing.
- Real-time task creation, updates, and deletion were tested across browser sessions.

## Repository

GitHub: https://github.com/yogesh180303/realtime-task-management-board

## Project Purpose

This project was developed as a full-stack portfolio project to demonstrate practical skills in web development, REST API design, authentication, database management, real-time communication, collaborative application design, testing, and cloud deployment.