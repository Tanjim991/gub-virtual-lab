document.addEventListener('DOMContentLoaded', () => {
    // ---- Neural Network Canvas Animation ----
    const canvas = document.getElementById('network-canvas');
    const ctx = canvas.getContext('2d');
    
    let width, height, particles;
    
    function initCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        particles = [];
        const particleCount = window.innerWidth < 768 ? 40 : 100;
        
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 1.5,
                vy: (Math.random() - 0.5) * 1.5,
                radius: Math.random() * 2 + 1
            });
        }
    }
    
    let mouse = { x: null, y: null };
    window.addEventListener('mousemove', (e) => { mouse.x = e.x; mouse.y = e.y; });
    
    let animationId;
    function animate() {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(0, 240, 255, 0.5)';
        
        particles.forEach((p, index) => {
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0 || p.x > width) p.vx *= -1;
            if (p.y < 0 || p.y > height) p.vy *= -1;
            
            if (mouse.x != null) {
                let dx = mouse.x - p.x;
                let dy = mouse.y - p.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 150) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(0, 240, 255, ${1 - distance/150})`;
                    ctx.lineWidth = 1;
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.stroke();
                }
            }
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            
            for (let j = index + 1; j < particles.length; j++) {
                let p2 = particles[j];
                let dx = p.x - p2.x;
                let dy = p.y - p2.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 120) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(0, 240, 255, ${0.15 - distance/800})`; 
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        });
        animationId = requestAnimationFrame(animate);
    }
    initCanvas(); animate(); window.addEventListener('resize', initCanvas); window.addEventListener('mouseout', () => { mouse.x = null; mouse.y = null; });
    
    // UI PERFORMANCE PILLAR: Pause background physics when tab is inactive
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) cancelAnimationFrame(animationId);
        else animate();
    });

    // ---- Fetch Public Stats ----
    fetch('/api/dashboard-stats')
        .then(res => res.json())
        .then(data => {
            const countEl = document.getElementById('public-node-count');
            if (countEl && data) countEl.textContent = data.activeHackers || 0;
        })
        .catch(err => console.log('Cannot fetch public stats'));

    // ---- UI & Biometric Logic ----
    const tabLogin = document.getElementById('tab-login');
    const tabRequest = document.getElementById('tab-request');
    const emailGroup = document.getElementById('email-group');
    const passwordGroup = document.getElementById('password-group');
    const confirmPasswordGroup = document.getElementById('confirm-password-group');
    const biometricGroup = document.getElementById('biometric-group');
    const submitBtn = document.getElementById('submit-btn');
    const forgotPasswordContainer = document.getElementById('forgot-password-container');
    const forgotPasswordBtn = document.getElementById('forgot-password-btn');
    const regNumberInput = document.getElementById('reg-number');
    const authForm = document.getElementById('auth-form');
    let errorMessage = document.getElementById('error-message');
    let successMessage = document.getElementById('success-message');

    let isLoginMode = true;
    const regNumberRegex = /^\d{3}-\d{3}-\d{3}$/;
    const HIGH_CLEARANCE_IDS = ["251-013-001"]; // Admin & Teacher IDs
    let streamRef = null;

    function showMessage(element, msg) { element.textContent = msg; element.classList.remove('hidden'); }
    function hideMessages() { errorMessage.classList.add('hidden'); successMessage.classList.add('hidden'); }

    // Dynamic Role Check
    regNumberInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, ''); 
        if (val.length > 9) val = val.substring(0, 9); 
        let formatted = '';
        if (val.length > 0) formatted += val.substring(0, 3);
        if (val.length > 3) formatted += '-' + val.substring(3, 6);
        if (val.length > 6) formatted += '-' + val.substring(6, 9);
        e.target.value = formatted;

        if (isLoginMode) {
            if (HIGH_CLEARANCE_IDS.includes(formatted)) {
                // Activate Admin Biometric Mode!
                document.body.classList.add('admin-mode');
                passwordGroup.classList.add('hidden');
                biometricGroup.classList.remove('hidden');
                submitBtn.classList.add('hidden');
                startBiometricScan();
            } else {
                // Standard Student Mode
                document.body.classList.remove('admin-mode');
                passwordGroup.classList.remove('hidden');
                biometricGroup.classList.add('hidden');
                submitBtn.classList.remove('hidden');
                stopBiometricScan();
            }
        }
    });

    async function startBiometricScan() {
        if(streamRef) return; // already running
        
        const videoObj = document.getElementById('webcam-video');
        const overlay = document.getElementById('scanner-overlay');
        overlay.textContent = "LOADING NEURAL NETWORKS (5MB)...";
        overlay.style.color = "var(--text-main)";

        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
        
        try {
            await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
            await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
            
            overlay.textContent = "FETCHING SECURE DNA FROM SERVER...";
            const dnaRes = await fetch('/api/get-admin-face');
            const dnaData = await dnaRes.json();
            
            if(!dnaRes.ok || !dnaData.face_descriptor) {
                overlay.textContent = "FATAL ERROR: DNA NOT ENROLLED YET.";
                overlay.style.color = "var(--gub-red)";
                return;
            }
            
            const adminDescriptor = new Float32Array(dnaData.face_descriptor);

            overlay.textContent = "INITIALIZING WEBCAM...";
            // Explicitly request the front-facing ("user") camera so mobile phones don't use the back camera!
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
            streamRef = stream;
            videoObj.srcObject = stream;
            // Wait for video dimensions to load before starting AI detection (Critical for Mobile)
            await new Promise(resolve => {
                videoObj.onloadedmetadata = () => {
                    videoObj.play();
                    resolve();
                };
            });
            
            overlay.textContent = "SCANNING VITAL SIGNS & FACE...";

            // BUG FIX: Prevent "bucket overflow" by using recursive scanning instead of setInterval.
            // This ensures slow phones don't crash by piling up unfinished AI scans.
            let isScanning = true;
            async function scanLoop() {
                if (!streamRef || !isScanning) return;
                
                try {
                    const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 });
                    const detection = await faceapi.detectSingleFace(videoObj, options).withFaceLandmarks().withFaceDescriptor();
                    
                    if(detection) {
                        const distance = faceapi.euclideanDistance(detection.descriptor, adminDescriptor);
                        if (distance < 0.55) { // Strict identity threshold
                            isScanning = false;
                            overlay.textContent = "MATCH FOUND! AUTH T.A.KINGSHUK";
                            overlay.style.color = "var(--gub-accent)";
                            sessionStorage.setItem('gub_admin_auth', 'true');
                            sessionStorage.setItem('gub_student_id', '251-013-001');
                            sessionStorage.setItem('gub_user_role', 'ADMIN');
                            
                            // Set Admin Online in DB
                            fetch('/api/set-connection', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ registration_id: '251-013-001', status: 'ONLINE' })
                            });
                            
                            setTimeout(() => window.location.href = "dashboard.html", 1500);
                            return; // Stop loop
                        } else {
                            overlay.textContent = "ACCESS DENIED: IDENTITY MISMATCH.";
                            overlay.style.color = "var(--gub-red)";
                        }
                    } else {
                        overlay.textContent = "NO FACE DETECTED.";
                        overlay.style.color = "var(--text-dim)";
                    }
                } catch (e) {
                    console.log("Scan frame dropped.");
                }
                
                // Wait 500ms BEFORE starting the next scan, giving the phone CPU time to breathe
                if(isScanning) setTimeout(scanLoop, 500);
            }
            
            scanLoop(); // Start the loop

        } catch (error) {
            overlay.textContent = "BIOMETRIC SYSTEM PORT BLOCKED.";
            overlay.style.color = "var(--gub-red)";
        }
    }

    function stopBiometricScan() {
        if(streamRef) {
            streamRef.getTracks().forEach(track => track.stop());
            streamRef = null;
        }
    }

    tabLogin.addEventListener('click', () => {
        isLoginMode = true; stopBiometricScan();
        tabLogin.classList.add('active'); tabRequest.classList.remove('active');
        emailGroup.classList.add('hidden'); passwordGroup.classList.remove('hidden'); biometricGroup.classList.add('hidden');
        confirmPasswordGroup.classList.add('hidden');
        forgotPasswordContainer.classList.remove('hidden');
        submitBtn.classList.remove('hidden'); submitBtn.textContent = 'INITIATE_UPLINK'; hideMessages();
        const pwdLabel = document.getElementById('password-label');
        if(pwdLabel) pwdLabel.innerText = 'PASSKEY (STUDENT CLEARANCE)';
        document.body.classList.remove('admin-mode');
        regNumberInput.value = ''; // clear to reset state
    });

    tabRequest.addEventListener('click', () => {
        isLoginMode = false; stopBiometricScan(); document.body.classList.remove('admin-mode');
        tabRequest.classList.add('active'); tabLogin.classList.remove('active');
        emailGroup.classList.remove('hidden'); passwordGroup.classList.remove('hidden'); biometricGroup.classList.add('hidden');
        confirmPasswordGroup.classList.remove('hidden');
        forgotPasswordContainer.classList.add('hidden');
        submitBtn.classList.remove('hidden'); submitBtn.textContent = 'SUBMIT_REQUEST'; hideMessages();
        const pwdLabel = document.getElementById('password-label');
        if(pwdLabel) pwdLabel.innerText = 'CREATE YOUR PASSKEY';
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideMessages();

        const regVal = regNumberInput.value.trim();

        if (!regNumberRegex.test(regVal)) { showMessage(errorMessage, "ERROR 403: Invalid Registration Format."); return; }

        try {
            if (isLoginMode) {
                const passwordVal = document.getElementById('password').value;
                if (passwordVal === '') { showMessage(errorMessage, "ERROR 401: Passkey cannot be empty."); return; }
                
                const response = await fetch('/api/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ registration_id: regVal, passkey: passwordVal })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Save the ID in temporary browser memory so the Dashboard knows who we are!
                    sessionStorage.setItem('gub_student_id', data.user.id);
                    sessionStorage.setItem('gub_user_role', data.user.role);
                    
                    showMessage(successMessage, "AUTH GRANTED. Welcome " + data.user.name);
                    setTimeout(() => {
                        if (data.user.role === 'ADMIN' || data.user.role === 'TEACHER') {
                            sessionStorage.setItem('gub_admin_auth', 'true');
                            window.location.href = "dashboard.html";
                        } else {
                            window.location.href = "student_dashboard.html";
                        }
                    }, 1000);
                } else {
                    showMessage(errorMessage, data.error || "ACCESS DENIED.");
                }

            } else {
                const emailVal = document.getElementById('student-email').value.trim();
                const studentPasskey = document.getElementById('password').value;
                const confirmPasskey = document.getElementById('confirm-password').value;
                
                if (emailVal === '') { showMessage(errorMessage, "ERROR: Email Address required for notifications."); return; }
                if (studentPasskey === '') { showMessage(errorMessage, "ERROR: You must define a Passkey."); return; }
                if (studentPasskey !== confirmPasskey) { showMessage(errorMessage, "CRITICAL ERROR: Passkeys do not match. Verify your input."); return; }
                
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ registration_id: regVal, full_name: emailVal.split('@')[0], email: emailVal, passkey: studentPasskey })
                });

                const data = await response.json();
                
                if (response.ok) {
                    showMessage(successMessage, data.message);
                    authForm.reset();
                } else {
                    showMessage(errorMessage, data.error || "SERVER ERROR.");
                }
            }
        } catch (error) {
            showMessage(errorMessage, "CRITICAL ERROR: Unable to connect to Backend Server.");
        }
    });

    forgotPasswordBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        hideMessages();
        
        const regVal = regNumberInput.value.trim();
        if (!regNumberRegex.test(regVal)) { 
            showMessage(errorMessage, "ERROR: Please enter a valid REGISTRATION_ID above first."); 
            return; 
        }

        forgotPasswordBtn.textContent = '[ TRANSMITTING... ]';
        forgotPasswordBtn.style.pointerEvents = 'none';

        try {
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ registration_id: regVal })
            });
            const data = await response.json();
            
            if (response.ok) {
                showMessage(successMessage, data.message || "A new passkey has been transmitted to your email.");
            } else {
                showMessage(errorMessage, data.error || "SERVER ERROR.");
            }
        } catch (error) {
            showMessage(errorMessage, "CRITICAL ERROR: Unable to connect to Backend Server.");
        } finally {
            forgotPasswordBtn.textContent = '[ FORGOT_PASSKEY? ]';
            forgotPasswordBtn.style.pointerEvents = 'auto';
        }
    });
});
