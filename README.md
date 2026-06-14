<img width="1867" height="369" alt="Classivo" src="https://github.com/user-attachments/assets/cf152291-6290-431a-bf97-448f42a21586" />

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
</p>

# Classivo

### built for speed.

> Classivo is a student dashboard built by students, for students. it's lowkey private, failproof, and designed to replace the stress of traditional academic portals.

---

## Project Structure

```
classivo/
├── src/               # nextjs frontend [pwa + android app]
├── backend/           # python fastapi backend
├── android/           # capacitor android native wrapper
├── public/            # static assets and fonts
└── package.json
```

---

## What makes Classivo different?

* **failproof auth engine**
  seamlessly bypass session expired or concurrent session issues with a custom logic.
* **sub-second sync**
  zero-lag background data fetching that keeps your dashboard fresh while you chill.
* **offline first**
  your schedule, marks, and notes are always cached and available even without wifi.
* **live alerts**
  get real-time notifications for classes, exams, and marks (with special support for 2nd yr cse).
* **custom notes**
  built-in private notes for every subject. stay organized without extra apps.
* **dual visual identities**
  pick between minimalist and brutalist themes based on your vibe.
* **smart attendance tracking**
  instant calculation of margins and recovery paths for every subject.
* **academic predictions**
  advanced marks predictor to plan your path to specific target grades.
* **end-to-end encryption**
  unique device-specific keys generated locally to protect your credentials.
* **admin broadcast notifications**
  admin can push instant notifications to all students in real-time.
* **force update gate**
  admin can lock outdated app versions until students update.

### The Logic Behind Classivo

we built this to streamline the student experience. by using modern web standards and asynchronous processing, classivo provides a fluid interface that works across all your devices — browser and android app alike.

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/siddharth-1118/classivo-1
cd classivo-1
```

### 2. Backend Setup (Python FastAPI)

The backend handles the data fetching and session management logic.

```bash
cd backend
# create a virtual environment
python -m venv .venv
source .venv/bin/activate  # on Windows use: .venv\Scripts\activate

# install dependencies
pip install -r requirements.txt

# start the backend server
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup (Next.js)

The frontend is a PWA + Android app built with Next.js.

```bash
npm install

# start the development server
npm run dev
```

### 4. Environment Configuration

Create a `.env.local` file in the root directory:

```bash
# Backend URL(s) — comma-separated for load balancing
NEXT_PUBLIC_BACKEND_URLS="http://localhost:8000"

# Supabase (for realtime notifications)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-anon-key"

# Admin panel password
NEXT_PUBLIC_ADMIN_KEY="your-admin-password"

# APK download link shown in force-update overlay
NEXT_PUBLIC_APK_URL="https://your-host/classivo.apk"
```

> [!TIP]
> Deploy the backend on **Render** and the frontend on **Vercel**. Set all env vars in the Vercel dashboard under Settings → Environment Variables.

---

## Visuals

<p align="center">
  <img src="public/screenshots/mobile.jpeg" width="45%" />
  <img src="public/screenshots/attendance.jpeg" width="45%" />
</p>

---

## Technical Specs

* **frontend** nextjs with framer motion + capacitor (android)
* **backend** python fastapi
* **database** supabase (realtime notifications + user storage)
* **app** android APK via capacitor

> [!WARNING]
> ensure your backend servers have the correct cors origins set for your frontend domain.

built with heart for students who value efficiency and design.
