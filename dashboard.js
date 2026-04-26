document.addEventListener('DOMContentLoaded', () => {
    // 0. Security Guard
    const adminId = sessionStorage.getItem('gub_student_id');
    if (!sessionStorage.getItem('gub_admin_auth') || !adminId) {
        window.location.href = 'index.html';
        return;
    }

    // UX PILLAR: Auto-set ONLINE status on load (in case of server restart or refresh)
    fetch('/api/set-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_id: adminId, status: 'ONLINE' })
    });

    // Simple Background Canvas (Reused the logic for aesthetic consistency)
    const canvas = document.getElementById('bg-canvas');
    if(canvas) {
        const ctx = canvas.getContext('2d');
        let w = canvas.width = window.innerWidth;
        let h = canvas.height = window.innerHeight;
        let particles = [];
        
        for (let i = 0; i < 50; i++) {
            particles.push({x: Math.random()*w, y: Math.random()*h, vx: (Math.random()-0.5), vy: (Math.random()-0.5)});
        }
        
        let animationId;
        function draw() {
            ctx.clearRect(0,0,w,h);
            ctx.fillStyle = 'rgba(0, 240, 255, 0.5)';
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
    // Fetch live dashboard stats from the real Backend Server
    function refreshStats() {
        fetch('/api/dashboard-stats')
            .then(res => res.json())
            .then(data => {
                if (data) {
                    if (document.getElementById('stat-active')) document.getElementById('stat-active').textContent = data.activeHackers;
                    if (document.getElementById('stat-pending')) document.getElementById('stat-pending').textContent = data.pendingTasks;
                }
            })
            .catch(err => console.log('[SYS] Database disconnected.'));
    }

    // Dynamic Data Loading Functions
    function loadPendingUsers() {
        fetch('/api/pending-users')
            .then(res => res.json())
            .then(data => {
                const list = document.getElementById('pending-users-list');
                if(!list) return;
                list.innerHTML = '';
                if(data.users && data.users.length > 0) {
                    data.users.forEach(user => {
                        list.innerHTML += `
                            <div class="approval-card" id="req-${user.registration_id}">
                                <div class="req-info">
                                    <strong>REQ_ID:</strong> ${user.registration_id}<br>
                                    <strong>ALIAS:</strong> ${user.full_name}<br>
                                </div>
                                <div class="req-actions">
                                    <button class="cyber-btn accept" onclick="approveUser('${user.registration_id}')">GRANT_ACCESS</button>
                                </div>
                            </div>
                        `;
                    });
                } else {
                    list.innerHTML = '<p style="color:var(--text-dim);">No pending requests.</p>';
                }
            });
    }

    window.approveUser = function(id) {
        fetch('/api/approve-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ registration_id: id })
        }).then(res => res.json()).then(data => {
            const card = document.getElementById('req-' + id);
            if(card) {
                card.innerHTML = "<div style='color:var(--gub-accent)'>SUCCESS: NODE GRANTED ACCESS.</div>";
                setTimeout(loadPendingUsers, 2000);
            }
        });
    };

    function loadActiveTasks() {
        fetch('/api/active-tasks')
            .then(res => res.json())
            .then(data => {
                const list = document.getElementById('active-tasks-list');
                if(!list) return;
                list.innerHTML = '';
                if(data.tasks && data.tasks.length > 0) {
                    data.tasks.forEach(task => {
                        list.innerHTML += `
                            <div style="border: 1px dashed var(--border-color); padding: 10px; margin-bottom: 10px;">
                                <strong style="color: var(--text-main);">${task.title}</strong><br>
                                <span style="color: var(--gub-accent);">REWARD: ${task.reward_exp} EXP</span>
                            </div>
                        `;
                    });
                } else {
                    list.innerHTML = '<p style="color:var(--text-dim);">No active missions.</p>';
                }
            });
    }

    function loadLeaderboard() {
        fetch('/api/leaderboard')
            .then(res => res.json())
            .then(data => {
                const tbody = document.getElementById('leaderboard-body');
                if(!tbody) return;
                tbody.innerHTML = '';
                if(data.leaderboard && data.leaderboard.length > 0) {
                    data.leaderboard.forEach((user, index) => {
                        let rankClass = (index === 0) ? 'rank-1' : '';
                        let statusHtml = (user.connection_status === 'ONLINE') ? '<td class="status-active">ONLINE</td>' : '<td class="status-idle">OFFLINE</td>';
                        // Mask middle of ID for visual appeal
                        let maskedId = user.registration_id.replace(/^(\d{3}-)\d{3}(-\d{3})$/, '$1***$2');
                        
                        // GAMIFICATION PACKAGE C
                        let badge = '';
                        if (index === 0) badge = '🏆 [FIRST BLOOD]';
                        else if (user.exp_points > 5000) badge = '⭐ [PRO]';
                        else badge = '💠 [ROOKIE]';

                        tbody.innerHTML += `
                            <tr class="${rankClass}">
                                <td>[ 0${index + 1} ] ${badge}</td>
                                <td>${maskedId}</td>
                                <td>${user.exp_points !== null ? user.exp_points : 0}</td>
                                ${statusHtml}
                            </tr>
                        `;
                    });
                } else {
                    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No students mapped yet.</td></tr>';
                }
            });
    }

    function loadAdminDirectory() {
        fetch('/api/admin-directory')
            .then(res => res.json())
            .then(data => {
                const tbody = document.getElementById('directory-body');
                if(!tbody) return;
                tbody.innerHTML = '';
                if(data.directory && data.directory.length > 0) {
                    data.directory.forEach(user => {
                        let roleHtml = user.role === 'ADMIN' ? '<strong style="color:var(--gub-red);">[ TEACHER ]</strong>' : '<span style="color:var(--gub-yellow);">STUDENT</span>';
                        let onlineStatus = user.connection_status === 'ONLINE' ? '<strong style="color:#00f0ff;">ONLINE</strong>' : '<span style="color:#555;">OFFLINE</span>';
                        let statusHtml = user.status === 'ACTIVE' ? '<td class="status-active">ACTIVE<br>'+onlineStatus+'</td>' : '<td class="status-idle">PENDING</td>';
                        
                        tbody.innerHTML += `
                            <tr>
                                <td>${user.full_name || 'UNKNOWN'}</td>
                                <td style="color:var(--text-dim);">${user.email || 'N/A'}</td>
                                <td style="color:var(--gub-accent); font-family:'Share Tech Mono';">${user.registration_id}</td>
                                <td>${roleHtml}</td>
                                ${statusHtml}
                            </tr>
                        `;
                    });
                } else {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No users found in system.</td></tr>';
                }
            });
    }

    function autoRefresh() {
        refreshStats();
        loadPendingUsers();
        loadActiveTasks();
        loadLeaderboard();
        loadAdminDirectory();
    }
    
    autoRefresh();
    setInterval(autoRefresh, 30000); // WARN 4 Fix: Auto-refresh every 30 seconds

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
        const adminId = sessionStorage.getItem('gub_student_id');
        if (adminId) {
            fetch('/api/set-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ registration_id: adminId, status: 'OFFLINE' })
            }).then(() => {
                sessionStorage.clear();
                window.location.href = 'index.html';
            });
        } else {
            sessionStorage.clear();
            window.location.href = 'index.html';
        }
    });

    // AI Automation Mock Logic -> Real Broadcast Logic
    const aiBtn = document.getElementById('generate-ai-btn');
    const aiOutputBox = document.getElementById('ai-output-box');
    const aiResultText = document.getElementById('ai-result-text');
    const broadcastBtn = aiOutputBox.querySelector('.accept');

    aiBtn.addEventListener('click', () => {
        const prompt = document.getElementById('ai-prompt').value;
        if(prompt.length > 5) {
            aiBtn.textContent = "PROCESSING VIA NEURAL NET...";
            
            // Fake delay for AI effect
            setTimeout(() => {
                aiOutputBox.classList.remove('hidden');
                aiBtn.textContent = "GENERATE_MESSAGE";
                
                // BUG 3 Fix: The text is now dynamic based on what the admin actually typed!
                aiResultText.innerHTML = `
                    <strong style="color:var(--gub-yellow);">SUBJECT:</strong> OFFICIAL NOTICE // SYSTEM DIRECTIVE<br><br>
                    Greetings Hackers,<br><br>
                    This is an automated transmission from the Gatekeeper node: <br>
                    <em style="color:var(--text-main); font-size:1.1rem;">"${prompt}"</em><br><br>
                    Keep pushing limits.<br>
                    - GUB CSE AI GATEKEEPER
                `;
                
                // Assign the prompt to the broadcast button as a data attribute so it knows what to send
                broadcastBtn.dataset.message = prompt;
                broadcastBtn.textContent = "BROADCAST_TO_ALL";
            }, 1000);
        } else {
            alert("Prompt too short. Please enter a longer message for the AI.");
        }
    });

    broadcastBtn.addEventListener('click', () => {
        const message = broadcastBtn.dataset.message;
        if(!message) return;

        broadcastBtn.textContent = "TRANSMITTING...";
        
        fetch('/api/broadcast-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        }).then(res => res.json()).then(data => {
            if(data.success) {
                broadcastBtn.textContent = data.message ? ">>> " + data.message + " <<<" : ">>> TRANSMISSION COMPLETE <<<";
                setTimeout(() => {
                    aiOutputBox.classList.add('hidden');
                    document.getElementById('ai-prompt').value = '';
                }, 2000);
            } else {
                broadcastBtn.textContent = ">>> ERROR: " + data.error;
            }
        }).catch(err => {
            broadcastBtn.textContent = ">>> FATAL ERROR: CONNECTION FAILED.";
        });
    });

    // Approve/Reject logic moved to dynamic loadPendingUsers function

    // Super Admin Logic
    const promoteBtn = document.getElementById('promote-btn');
    const banBtn = document.getElementById('ban-btn');
    const superAdminLog = document.getElementById('super-admin-log');

    if (promoteBtn) {
        promoteBtn.addEventListener('click', () => {
            const id = document.getElementById('promote-id').value.trim();
            if(id) {
                fetch('/api/promote-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ registration_id: id })
                }).then(res => res.json()).then(data => {
                    superAdminLog.textContent = data.error ? '>>> ERROR: ' + data.error : '>>> SUCCESS: ' + data.message;
                    superAdminLog.classList.remove('hidden', 'error');
                    if(data.success) superAdminLog.classList.add('success');
                    else superAdminLog.classList.add('error');
                    document.getElementById('promote-id').value = '';
                });
            }
        });
    }

    if (banBtn) {
        banBtn.addEventListener('click', () => {
            const id = document.getElementById('ban-id').value.trim();
            if(id) {
                fetch('/api/ban-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ registration_id: id })
                }).then(res => res.json()).then(data => {
                    if (data.error) {
                        superAdminLog.innerHTML = '<strong style="color:red;">>>> ERROR:</strong> ' + data.error;
                    } else {
                        superAdminLog.innerHTML = '<strong style="color:red;">>>> EXECUTED:</strong> ' + data.message;
                    }
                    superAdminLog.classList.remove('hidden', 'success');
                    superAdminLog.classList.add('error');
                    document.getElementById('ban-id').value = '';
                });
            }
        });
    }

    // Task Deployment Logic
    const deployTaskBtn = document.getElementById('deploy-task-btn');
    const activeTasksList = document.getElementById('active-tasks-list');
    const taskLog = document.getElementById('task-log');

    if (deployTaskBtn) {
        deployTaskBtn.addEventListener('click', () => {
            const title = document.getElementById('task-title').value.trim();
            const exp = document.getElementById('task-exp').value.trim();
            
            if(title && exp) {
                fetch('/api/create-task', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, exp })
                }).then(res => res.json()).then(data => {
                    if(data.success) {
                        taskLog.innerHTML = '>>> SUCCESS: Mission broadcasted to all active nodes.';
                        taskLog.classList.remove('hidden');
                        document.getElementById('task-title').value = '';
                        document.getElementById('task-exp').value = '';
                        loadActiveTasks();
                        setTimeout(() => taskLog.classList.add('hidden'), 3000);
                    } else {
                        taskLog.innerHTML = '>>> ERROR: ' + data.error;
                        taskLog.classList.remove('hidden');
                        setTimeout(() => taskLog.classList.add('hidden'), 3000);
                    }
                });
            } else {
                taskLog.innerHTML = '>>> ERROR: Mission parameters incomplete.';
                taskLog.classList.remove('hidden');
                setTimeout(() => taskLog.classList.add('hidden'), 3000);
            }
        });
    }

    // Dynamic Grading System
    function loadPendingSubmissions() {
        fetch('/api/pending-submissions')
            .then(res => res.json())
            .then(data => {
                const tbody = document.getElementById('grading-table-body');
                if(!tbody) return;
                tbody.innerHTML = '';
                if(data.submissions && data.submissions.length > 0) {
                    data.submissions.forEach(sub => {
                        let maskedId = sub.registration_id.replace(/^(\d{3}-)\d{3}(-\d{3})$/, '$1***$2');
                        tbody.innerHTML += `
                            <tr id="sub-row-${sub.id}">
                                <td>${maskedId}</td>
                                <td>${sub.title}</td>
                                <td style="color: var(--gub-yellow);">AWAITING GRADE</td>
                                <td>
                                    <button class="cyber-btn" onclick="viewSubmissionCode('${btoa(sub.code || '')}')" style="padding: 5px 10px; font-size: 0.8rem; margin-right:5px; border-color: #00f0ff; color: #00f0ff;">VIEW</button>
                                    <button class="cyber-btn accept" onclick="gradeSubmission('${sub.id}', 'PASS')" style="padding: 5px 10px; font-size: 0.8rem;">PASS</button>
                                    <button class="cyber-btn reject" onclick="gradeSubmission('${sub.id}', 'FAIL')" style="padding: 5px 10px; font-size: 0.8rem; margin-left:10px;">FAIL</button>
                                </td>
                            </tr>
                        `;
                    });
                } else {
                    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No pending submissions.</td></tr>';
                }
            });
    }

    window.viewSubmissionCode = function(base64Code) {
        // NEW Fix: Simple submission viewer
        const codeWindow = window.open("", "_blank", "width=800,height=600,top=200,left=200");
        codeWindow.document.write("<html style='background:#0d0d0d;color:#00f0ff;font-family:monospace;'><head><title>GUB Code Viewer</title></head><body style='padding:20px;'><h2>[ SYS.CODE_REVIEW ]</h2><hr style='border-color:#00f0ff;'><pre style='white-space:pre-wrap;'>" + atob(base64Code) + "</pre></body></html>");
    };

    window.gradeSubmission = function(submissionId, action) {
        fetch('/api/grade-submission', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ submission_id: submissionId, action: action })
        }).then(res => res.json()).then(data => {
            const row = document.getElementById('sub-row-' + submissionId);
            if(row) {
                if(action === 'PASS') {
                    row.innerHTML = '<td colspan="4" style="text-align:center; color:var(--gub-yellow); font-weight:bold;">GRADE SUBMITTED: EXP AWARDED.</td>';
                } else {
                    row.innerHTML = '<td colspan="4" style="text-align:center; color:var(--gub-red); font-weight:bold;">MISSION FAILED.</td>';
                }
                setTimeout(() => {
                    loadPendingSubmissions();
                    loadLeaderboard();
                }, 2000);
            }
        });
    };

    loadPendingSubmissions();

    // Face AI Enrollment Logic
    const initEnrollBtn = document.getElementById('init-enroll-btn');
    const captureEnrollBtn = document.getElementById('capture-enroll-btn');
    const enrollVideoContainer = document.getElementById('enroll-video-container');
    const enrollVideo = document.getElementById('enroll-video');
    const enrollLog = document.getElementById('enroll-log');

    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
    let modelsLoaded = false;
    let enrollStream = null;

    if (initEnrollBtn) {
        initEnrollBtn.addEventListener('click', async () => {
            enrollLog.textContent = '[SYS] Loading Neural Network Models (Downloading 5MB+ weights...)';
            enrollLog.classList.remove('hidden');
            enrollLog.style.color = '#00f0ff';
            
            try {
                if (!modelsLoaded) {
                    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
                    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
                    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
                    modelsLoaded = true;
                }
                
                enrollLog.textContent = 'Models loaded. Securing Camera Access...';
                
                // Explicitly request the front-facing camera!
                enrollStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
                enrollVideo.srcObject = enrollStream;
                await new Promise(resolve => {
                    enrollVideo.onloadedmetadata = () => {
                        enrollVideo.play();
                        resolve();
                    };
                });
                enrollVideoContainer.classList.remove('hidden');
                
                initEnrollBtn.classList.add('hidden');
                captureEnrollBtn.classList.remove('hidden');
                enrollLog.textContent = 'Look straight at the camera to map 68 topological landmarks.';
            } catch (err) {
                enrollLog.style.color = 'var(--gub-red)';
                enrollLog.textContent = 'ERROR CONNECTING AI: ' + err.message;
            }
        });
    }

    if (captureEnrollBtn) {
        captureEnrollBtn.addEventListener('click', async () => {
            enrollLog.textContent = 'SCANNING PHYSICAL FACE DATA...';
            
            // Detect face with higher tolerance for mobile cameras
            const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 });
            const detection = await faceapi.detectSingleFace(enrollVideo, options).withFaceLandmarks().withFaceDescriptor();
            
            if (!detection) {
                enrollLog.style.color = 'var(--gub-red)';
                enrollLog.textContent = 'NO FACE DETECTED. Please ensure lighting is adequate.';
                return;
            }
            
            enrollLog.style.color = '#00f0ff';
            enrollLog.textContent = 'FACE DNA GENERATED. UPLOADING TO ROOT DATABASE...';
            
            // The descriptor is a Float32Array. We convert to array for JSON.
            const descriptorArray = Array.from(detection.descriptor);
            
            try {
                const response = await fetch('/api/enroll-face', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ registration_id: '251-013-001', face_descriptor: descriptorArray })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    enrollLog.style.color = 'var(--gub-accent)';
                    enrollLog.textContent = '>>> SUCCESS: Master Face mapped permanently.';
                    captureEnrollBtn.classList.add('hidden');
                    // Stop camera
                    enrollStream.getTracks().forEach(track => track.stop());
                } else {
                    throw new Error(data.error);
                }
            } catch (err) {
                 enrollLog.style.color = 'var(--gub-red)';
                 enrollLog.textContent = 'DATABASE ERROR: ' + err.message;
            }
        });
    }

    // ============================================================
    // ANALYTICS
    // ============================================================
    function loadAnalytics() {
        fetch('/api/analytics').then(r => r.json()).then(data => {
            document.getElementById('an-total').textContent = data.totalStudents;
            document.getElementById('an-active').textContent = data.activeStudents;
            document.getElementById('an-pending').textContent = data.pendingStudents;
            document.getElementById('an-online').textContent = data.onlineNow;
            document.getElementById('an-tasks').textContent = data.totalTasks;
            document.getElementById('an-submissions').textContent = data.totalSubmissions;
            document.getElementById('an-passed').textContent = data.passedSubmissions;
            document.getElementById('an-rate').textContent = data.passRate + '%';
        });
    }

    // ============================================================
    // ADMIN CHAT
    // ============================================================
    let adminLastMsgId = 0;
    let adminChatLoaded = false;

    function loadAdminChat() {
        fetch('/api/messages').then(r => r.json()).then(data => {
            const container = document.getElementById('admin-chat-messages');
            if (!data.messages || data.messages.length === 0) {
                container.innerHTML = '<p style="color:var(--text-dim); font-family:\'Share Tech Mono\'; font-size:0.8rem; text-align:center;">-- NO MESSAGES YET --</p>';
                return;
            }
            container.innerHTML = '';
            data.messages.forEach(msg => renderAdminMsg(msg, false));
            container.scrollTop = container.scrollHeight;
            adminLastMsgId = Math.max(...data.messages.map(m => m.id));
            adminChatLoaded = true;
        });
    }

    function renderAdminMsg(msg, scroll = true) {
        const container = document.getElementById('admin-chat-messages');
        const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const isAdmin = msg.sender_id === adminId;
        const div = document.createElement('div');
        div.style.cssText = `padding:10px 14px; border-radius:8px; font-family:'Share Tech Mono',monospace; font-size:0.82rem; max-width:80%; ${isAdmin ? 'align-self:flex-end; background:rgba(255,0,50,0.1); border:1px solid rgba(255,0,50,0.3); color:#fff;' : 'align-self:flex-start; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#ccc;'} cursor:pointer; word-break:break-word;`;
        div.setAttribute('title', 'Click to delete');
        div.innerHTML = `<div style="font-size:0.7rem; color:${isAdmin?'var(--gub-red)':'var(--gub-accent)'}; margin-bottom:4px;">${isAdmin ? '[ADMIN]' : msg.sender_name} • ${time}</div>${msg.content.replace(/</g,'&lt;')}`;
        div.addEventListener('click', () => {
            if (confirm('Delete this message?')) {
                fetch('/api/messages/' + msg.id, { method: 'DELETE' }).then(() => { div.remove(); });
            }
        });
        container.appendChild(div);
        if (scroll) container.scrollTop = container.scrollHeight;
    }

    setInterval(() => {
        const chatPanel = document.getElementById('chat-panel');
        if (!chatPanel || !chatPanel.classList.contains('active')) return;
        if (!adminChatLoaded) { loadAdminChat(); return; }
        fetch('/api/messages').then(r => r.json()).then(data => {
            if (!data.messages) return;
            const newMsgs = data.messages.filter(m => m.id > adminLastMsgId);
            newMsgs.forEach(msg => { renderAdminMsg(msg); adminLastMsgId = Math.max(adminLastMsgId, msg.id); });
        });
    }, 3000);

    const adminChatSend = document.getElementById('admin-chat-send');
    const adminChatInput = document.getElementById('admin-chat-input');
    if (adminChatSend) {
        function sendAdminMsg() {
            const content = adminChatInput.value.trim();
            if (!content) return;
            adminChatInput.value = '';
            fetch('/api/send-message', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sender_id: adminId, sender_name: 'ADMIN', content })
            }).then(() => loadAdminChat());
        }
        adminChatSend.addEventListener('click', sendAdminMsg);
        adminChatInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendAdminMsg(); });
    }

    // ============================================================
    // PANEL NAV — hook Analytics & Chat load
    // ============================================================
    document.querySelectorAll('.nav-btn:not(.logout-btn)').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-target');
            if (target === 'analytics-panel') loadAnalytics();
            if (target === 'chat-panel') loadAdminChat();
        });
    });

});
