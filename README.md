# 🛡️ GUB Virtual Lab

> A Full-Stack, Stealth-Integrated Cyber Lab designed for University students.

**GUB Virtual Lab** is a highly secure, role-based, cyber-aesthetic educational platform. It gamifies the learning process by allowing an Admin (or Gatekeeper) to deploy live technical missions, which students can solve via an integrated code editor. 

With encrypted backends, real-time leaderboards, and an invisible AI biometric scanner, this platform merges education with high-stakes cybersecurity simulation.

---

## ✨ Elite Features

- 🧬 **Invisible Biometric authentication:** AI facial-recognition seamlessly detects the Super Admin through `face-api.js` and securely validates their DNA descriptor against the database.
- 💻 **Live Hacker's IDE:** Students do not just paste text. The platform features an embedded interactive `CodeMirror` terminal with live syntax highlighting for Python and JavaScript.
- 🎖️ **Dynamic Gamification:** Advanced automated Leaderboards track EXP (Execution Points) and algorithmic Badges (`🏆 [FIRST BLOOD]`, `⭐ [PRO]`).
- 🔐 **Military-Grade Encryption:** Zero plain-text. The entire SQLite database uses `bcryptjs` cryptographic salting and hashing to prevent credential leaks.
- 🎨 **Hyper-Aesthetic UI:** Designed with a stunning neural-network canvas effect, glassmorphism, and a strict terminal "Mission Protocol" vibe.

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla HTML5, CSS3, JavaScript
- **Backend:** Node.js, Express.js
- **Database:** SQLite3
- **Security:** bcryptjs
- **Plugins:** CodeMirror (IDE), Face-API.js (TensorFlow)

---

## 🚀 Quick Start (Local Launch)

To boot up the system locally on your machine:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/gub-virtual-lab.git
   cd gub-virtual-lab
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Ignite the Server:**
   ```bash
   npm start
   ```

4. **Access the Gate:** Open your web browser and navigate to `http://localhost:3000`.

---

## ☁️ Cloud Deployment (Render)

This platform is production-ready.
1. Connect this repository to your [Render](https://render.com) account.
2. Select **New Web Service**.
3. Use the build command `npm install` and start command `npm start`.
4. Deploy! 

---
*Created by Tanjim Ahmed Kingshuk (Admin Node)*
