# 🛡️ GUB Cyber-Lab Platform

> **An elite, gamified virtual lab for university students — built like a hacker's command center.**

**GUB Cyber-Lab** is a full-stack, role-based, cybersecurity-aesthetic educational platform built for **Green University of Bangladesh (GUB)**. It turns learning into a mission-based experience where students earn EXP points, climb leaderboards, and solve live technical challenges through an integrated hacker-style IDE — all managed by a Super Admin "Gatekeeper."

🌐 **Live Site:** [https://gub-virtual-lab-1.onrender.com](https://gub-virtual-lab-1.onrender.com)

---

## ✨ Feature Overview (A–Z)

### 🔐 Authentication & Security
- **AI Biometric Login (Admin only)** — Face recognition via `face-api.js` + TensorFlow. The Super Admin's facial DNA is encrypted and stored. No face match = no access.
- **Passkey Login (Students)** — bcrypt-encrypted password authentication
- **Forgot Password** — Auto-generates a temporary passkey and emails it instantly
- **Confirm Passkey** — Registration requires typing the password twice to prevent typos
- **Session Guard** — Direct URL access to dashboards is blocked without a valid session

### 👑 Admin (Gatekeeper) Dashboard
- **Gatekeeper Protocol** — Approve or deny pending student registration requests
- **Member Directory** — Full unmasked list of all members (name, email, ID, role, online status)
- **Ban Hammer** — Instantly revoke access and cascade-delete all data for a user
- **Task Deployment** — Create new missions with EXP reward points; auto-emails all students
- **Code Grading** — Review student code submissions and mark PASS / FAIL
- **AI Automation Broadcast** — Type a message → AI formats it → sends to all students via email + live announcement board
- **Overview Panel** — Live stats: total members, pending requests, active tasks

### 🎓 Student Dashboard
- **Hacker's IDE** — Embedded `CodeMirror` code editor with syntax highlighting (Python, JS)
- **Mission Board** — View all active challenges and submit code solutions
- **Transmission Log** — Track every submission's PASS / FAIL status in real time
- **Live Announcements** — Admin broadcasts appear instantly, saved with timestamp
- **Leaderboard** — Ranked by EXP points with dynamic hacker badge system:
  - 🏆 `[FIRST BLOOD]` — Top scorer
  - ⭐ `[PRO]` — High performer
  - 🔰 `[INITIATE]` — New member
- **Network Directory** — See all active members with 🟢 ONLINE / ⚪ OFFLINE live status
- **Hacker Profile** — Personal EXP total and missions cleared count

### 📧 Email Automation
- ✅ Welcome email on approval
- ✅ New challenge notification on task deployment
- ✅ Broadcast emails with batch processing (50 per group — Google spam-safe)
- ✅ Forgot password recovery email
- Powered by **Nodemailer + Gmail App Password**

### 🎨 UI / Performance
- Animated neural-network canvas background
- Glassmorphism dark-mode aesthetic
- Battery saver: canvas pauses when tab is inactive
- Mobile responsive with overflow scroll support
- Auto-refresh: dashboards sync every 30 seconds

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Vanilla HTML5, CSS3, JavaScript |
| **Backend** | Node.js + Express.js |
| **Database** | Supabase (PostgreSQL) — cloud, persistent |
| **Authentication** | bcryptjs (password hashing) |
| **Email** | Nodemailer + Gmail SMTP |
| **Biometrics** | face-api.js + TensorFlow.js |
| **Code Editor** | CodeMirror |
| **Hosting** | Render.com |

---

## 🚀 Quick Start (Run Locally)

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- A [Supabase](https://supabase.com) account (free)
- A Gmail account with [App Password](https://myaccount.google.com/apppasswords) enabled

### 1. Clone the repo
```bash
git clone https://github.com/Tanjim991/gub-virtual-lab.git
cd gub-virtual-lab/GUB_Virtual_Lab
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create your `.env` file
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-16-char-app-password
ADMIN_ID=your-admin-registration-id
```

### 4. Set up the Supabase database
Run this SQL in your [Supabase SQL Editor](https://supabase.com/dashboard):

```sql
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    registration_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    passkey TEXT,
    role TEXT DEFAULT 'STUDENT',
    exp_points INTEGER DEFAULT 0,
    status TEXT DEFAULT 'PENDING',
    face_descriptor TEXT,
    email TEXT,
    connection_status TEXT DEFAULT 'OFFLINE'
);
CREATE TABLE IF NOT EXISTS tasks (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    reward_exp INTEGER DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE'
);
CREATE TABLE IF NOT EXISTS submissions (
    id BIGSERIAL PRIMARY KEY,
    registration_id TEXT NOT NULL,
    task_id BIGINT REFERENCES tasks(id),
    code TEXT,
    status TEXT DEFAULT 'PENDING'
);
CREATE TABLE IF NOT EXISTS announcements (
    id BIGSERIAL PRIMARY KEY,
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

### 5. Launch the server
```bash
npm start
```

Open `http://localhost:3000` in your browser.

---

## ☁️ Cloud Deployment (Render.com)

1. Push this repo to GitHub
2. Go to [Render](https://render.com) → **New Web Service**
3. Connect your GitHub repository
4. Set:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Root Directory:** `GUB_Virtual_Lab`
5. Add all `.env` variables in the **Environment** tab
6. Click **Deploy** ✅

---

## 🗺️ Roadmap

- [x] Biometric admin authentication
- [x] Student registration + approval system
- [x] Live leaderboard with EXP & badges
- [x] Hacker's IDE with code submission
- [x] Email automation (broadcast, welcome, task alerts)
- [x] Online/Offline member tracking
- [x] Supabase cloud database (persistent storage)
- [x] Forgot password recovery
- [ ] Profile picture upload
- [ ] Real-time chat between students
- [ ] MongoDB migration option
- [ ] Mobile app version

---

## 👤 Author

**Tanjim Ahmed Kingshuk** — *Gatekeeper Node / System Architect*
- GitHub: [@Tanjim991](https://github.com/Tanjim991)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  <strong>⚡ GUB CYBER-LAB — SYSTEM ONLINE ⚡</strong><br/>
  <em>Built for learning. Designed for dominance.</em>
</p>
