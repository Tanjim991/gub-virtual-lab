document.addEventListener('DOMContentLoaded', () => {
    // 0. Security Guard
    if (!sessionStorage.getItem('gub_student_id')) {
        window.location.href = 'index.html';
        return;
    }

    // Retrieve the student ID saved securely during the login phase
    const sId = sessionStorage.getItem('gub_student_id') || 'UNKNOWN_NODE';
    const displayElement = document.getElementById('student-display-id');
    if (displayElement) {
        displayElement.textContent = sId;
    }

    // UX PILLAR: Auto-set ONLINE status on load
    fetch('/api/set-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_id: sId, status: 'ONLINE' })
    });

    function refreshDashboard() {
        // 0.5 Fetch My Profile Stats
        fetch(`/api/student-profile/${sId}`)
        .then(res => res.json())
        .then(data => {
            if(!data.error) {
                document.getElementById('profile-exp').textContent = data.exp;
                document.getElementById('profile-missions').textContent = data.missionsCleared;
                
                const rankEl = document.getElementById('profile-rank');
                if (data.exp > 5000) rankEl.textContent = 'PRO';
                else rankEl.textContent = 'ROOKIE';
            }
        });

    // Simple Background Canvas (Yellowish tint for student node)
    const canvas = document.getElementById('bg-canvas');
    if(canvas) {
        const ctx = canvas.getContext('2d');
        let w = canvas.width = window.innerWidth;
        let h = canvas.height = window.innerHeight;
        let particles = [];
        
        for (let i = 0; i < 40; i++) {
            particles.push({x: Math.random()*w, y: Math.random()*h, vx: (Math.random()-0.5)*0.5, vy: (Math.random()-0.5)*0.5});
        }
        
        let animationId;
        function draw() {
            ctx.clearRect(0,0,w,h);
            ctx.fillStyle = 'rgba(255, 230, 0, 0.4)'; // Yellow-gold tint
            particles.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                if(p.x<0||p.x>w) p.vx*=-1;
                if(p.y<0||p.y>h) p.vy*=-1;
                ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, Math.PI*2); ctx.fill();
            });
            animationId = requestAnimationFrame(draw);
        }
        draw();
        
        // UI PERFORMANCE PILLAR: Pause background physics when tab is inactive
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) cancelAnimationFrame(animationId);
            else draw();
        });
    }

    // Panel Navigation Logic
    const navButtons = document.querySelectorAll('.nav-btn:not(.logout-btn)');
    const panels = document.querySelectorAll('.panel');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active classes
            navButtons.forEach(b => b.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));

            // Add active class to clicked
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        const studentId = sessionStorage.getItem('gub_student_id');
        if (studentId) {
            fetch('/api/set-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ registration_id: studentId, status: 'OFFLINE' })
            }).then(() => {
                sessionStorage.clear();
                window.location.href = 'index.html';
            });
        } else {
            sessionStorage.clear();
            window.location.href = 'index.html';
        }
    });

    // 0. Fetch Announcements
    fetch('/api/announcements')
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById('announcements-container');
            if(data.announcements && data.announcements.length > 0) {
                container.innerHTML = '';
                data.announcements.forEach(ann => {
                    const date = new Date(ann.timestamp).toLocaleString();
                    container.innerHTML += `
                        <div style="margin-top: 10px; padding-bottom: 10px; border-bottom: 1px dashed rgba(0,240,255,0.2);">
                            <span style="font-family:'Share Tech Mono'; color:var(--gub-accent); font-size: 0.8rem;">[ ${date} ]</span>
                            <p style="color:var(--text-main); margin-top:5px;">${ann.message}</p>
                        </div>
                    `;
                });
            } else {
                container.innerHTML = '<p style="color:var(--text-dim); line-height:1.6; margin-top:10px;">Welcome to the GUB Central Hub. Complete missions posted by the Gatekeeper to earn EXP points and climb the ranks. The leaderboard updates in real-time.</p>';
            }
        }).catch(err => console.log('Could not load announcements.'));

    // 1. Fetch Active Missions
    fetch('/api/active-tasks')
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById('missions-container');
            if(data.tasks && data.tasks.length > 0) {
                container.innerHTML = '';
                data.tasks.forEach(task => {
                    container.innerHTML += `
                    <div class="stat-card" style="border-color: var(--gub-yellow);">
                        <h3 style="color: var(--gub-yellow); font-size:1.2rem;">${task.title}</h3>
                        <p style="color:var(--text-dim); margin-top:5px; font-family:'Share Tech Mono';">MISSION ID: #${task.id}</p>
                        <div class="number" style="font-size: 1.5rem; margin-top:10px;">+${task.reward_exp} EXP</div>
                    </div>`;
                });
            } else {
                container.innerHTML = '<p style="color:var(--text-dim);">No active missions at this time. Await Gatekeeper orders.</p>';
            }
        }).catch(err => console.log('Backend not connected.'));

    // 1.5 Fetch My Submissions (Transmission Log)
    fetch(`/api/my-submissions/${sId}`)
        .then(res => res.json())
        .then(data => {
            const tbody = document.getElementById('my-submissions-body');
            if(!tbody) return;
            tbody.innerHTML = '';
            if(data.submissions && data.submissions.length > 0) {
                data.submissions.forEach(sub => {
                    let statusColor = sub.status === 'PASSED' ? 'var(--gub-yellow)' : (sub.status === 'FAILED' ? 'var(--gub-red)' : 'var(--text-dim)');
                    tbody.innerHTML += `
                        <tr>
                            <td>#${sub.task_id}</td>
                            <td>${sub.title}</td>
                            <td style="color: ${statusColor}; font-weight: bold;">${sub.status}</td>
                        </tr>
                    `;
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-dim);">No transmissions logged.</td></tr>';
            }
        });

    // 2. Fetch Leaderboard
    fetch('/api/leaderboard')
        .then(res => res.json())
        .then(data => {
            const table = document.getElementById('leaderboard-table');
            if(data.leaderboard && data.leaderboard.length > 0) {
                let rank = 1;
                data.leaderboard.forEach(user => {
                    let rClass = rank === 1 ? 'rank-1' : '';
                    
                    // GAMIFICATION PACKAGE C: Badges based on Rank/EXP
                    let badge = '';
                    if (rank === 1) badge = '🏆 [FIRST BLOOD]';
                    else if (user.exp_points > 5000) badge = '⭐ [PRO]';
                    else badge = '💠 [ROOKIE]';

                    // BUG 2 Fix: Mask registration ID
                    let maskedId = user.registration_id.replace(/^(\d{3}-)\d{3}(-\d{3})$/, '$1***$2');
                    let statusColor = user.connection_status === 'ONLINE' ? 'var(--gub-accent)' : 'var(--text-dim)';
                    
                    table.innerHTML += `
                        <tr class="${rClass}">
                            <td>[ ${rank.toString().padStart(2, '0')} ] ${badge}</td>
                            <td>${maskedId}</td>
                            <td>${user.exp_points}</td>
                            <td style="color:${statusColor}; font-weight:bold;">${user.connection_status}</td>
                        </tr>
                    `;
                    rank++;
                });
            }
        }).catch(err => console.log('Backend not connected.'));

    // 3. Fetch Network Directory
    fetch('/api/network-directory')
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById('directory-container');
            const countSpan = document.getElementById('directory-count');
            if(data.directory) {
                countSpan.textContent = data.directory.length;
                container.innerHTML = '';
                
                let rank = 1;
                data.directory.forEach(user => {
                    let badge = '';
                    if (rank === 1) badge = '🏆 [FIRST BLOOD]';
                    else if (user.exp_points > 5000) badge = '⭐ [PRO]';
                    else badge = '💠 [ROOKIE]';
                    
                    let maskedId = user.registration_id.replace(/^(\d{3}-)\d{3}(-\d{3})$/, '$1***$2');
                    let statusIcon = user.connection_status === 'ONLINE' ? '🟢 ONLINE' : '⚪ OFFLINE';
                    
                    container.innerHTML += `
                    <div class="stat-card" style="border-color: var(--gub-accent);">
                        <h3 style="color: var(--gub-accent); font-size:1.2rem;">${user.full_name ? user.full_name.toUpperCase() : 'UNKNOWN'}</h3>
                        <p style="color:var(--text-dim); margin-top:5px; font-family:'Share Tech Mono';">NODE ID: ${maskedId}</p>
                        <p style="color:var(--text-main); margin-top:5px; font-size: 0.9rem;">${badge}</p>
                        <p style="color:${user.connection_status === 'ONLINE' ? '#00f0ff' : '#555'}; margin-top:5px; font-size: 0.8rem; font-weight:bold;">${statusIcon}</p>
                        <div class="number" style="font-size: 1.2rem; margin-top:10px;">EXP: ${user.exp_points}</div>
                    </div>`;
                    rank++;
                });
            }
        }).catch(err => console.log('Directory backend not connected.'));
    }

    refreshDashboard();
    // LIVE SYNC PILLAR: Automatically keep the student dashboard up-to-date
    setInterval(refreshDashboard, 30000); 

    // IDE Customization
    const codeTextArea = document.getElementById('code-editor-textarea');
    let editor;
    if (codeTextArea) {
        editor = CodeMirror.fromTextArea(codeTextArea, {
            mode: 'javascript',
            theme: 'monokai',
            lineNumbers: true,
            indentUnit: 4,
            matchBrackets: true
        });
        editor.setSize("100%", "200px");
    }

    const submitCodeBtn = document.getElementById('submit-code-btn');
    const submitMissionId = document.getElementById('submit-mission-id');
    const submitLog = document.getElementById('submit-log');

    if (submitCodeBtn) {
        submitCodeBtn.addEventListener('click', () => {
            const taskId = submitMissionId.value.trim();
            const code = editor ? editor.getValue().trim() : '';

            // Using dummy ID as this is just the client UI representing a logged in state
            const myId = document.getElementById('student-display-id').textContent;

            if (taskId && code) {
                submitLog.textContent = "TRANSMITTING ENCRYPTED PAYLOAD...";
                submitLog.classList.remove('hidden');
                submitLog.style.color = "var(--text-main)";

                fetch('/api/submit-task', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ registration_id: myId, task_id: taskId, code: code })
                }).then(res => res.json()).then(data => {
                    if (data.success) {
                        submitLog.textContent = ">>> SUCCESS: " + data.message;
                        submitLog.style.color = "var(--gub-accent)";
                        editor.setValue('');
                        submitMissionId.value = '';
                        refreshDashboard(); // UX PILLAR: Auto-update the submission table instantly!
                    } else {
                        submitLog.textContent = ">>> ERROR: " + data.error;
                        submitLog.style.color = "var(--gub-red)";
                    }
                    setTimeout(() => submitLog.classList.add('hidden'), 5000);
                });
            } else {
                submitLog.textContent = ">>> ERROR: Missing Protocol Data or Mission ID.";
                submitLog.classList.remove('hidden');
                submitLog.style.color = "var(--gub-red)";
                setTimeout(() => submitLog.classList.add('hidden'), 3000);
            }
        });
    }

});
