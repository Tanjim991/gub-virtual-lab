document.addEventListener('DOMContentLoaded', () => {
    // ============================================================
    // SECURITY GUARD
    // ============================================================
    if (!sessionStorage.getItem('gub_student_id')) {
        window.location.href = 'index.html';
        return;
    }

    const sId = sessionStorage.getItem('gub_student_id') || 'UNKNOWN_NODE';
    const sName = sessionStorage.getItem('gub_student_name') || sId;
    document.getElementById('student-display-id').textContent = sId;

    // Set ONLINE
    fetch('/api/set-connection', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_id: sId, status: 'ONLINE' })
    });

    // ============================================================
    // BACKGROUND CANVAS
    // ============================================================
    const canvas = document.getElementById('bg-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let w = canvas.width = window.innerWidth;
        let h = canvas.height = window.innerHeight;
        let particles = [];
        for (let i = 0; i < 40; i++) {
            particles.push({ x: Math.random()*w, y: Math.random()*h, vx: (Math.random()-0.5)*0.5, vy: (Math.random()-0.5)*0.5 });
        }
        let animId;
        function draw() {
            ctx.clearRect(0,0,w,h);
            ctx.fillStyle = 'rgba(255,230,0,0.4)';
            particles.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                if(p.x<0||p.x>w) p.vx*=-1;
                if(p.y<0||p.y>h) p.vy*=-1;
                ctx.beginPath(); ctx.arc(p.x,p.y,1.5,0,Math.PI*2); ctx.fill();
            });
            animId = requestAnimationFrame(draw);
        }
        draw();
        document.addEventListener('visibilitychange', () => { if(document.hidden) cancelAnimationFrame(animId); else draw(); });
    }

    // ============================================================
    // PANEL NAVIGATION
    // ============================================================
    const navButtons = document.querySelectorAll('.nav-btn:not(.logout-btn)');
    const panels = document.querySelectorAll('.panel');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            navButtons.forEach(b => b.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
            if (targetId === 'chat-panel') loadChat();
        });
    });

    // ============================================================
    // LOGOUT
    // ============================================================
    document.getElementById('logout-btn').addEventListener('click', () => {
        fetch('/api/set-connection', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ registration_id: sId, status: 'OFFLINE' })
        }).finally(() => { sessionStorage.clear(); window.location.href = 'index.html'; });
    });

    // ============================================================
    // BADGE SYSTEM
    // ============================================================
    function getBadges(exp, missionsCleared) {
        const badges = [];
        // Rank badges
        if (exp >= 5000) badges.push({ label: '⭐ LEGEND', cls: 'badge-legend' });
        else if (exp >= 2500) badges.push({ label: '🔴 SHADOW_MASTER', cls: 'badge-shadow' });
        else if (exp >= 1000) badges.push({ label: '🟡 CYBER_WARRIOR', cls: 'badge-warrior' });
        else if (exp >= 500)  badges.push({ label: '🟣 ELITE_HACKER', cls: 'badge-elite' });
        else if (exp >= 100)  badges.push({ label: '🔵 HACKER', cls: 'badge-hacker' });
        else                  badges.push({ label: '⚪ ROOKIE', cls: 'badge-rookie' });

        // Mission badges
        if (missionsCleared >= 20) badges.push({ label: '🎖️ MASTER', cls: 'badge-master' });
        else if (missionsCleared >= 10) badges.push({ label: '🏅 SPECIALIST', cls: 'badge-specialist' });
        else if (missionsCleared >= 5)  badges.push({ label: '🎯 OPERATIVE', cls: 'badge-operative' });
        else if (missionsCleared >= 1)  badges.push({ label: '🔰 INITIATE', cls: 'badge-initiate' });

        return badges;
    }

    function getRank(exp) {
        if (exp >= 5000) return 'LEGEND';
        if (exp >= 2500) return 'SHADOW_MASTER';
        if (exp >= 1000) return 'CYBER_WARRIOR';
        if (exp >= 500)  return 'ELITE_HACKER';
        if (exp >= 100)  return 'HACKER';
        return 'ROOKIE';
    }

    // ============================================================
    // DEADLINE HELPER
    // ============================================================
    function deadlineBadge(deadline) {
        if (!deadline) return '';
        const now = new Date();
        const dl = new Date(deadline);
        const diff = dl - now;
        if (diff < 0) return `<div class="deadline-badge deadline-over">⛔ DEADLINE PASSED</div>`;
        if (diff < 24 * 3600 * 1000) return `<div class="deadline-badge deadline-soon">⚠️ DUE: ${dl.toLocaleString()}</div>`;
        return `<div class="deadline-badge deadline-ok">🕐 DUE: ${dl.toLocaleString()}</div>`;
    }

    // ============================================================
    // REFRESH DASHBOARD DATA
    // ============================================================
    function refreshDashboard() {
        // Profile + Badges
        fetch(`/api/student-profile/${sId}`).then(r => r.json()).then(data => {
            if (!data.error) {
                document.getElementById('profile-exp').textContent = data.exp;
                document.getElementById('profile-missions').textContent = data.missionsCleared;
                document.getElementById('profile-rank').textContent = getRank(data.exp);
                // BUG 5 FIX: Show student's real name in sidebar and profile header
                const nameEl = document.getElementById('student-display-name');
                const nameProfileEl = document.getElementById('student-display-name-profile');
                const displayName = data.fullName ? data.fullName.toUpperCase() : sId;
                if (nameEl) nameEl.textContent = displayName;
                if (nameProfileEl) nameProfileEl.textContent = displayName;

                // Render badges
                const badgeContainer = document.getElementById('badge-container');
                const badges = getBadges(data.exp, data.missionsCleared);
                badgeContainer.innerHTML = badges.map(b => `<span class="badge ${b.cls}">${b.label}</span>`).join('');
            }
        });

        // Announcements
        fetch('/api/announcements').then(r => r.json()).then(data => {
            const container = document.getElementById('announcements-container');
            if (data.announcements && data.announcements.length > 0) {
                container.innerHTML = data.announcements.map(ann => `
                    <div style="margin-top:10px; padding-bottom:10px; border-bottom:1px dashed rgba(0,240,255,0.2);">
                        <span style="font-family:'Share Tech Mono'; color:var(--gub-accent); font-size:0.8rem;">[ ${new Date(ann.timestamp).toLocaleString()} ]</span>
                        <p style="color:var(--text-main); margin-top:5px;">${ann.message}</p>
                    </div>`).join('');
            } else {
                container.innerHTML = '<p style="color:var(--text-dim); line-height:1.6; margin-top:10px;">Welcome to GUB Cyber-Lab. Complete missions to earn EXP and climb the ranks!</p>';
            }
        });

        // Active Missions with deadline
        fetch('/api/active-tasks').then(r => r.json()).then(data => {
            const container = document.getElementById('missions-container');
            if (data.tasks && data.tasks.length > 0) {
                container.innerHTML = data.tasks.map(task => `
                    <div class="stat-card" style="border-color:var(--gub-yellow);">
                        <h3 style="color:var(--gub-yellow); font-size:1.2rem;">${task.title}</h3>
                        <p style="color:var(--text-dim); margin-top:5px; font-family:'Share Tech Mono';">MISSION ID: #${task.id}</p>
                        <div class="number" style="font-size:1.5rem; margin-top:10px;">+${task.reward_exp} EXP</div>
                        ${deadlineBadge(task.deadline)}
                    </div>`).join('');
            } else {
                container.innerHTML = '<p style="color:var(--text-dim);">No active missions. Await Gatekeeper orders.</p>';
            }
        });

        // My Submissions
        fetch(`/api/my-submissions/${sId}`).then(r => r.json()).then(data => {
            const tbody = document.getElementById('my-submissions-body');
            if (!tbody) return;
            if (data.submissions && data.submissions.length > 0) {
                tbody.innerHTML = data.submissions.map(sub => {
                    const color = sub.status === 'PASSED' ? 'var(--gub-yellow)' : sub.status === 'FAILED' ? 'var(--gub-red)' : 'var(--text-dim)';
                    return `<tr><td>#${sub.task_id}</td><td>${sub.title}</td><td style="color:${color}; font-weight:bold;">${sub.status}</td></tr>`;
                }).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-dim);">No transmissions logged.</td></tr>';
            }
        });

        // Leaderboard - BUG 4 FIX: Show real name + [YOU] marker
        fetch('/api/leaderboard').then(r => r.json()).then(data => {
            const table = document.getElementById('leaderboard-table');
            const header = '<tr><th>RANK</th><th>HACKER_NAME</th><th>EXP_POINTS</th><th>STATUS</th></tr>';
            if (data.leaderboard && data.leaderboard.length > 0) {
                const rows = data.leaderboard.map((user, i) => {
                    const rank = i + 1;
                    const medal = rank === 1 ? '🏆' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `[${String(rank).padStart(2,'0')}]`;
                    const displayName = user.full_name ? user.full_name.toUpperCase() : user.registration_id.replace(/^(\d{3}-)\d{3}(-\d{3})$/, '$1***$2');
                    const statusColor = user.connection_status === 'ONLINE' ? 'var(--gub-accent)' : 'var(--text-dim)';
                    const isMe = user.registration_id === sId;
                    return `<tr${isMe ? ' style="background:rgba(255,230,0,0.05);"' : ''}>
                        <td>${medal}</td>
                        <td>${displayName}${isMe ? ' <span style="color:var(--gub-yellow);font-size:0.7rem;">[YOU]</span>' : ''}</td>
                        <td>${user.exp_points}</td>
                        <td style="color:${statusColor}; font-weight:bold;">${user.connection_status}</td>
                    </tr>`;
                }).join('');
                table.innerHTML = header + rows;
            } else {
                table.innerHTML = header + '<tr><td colspan="4" style="text-align:center; color:var(--text-dim);">No ranked hackers yet.</td></tr>';
            }
        });

        // Network Directory - BUG 6 FIX: Only show ONLINE users
        fetch('/api/network-directory').then(r => r.json()).then(data => {
            const container = document.getElementById('directory-container');
            const countEl = document.getElementById('directory-count');
            if (data.directory) {
                const onlineUsers = data.directory.filter(u => u.connection_status === 'ONLINE');
                countEl.textContent = onlineUsers.length;
                if (onlineUsers.length === 0) {
                    container.innerHTML = '<p style="color:var(--text-dim); text-align:center; margin-top:20px; font-family:\'Share Tech Mono\';">No other hackers online right now.</p>';
                    return;
                }
                container.innerHTML = onlineUsers.map((user) => {
                    const maskedId = user.registration_id.replace(/^(\d{3}-)\d{3}(-\d{3})$/, '$1***$2');
                    const rankBadge = getRank(user.exp_points);
                    const isMe = user.registration_id === sId;
                    return `<div class="stat-card" style="border-color:var(--gub-accent);${isMe ? ' box-shadow:0 0 12px rgba(0,240,255,0.3);' : ''}">
                        <h3 style="color:var(--gub-accent);">${user.full_name ? user.full_name.toUpperCase() : 'UNKNOWN'}${isMe ? ' <span style="color:var(--gub-yellow);font-size:0.7rem;">[YOU]</span>' : ''}</h3>
                        <p style="color:var(--text-dim); font-family:'Share Tech Mono'; margin-top:5px;">NODE: ${maskedId}</p>
                        <p style="color:var(--gub-accent); font-size:0.8rem; font-weight:bold; margin-top:5px;">🟢 ONLINE</p>
                        <div class="number" style="font-size:1.2rem; margin-top:10px;">EXP: ${user.exp_points}</div>
                        <p style="color:var(--gub-yellow); font-family:'Share Tech Mono'; font-size:0.75rem; margin-top:5px;">${rankBadge}</p>
                    </div>`;
                }).join('');
            }
        });
    }

    refreshDashboard();
    setInterval(refreshDashboard, 30000);

    // ============================================================
    // CODE EDITOR (CodeMirror)
    // ============================================================
    let editor;
    function initEditor() {
        const ta = document.getElementById('code-editor-textarea');
        if (ta && typeof CodeMirror !== 'undefined' && !editor) {
            editor = CodeMirror.fromTextArea(ta, {
                mode: 'javascript', theme: 'monokai',
                lineNumbers: true, indentUnit: 4, matchBrackets: true,
                autoCloseBrackets: true, lineWrapping: true
            });
            editor.setSize('100%', '250px');
        }
    }
    // Try after delay (CodeMirror loads deferred)
    setTimeout(initEditor, 1000);

    document.getElementById('submit-code-btn').addEventListener('click', () => {
        const taskId = document.getElementById('submit-mission-id').value.trim();
        const code = editor ? editor.getValue().trim() : document.getElementById('code-editor-textarea').value.trim();
        const submitLog = document.getElementById('submit-log');
        if (!taskId || !code) {
            submitLog.textContent = '>>> ERROR: Missing Mission ID or Code.';
            submitLog.style.color = 'var(--gub-red)';
            submitLog.classList.remove('hidden');
            setTimeout(() => submitLog.classList.add('hidden'), 3000);
            return;
        }
        submitLog.textContent = 'TRANSMITTING ENCRYPTED PAYLOAD...';
        submitLog.style.color = 'var(--text-main)';
        submitLog.classList.remove('hidden');

        fetch('/api/submit-task', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ registration_id: sId, task_id: taskId, code })
        }).then(r => r.json()).then(data => {
            if (data.success) {
                submitLog.textContent = '>>> SUCCESS: ' + data.message;
                submitLog.style.color = 'var(--gub-accent)';
                if (editor) editor.setValue('');
                document.getElementById('submit-mission-id').value = '';
                refreshDashboard();
            } else {
                submitLog.textContent = '>>> ERROR: ' + data.error;
                submitLog.style.color = 'var(--gub-red)';
            }
            setTimeout(() => submitLog.classList.add('hidden'), 5000);
        });
    });

    // ============================================================
    // TEAM CHAT
    // ============================================================
    let lastMessageId = 0;
    let chatLoaded = false;

    function loadChat() {
        fetch('/api/messages').then(r => r.json()).then(data => {
            const container = document.getElementById('chat-messages');
            if (!data.messages || data.messages.length === 0) return;
            container.innerHTML = '';
            data.messages.forEach(msg => {
                renderMessage(msg, false);
                lastMessageId = Math.max(lastMessageId, msg.id);
            });
            container.scrollTop = container.scrollHeight;
            chatLoaded = true;
        });
    }

    function renderMessage(msg, scroll = true) {
        const container = document.getElementById('chat-messages');
        const isMine = msg.sender_id === sId;
        const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const div = document.createElement('div');
        div.className = `chat-bubble ${isMine ? 'mine' : 'theirs'}`;
        div.setAttribute('data-id', msg.id);
        div.innerHTML = `
            <div class="sender">${isMine ? 'YOU' : msg.sender_name}</div>
            <div>${msg.content.replace(/</g, '&lt;')}</div>
            <div class="time">${time}</div>
        `;
        container.appendChild(div);
        if (scroll) container.scrollTop = container.scrollHeight;
    }

    // Poll for new messages every 3 seconds when on chat panel
    setInterval(() => {
        const chatPanel = document.getElementById('chat-panel');
        if (!chatPanel.classList.contains('active')) return;
        if (!chatLoaded) { loadChat(); return; }

        fetch('/api/messages').then(r => r.json()).then(data => {
            if (!data.messages) return;
            const newMsgs = data.messages.filter(m => m.id > lastMessageId);
            newMsgs.forEach(msg => {
                renderMessage(msg, true);
                lastMessageId = Math.max(lastMessageId, msg.id);
            });
        });
    }, 3000);

    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');

    function sendChatMessage() {
        const content = chatInput.value.trim();
        if (!content) return;
        chatInput.value = '';
        fetch('/api/send-message', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender_id: sId, sender_name: sName, content })
        }).then(r => r.json()).then(data => {
            if (data.success) loadChat();
        });
    }

    chatSendBtn.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendChatMessage(); });

    // ============================================================
    // CHANGE PASSWORD
    // ============================================================
    document.getElementById('change-passkey-btn').addEventListener('click', async () => {
        const oldP = document.getElementById('old-passkey').value;
        const newP = document.getElementById('new-passkey').value;
        const confP = document.getElementById('confirm-passkey').value;
        const result = document.getElementById('passkey-result');

        if (!oldP || !newP || !confP) {
            result.textContent = 'ERROR: All fields are required.';
            result.style.color = 'var(--gub-red)';
            result.classList.remove('hidden');
            return;
        }
        if (newP !== confP) {
            result.textContent = 'ERROR: New passkeys do not match.';
            result.style.color = 'var(--gub-red)';
            result.classList.remove('hidden');
            return;
        }

        const res = await fetch('/api/change-password', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ registration_id: sId, old_passkey: oldP, new_passkey: newP })
        }).then(r => r.json());

        result.textContent = res.success ? ('✅ ' + res.message) : ('❌ ' + res.error);
        result.style.color = res.success ? 'var(--gub-accent)' : 'var(--gub-red)';
        result.classList.remove('hidden');
        if (res.success) {
            document.getElementById('old-passkey').value = '';
            document.getElementById('new-passkey').value = '';
            document.getElementById('confirm-passkey').value = '';
        }
        setTimeout(() => result.classList.add('hidden'), 5000);
    });

    // ============================================================
    // HEARTBEAT (keep online status)
    // ============================================================
    setInterval(() => {
        fetch('/api/set-connection', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ registration_id: sId, status: 'ONLINE' })
        });
    }, 60000);

    window.addEventListener('beforeunload', () => {
        navigator.sendBeacon('/api/set-connection', JSON.stringify({ registration_id: sId, status: 'OFFLINE' }));
    });
});
