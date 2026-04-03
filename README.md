# ✈️ SkyRoute – Flight Routing & Booking System

## 📌 Overview

SkyRoute is a flight search and booking system that computes optimal routes (direct, one-stop, and two-stop flights) using graph-based algorithms.

The system integrates external aviation APIs, applies caching strategies, and ensures reliable booking transactions using PostgreSQL.

---

## 🧱 Tech Stack

### Frontend

- React
- Axios

### Backend

- Node.js
- Express.js

### Database

- PostgreSQL

### DevOps (Later Stage)

- Docker & Docker Compose
- GitHub Actions (CI/CD)
- AWS (EC2 + RDS)

---

## 📁 Project Structure

```id="8w0k79"
skyroute/
│
├── frontend/           # React application
├── backend/            # Node.js + Express API
├── database/           # DB schema, migrations, seeds
│
├── .env                # Environment variables (DO NOT COMMIT)
├── .gitignore
└── README.md
```

---

## ⚙️ Requirements

Ensure you have the following installed:

- Node.js (v18 or later)
- npm
- Git
- PostgreSQL _(or use Docker later)_

---

## 🚀 Local Setup Instructions

### 1. Clone the Repository

```id="9t7r7g"
git clone <your-repo-url>
cd skyroute
```

---

### 2. Setup Environment Variables

Create a `.env` file in the root directory:

```id="qq3i4n"
PORT=5000

DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=skyroute
DB_HOST=localhost

API_KEY=your_api_key_here
```

---

### 3. Backend Setup

```id="hv2dkg"
cd backend
npm install
npm run dev
```

Backend will run on:

```id="x5xp3h"
http://localhost:5000
```

---

### 4. Frontend Setup

Open a new terminal:

```id="n0qkff"
cd frontend
npm install
npm start
```

Frontend will run on:

```id="6fwv8g"
http://localhost:3000
```

---

### 5. Database Setup

- Install PostgreSQL locally
- Create a database:

```id="7hz3j6"
skyroute
```

- Update credentials in `.env` if needed

---

## 🌿 Branching Strategy

We follow a simple Git workflow:

### Main Branches

- `main` → stable, production-ready code
- `develop` → integration branch

---

### Feature Branches

Each task should be done in its own branch:

```id="3g0m3x"
feature/frontend-setup
feature/backend-setup
feature/api-integration
feature/routing-algorithm
```

---

### Workflow

1. Create a branch from `develop`:

```id="y0m0xk"
git checkout develop
git pull
git checkout -b feature/your-feature-name
```

2. Work and commit:

```id="t7n0fh"
git add .
git commit -m "add: short description of feature"
```

3. Push branch:

```id="zqzzy3"
git push origin feature/your-feature-name
```

4. Create a Pull Request → merge into `develop`

---

### Commit Message Style

Use clear messages:

```id="xk3gnq"
add backend structure
implement flight search endpoint
fix API error handling
```

---

## ⚠️ Notes

- Do NOT commit `.env`
- Do NOT commit `node_modules`
- Docker setup will be added later
- Ensure your local setup works before pushing code

---
