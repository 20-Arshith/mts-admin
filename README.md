# MTS INDIA

This repository contains the backend API and four frontend apps used by the MTS platform.

## Apps

- Backend API: `backend`
- Admin dashboard: `frontend/mts-project/admin-dashboard`
- Agent app: `frontend/mts-project/agent/agent-app`
- User app: `frontend/mts-project/USER/react_native_app`
- Vendor app: `frontend/mts-project/vendor`

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL running locally on `localhost:5432`

## Backend setup

1. Copy `backend/.env.example` to `backend/.env`

2. Install packages:

```bash
cd backend
npm install
```

3. Sync the database schema:

```bash
cd backend
npx prisma db push
```

4. Seed sample data:

```bash
cd backend
node prisma/seed.js
```

5. Start the API:

```bash
cd backend
npm run dev
```

The backend runs on `http://localhost:3000`.

## Frontend setup

Install dependencies in each app once:

### Admin dashboard

```bash
cd frontend/mts-project/admin-dashboard
npm install
```

### Agent app

```bash
cd frontend/mts-project/agent/agent-app
npm install
```

### User app

```bash
cd frontend/mts-project/USER/react_native_app
npm install
```

### Vendor app

```bash
cd frontend/mts-project/vendor
npm install
```

## Mobile app environment setup

Create `.env` files from these examples:

- `frontend/mts-project/vendor/.env.example`
- `frontend/mts-project/USER/react_native_app/.env.example`
- `frontend/mts-project/agent/agent-app/.env.example`

Example:

```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LOCAL_IP:3000/api
```

Use your computer LAN IP, not `localhost`, for Expo Go on mobile.

## Frontend environment files

Use these files and variables for each frontend app.

### Admin dashboard

File:

```env
frontend/mts-project/admin-dashboard/.env
```

Variable:

```env
VITE_BASE_URL=http://54.147.40.109/
```

### Agent app

File:

```env
frontend/mts-project/agent/agent-app/.env
```

Variable:

```env
EXPO_PUBLIC_API_BASE_URL=http://54.147.40.109/
```

### User app

File:

```env
frontend/mts-project/USER/react_native_app/.env
```

Variable:

```env
EXPO_PUBLIC_API_BASE_URL=http://54.147.40.109/
```

### Vendor app

File:

```env
frontend/mts-project/vendor/.env
```

Variable:

```env
EXPO_PUBLIC_API_BASE_URL=http://54.147.40.109/
```

### Notes for production builds

- Mobile APK builds use `eas.json` and already inject `EXPO_PUBLIC_API_BASE_URL=http://54.147.40.109/`
- The Android mobile apps are configured to allow HTTP traffic to `http://54.147.40.109/`
- Keep `.env` files local and commit only `.env.example`

## Run apps

### Admin dashboard

```bash
cd frontend/mts-project/admin-dashboard
npm run dev
```

### Agent app

```bash
cd frontend/mts-project/agent/agent-app
npm start
```

### User app

```bash
cd frontend/mts-project/USER/react_native_app
npm start
```

### Vendor app

```bash
cd frontend/mts-project/vendor
npm start
```

## Admin login

For local seeded testing:

- Mobile: `0000000000`
- OTP: `123456`

## Notes

- Do not commit `.env` files with real secrets.
- `node_modules` should not be committed.
- Lockfiles are included so a fresh machine can reproduce installs.
- If Expo caches old code, restart the app process after pulling new changes.
- Keep phone and laptop on the same Wi-Fi when using Expo Go.
