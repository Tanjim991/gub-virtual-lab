require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const supabase = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..'))); // Serve HTML/CSS from parent folder

// --- Email Helper ---
function createTransporter() {
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
}

async function sendEmail(to, subject, html) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
    try {
        await createTransporter().sendMail({
            from: `"GUB Gatekeeper Protocol" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        });
    } catch (e) {
        console.error('[EMAIL ERROR]', e.message);
    }
}

// ============================================================
// 1. AUTH ENDPOINT (Login)
// ============================================================
app.post('/api/auth', async (req, res) => {
    const { registration_id, passkey } = req.body;

    const regCheck = /^\d{3}-\d{3}-\d{3}$/;
    if (!regCheck.test(registration_id)) return res.status(400).json({ error: "Invalid registration format." });

    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('registration_id', registration_id)
        .single();

    if (error || !user) return res.status(404).json({ error: "Access Denied: Account not found." });
    if (user.status === 'PENDING') return res.status(403).json({ error: "Access Denied: Account pending Teacher approval." });

    const passMatch = bcrypt.compareSync(passkey, user.passkey);
    if (!passMatch) return res.status(401).json({ error: "Access Denied: Invalid passkey or credential string." });

    // Set user ONLINE
    await supabase.from('users').update({ connection_status: 'ONLINE' }).eq('registration_id', registration_id);

    return res.json({ success: true, user: { id: user.registration_id, name: user.full_name, role: user.role } });
});

// ============================================================
// 2. REGISTER ENDPOINT (Request Access)
// ============================================================
app.post('/api/register', async (req, res) => {
    const { registration_id, full_name, email, passkey } = req.body;

    const regCheck = /^\d{3}-\d{3}-\d{3}$/;
    if (!regCheck.test(registration_id)) return res.status(400).json({ error: "Invalid registration format." });
    if (!email || !email.includes('@')) return res.status(400).json({ error: "A valid email address is required." });
    if (!passkey) return res.status(400).json({ error: "Passkey is required." });

    const hashedPass = bcrypt.hashSync(passkey, 10);

    const { error } = await supabase.from('users').insert({
        registration_id,
        full_name: full_name || email.split('@')[0],
        email,
        passkey: hashedPass,
        role: 'STUDENT',
        status: 'PENDING',
        exp_points: 0,
        connection_status: 'OFFLINE'
    });

    if (error) {
        if (error.code === '23505') return res.status(400).json({ error: "ID already exists in queue." });
        return res.status(500).json({ error: "Database error: " + error.message });
    }

    return res.json({ success: true, message: "Verification requested and logged to server." });
});

// ============================================================
// 3. DASHBOARD STATS
// ============================================================
app.get('/api/dashboard-stats', async (req, res) => {
    const { count: hackerCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'STUDENT')
        .eq('status', 'ACTIVE');

    const { count: taskCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ACTIVE');

    res.json({ activeHackers: hackerCount || 0, pendingTasks: taskCount || 0, networkStatus: "SECURE" });
});

// ============================================================
// 4. CREATE TASK (old endpoint - keep for compatibility)
// ============================================================
app.post('/api/tasks', async (req, res) => {
    const { title, reward_exp } = req.body;
    const { data, error } = await supabase.from('tasks').insert({ title, reward_exp: parseInt(reward_exp), status: 'ACTIVE' }).select().single();
    if (error) return res.status(500).json({ error: "Failed to broadcast mission" });
    res.json({ success: true, id: data.id });
});

// ============================================================
// 5. ENROLL FACE DNA
// ============================================================
app.post('/api/enroll-face', async (req, res) => {
    const { registration_id, face_descriptor } = req.body;
    const { error } = await supabase.from('users')
        .update({ face_descriptor: JSON.stringify(face_descriptor) })
        .eq('registration_id', registration_id);
    if (error) return res.status(500).json({ error: "Failed to save Face DNA" });
    res.json({ success: true, message: "Face DNA securely stored." });
});

// ============================================================
// 6. GET ADMIN FACE DNA
// ============================================================
app.get('/api/get-admin-face', async (req, res) => {
    const { data, error } = await supabase.from('users')
        .select('face_descriptor')
        .eq('registration_id', '251-013-001')
        .single();
    if (error || !data || !data.face_descriptor) return res.status(404).json({ error: "No Face DNA found." });
    res.json({ success: true, face_descriptor: JSON.parse(data.face_descriptor) });
});

// ============================================================
// 7. GET ACTIVE TASKS (For Student Board)
// ============================================================
app.get('/api/active-tasks', async (req, res) => {
    const { data, error } = await supabase.from('tasks')
        .select('id, title, reward_exp')
        .eq('status', 'ACTIVE')
        .order('id', { ascending: false });
    if (error) return res.status(500).json({ error: "Failed to fetch tasks" });
    res.json({ tasks: data || [] });
});

// ============================================================
// 8. GET LEADERBOARD
// ============================================================
app.get('/api/leaderboard', async (req, res) => {
    const { data, error } = await supabase.from('users')
        .select('registration_id, exp_points, connection_status')
        .eq('role', 'STUDENT')
        .eq('status', 'ACTIVE')
        .order('exp_points', { ascending: false })
        .limit(10);
    if (error) return res.status(500).json({ error: "Failed to fetch leaderboard" });
    res.json({ leaderboard: data || [] });
});

// ============================================================
// 9. GET PENDING USERS (Gatekeeper)
// ============================================================
app.get('/api/pending-users', async (req, res) => {
    const { data, error } = await supabase.from('users')
        .select('id, registration_id, full_name, role, connection_status')
        .eq('status', 'PENDING');
    if (error) return res.status(500).json({ error: "Failed to fetch pending users" });
    res.json({ users: data || [] });
});

// ============================================================
// 10. APPROVE USER (sends welcome email)
// ============================================================
app.post('/api/approve-user', async (req, res) => {
    const { registration_id } = req.body;

    const { data: user, error: fetchErr } = await supabase.from('users')
        .select('email, full_name')
        .eq('registration_id', registration_id)
        .single();

    if (fetchErr || !user) return res.status(404).json({ error: "User not found" });

    const { error } = await supabase.from('users')
        .update({ status: 'ACTIVE' })
        .eq('registration_id', registration_id);
    if (error) return res.status(500).json({ error: "Database rejection" });

    // Send Welcome Email in background
    if (user.email && user.email.includes('@')) {
        sendEmail(user.email, 'GUB Cyber-Lab // ACCESS GRANTED', `
            <div style="font-family: monospace; background-color: #000; color: #00f0ff; padding: 20px; border: 1px solid #00f0ff;">
                <h2 style="color: #00ff00;">[ CLEARANCE UPGRADED: ACTIVE ]</h2>
                <p>Greetings ${user.full_name},</p>
                <p>Your request to join the Global University Cyber-Lab has been <strong>APPROVED</strong> by the Gatekeeper.</p>
                <p>You may now log in using your Registration ID and Passkey.</p>
                <p style="margin-top: 20px;">Welcome to the network.</p>
                <hr style="border: 0; border-bottom: 1px dashed #00f0ff; margin: 20px 0;">
                <p style="font-size: 0.8rem; color: #555;">End of transmission.</p>
            </div>
        `);
    }

    res.json({ success: true, message: "Node Granted Access." });
});

// ============================================================
// 11. CREATE TASK (with email broadcast)
// ============================================================
app.post('/api/create-task', async (req, res) => {
    const { title, exp } = req.body;
    if (!title || !exp) return res.status(400).json({ error: "Missing parameters" });
    if (parseInt(exp) <= 0) return res.status(400).json({ error: "EXP must be greater than zero." });

    const { data: task, error } = await supabase.from('tasks')
        .insert({ title, reward_exp: parseInt(exp), status: 'ACTIVE' })
        .select()
        .single();
    if (error) return res.status(500).json({ error: "Failed to broadcast task" });

    // Get all active student emails and broadcast in background
    const { data: students } = await supabase.from('users')
        .select('email')
        .eq('role', 'STUDENT')
        .eq('status', 'ACTIVE');

    const emails = (students || []).map(s => s.email).filter(e => e && e.includes('@'));

    if (emails.length > 0 && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        const transporter = createTransporter();
        const sendChunks = async () => {
            for (let i = 0; i < emails.length; i += 50) {
                const chunk = emails.slice(i, i + 50);
                try {
                    await transporter.sendMail({
                        from: `"GUB Gatekeeper Protocol" <${process.env.EMAIL_USER}>`,
                        to: process.env.EMAIL_USER,
                        bcc: chunk.join(', '),
                        subject: 'GUB Cyber-Lab // NEW MISSION DEPLOYED',
                        html: `
                            <div style="font-family: monospace; background-color: #000; color: #00f0ff; padding: 20px;">
                                <h2 style="color: #ffcc00;">[ NEW MISSION DIRECTIVE ]</h2>
                                <p>Greetings Hacker,</p>
                                <p>A new global challenge has been deployed to the GUB Virtual Lab network.</p>
                                <div style="background: rgba(0,240,255,0.1); border: 1px dashed #00f0ff; padding: 15px; margin: 20px 0;">
                                    <h3 style="color:#fff; margin-top:0;">MISSION: ${title}</h3>
                                    <p style="color:#00f0ff; margin-bottom:0;">REWARD: <strong>${exp} EXP</strong></p>
                                </div>
                                <p>Log in to your terminal to view and submit.</p>
                                <hr style="border:0; border-bottom:1px dashed #00f0ff; margin:20px 0;">
                                <p style="font-size:0.8rem; color:#555;">End of transmission.</p>
                            </div>
                        `
                    });
                } catch (e) { console.error('[TASK EMAIL ERROR]', e.message); }
                await new Promise(r => setTimeout(r, 1500));
            }
        };
        sendChunks(); // Run in background, don't await
    }

    res.json({ success: true, task_id: task.id });
});

// ============================================================
// 12. SUBMIT TASK
// ============================================================
app.post('/api/submit-task', async (req, res) => {
    const { registration_id, task_id, code } = req.body;
    const { error } = await supabase.from('submissions').insert({ registration_id, task_id, code, status: 'PENDING' });
    if (error) return res.status(500).json({ error: "Database failed to save submission." });
    console.log(`[SYS] Received code from ${registration_id} for mission #${task_id}`);
    res.json({ success: true, message: "CODE TRANSMITTED SUCCESSFULLY." });
});

// ============================================================
// 13. GET PENDING SUBMISSIONS (Admin Grading)
// ============================================================
app.get('/api/pending-submissions', async (req, res) => {
    const { data, error } = await supabase.from('submissions')
        .select('id, registration_id, code, tasks(title)')
        .eq('status', 'PENDING');
    if (error) return res.status(500).json({ error: "Failed to fetch submissions" });
    const formatted = (data || []).map(s => ({
        id: s.id,
        registration_id: s.registration_id,
        code: s.code,
        title: s.tasks?.title || 'Unknown Task'
    }));
    res.json({ submissions: formatted });
});

// ============================================================
// 14. GRADE SUBMISSION
// ============================================================
app.post('/api/grade-submission', async (req, res) => {
    const { submission_id, action } = req.body;

    const { data: sub, error: fetchErr } = await supabase.from('submissions')
        .select('registration_id, tasks(reward_exp)')
        .eq('id', submission_id)
        .single();
    if (fetchErr || !sub) return res.status(404).json({ error: "Submission not found" });

    const newStatus = action === 'PASS' ? 'PASSED' : 'FAILED';
    await supabase.from('submissions').update({ status: newStatus }).eq('id', submission_id);

    if (action === 'PASS') {
        const rewardExp = sub.tasks?.reward_exp || 0;
        // Increment EXP using RPC or re-fetch current value
        const { data: userRow } = await supabase.from('users').select('exp_points').eq('registration_id', sub.registration_id).single();
        const newExp = (userRow?.exp_points || 0) + rewardExp;
        await supabase.from('users').update({ exp_points: newExp }).eq('registration_id', sub.registration_id);
        return res.json({ success: true, message: "EXP AWARDED SUCCESSFULLY." });
    }

    res.json({ success: true, message: "SUBMISSION FAILED." });
});

// ============================================================
// 15. PROMOTE USER (Super Admin)
// ============================================================
app.post('/api/promote-user', async (req, res) => {
    const { registration_id } = req.body;
    const { error, count } = await supabase.from('users')
        .update({ role: 'ADMIN' })
        .eq('registration_id', registration_id);
    if (error) return res.status(500).json({ error: "Database error during promotion" });
    res.json({ success: true, message: "Node promoted to HIGH CLEARANCE (TEACHER)." });
});

// ============================================================
// 16. BAN USER (Super Admin)
// ============================================================
app.post('/api/ban-user', async (req, res) => {
    const { registration_id } = req.body;
    const { error } = await supabase.from('users').delete().eq('registration_id', registration_id);
    if (error) return res.status(500).json({ error: "Database error during ban" });
    // Clean up submissions
    await supabase.from('submissions').delete().eq('registration_id', registration_id);
    res.json({ success: true, message: "User permanently purged from GUB Network." });
});

// ============================================================
// 17. BROADCAST EMAIL (AI Automation)
// ============================================================
app.post('/api/broadcast-email', async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Missing message payload." });

    // Save announcement to DB
    await supabase.from('announcements').insert({ message });

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        return res.status(500).json({ error: "Server EMAIL credentials missing." });
    }

    const { data: students } = await supabase.from('users')
        .select('email')
        .eq('status', 'ACTIVE')
        .eq('role', 'STUDENT');

    const validEmails = (students || []).map(s => s.email).filter(e => e && e.includes('@'));

    if (validEmails.length === 0) {
        return res.json({ success: true, message: "Announcement saved! (Note: No active students found to email.)" });
    }

    const transporter = createTransporter();
    const sendChunks = async () => {
        let successCount = 0;
        for (let i = 0; i < validEmails.length; i += 50) {
            const chunk = validEmails.slice(i, i + 50);
            try {
                await transporter.sendMail({
                    from: `"GUB Gatekeeper Protocol" <${process.env.EMAIL_USER}>`,
                    to: process.env.EMAIL_USER,
                    bcc: chunk.join(', '),
                    subject: 'GUB Cyber-Lab // Official Directive',
                    html: `
                        <div style="font-family: monospace; background-color: #000; color: #00f0ff; padding: 20px;">
                            <h2 style="color: #ffcc00;">[ OFFICIAL SYSTEM DIRECTIVE ]</h2>
                            <p>Greetings Hacker,</p>
                            <p>This is an automated transmission from the Gatekeeper node:</p>
                            <p style="border-left: 2px solid #00f0ff; padding-left: 10px; margin: 20px 0; color: #fff;">"${message}"</p>
                            <p>Log in to your terminal for latest updates.</p>
                            <hr style="border:0; border-bottom:1px dashed #00f0ff; margin:20px 0;">
                            <p style="font-size:0.8rem; color:#555;">End of transmission.</p>
                        </div>
                    `
                });
                successCount++;
            } catch (e) { console.error('[BROADCAST EMAIL ERROR]', e.message); }
            await new Promise(r => setTimeout(r, 1500));
        }
        return successCount;
    };

    sendChunks().then(count => {
        console.log(`[EMAIL] Broadcast sent to ${count} chunks.`);
    });

    res.json({ success: true, message: "Message safely broadcasted to all active nodes." });
});

// ============================================================
// 18. FORGOT PASSWORD
// ============================================================
app.post('/api/forgot-password', async (req, res) => {
    const { registration_id } = req.body;
    const regCheck = /^\d{3}-\d{3}-\d{3}$/;
    if (!regCheck.test(registration_id)) return res.status(400).json({ error: "Invalid registration format." });

    const { data: user, error } = await supabase.from('users')
        .select('email, full_name')
        .eq('registration_id', registration_id)
        .single();
    if (error || !user) return res.status(404).json({ error: "No account found with this ID." });
    if (!user.email || !user.email.includes('@')) return res.status(400).json({ error: "No valid email linked to this ID. Contact Admin." });

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
    let randomPart = '';
    for (let i = 0; i < 6; i++) randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    const tempPassword = `GUB-${randomPart}`;
    const hashedPass = bcrypt.hashSync(tempPassword, 10);

    await supabase.from('users').update({ passkey: hashedPass }).eq('registration_id', registration_id);

    try {
        await createTransporter().sendMail({
            from: `"GUB Gatekeeper Protocol" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'GUB Cyber-Lab // Emergency Password Reset',
            html: `
                <div style="font-family: monospace; background-color: #000; color: #00f0ff; padding: 20px;">
                    <h2 style="color: #ff2e4d;">[ SECURITY OVERRIDE INITIATED ]</h2>
                    <p>Greetings ${user.full_name},</p>
                    <p>A password reset was requested for your node: <strong>${registration_id}</strong>.</p>
                    <div style="background: rgba(0,240,255,0.1); border: 1px dashed #00f0ff; padding: 15px; text-align: center; font-size: 1.5rem; letter-spacing: 3px; margin: 20px 0; color: #fff;">
                       ${tempPassword}
                    </div>
                    <p style="color: #ffcc00;">WARNING: Use this passkey to log in immediately.</p>
                    <hr style="border:0; border-bottom:1px dashed #00f0ff; margin:20px 0;">
                    <p style="font-size:0.8rem; color:#555;">End of transmission.</p>
                </div>
            `
        });
        res.json({ success: true, message: "NEW PASSKEY TRANSMITTED SECURELY TO YOUR EMAIL." });
    } catch (e) {
        console.error('[RESET EMAIL ERROR]', e.message);
        res.status(500).json({ error: "Failed to transmit email. Check server credentials." });
    }
});

// ============================================================
// 19. SET CONNECTION STATUS (Online/Offline)
// ============================================================
app.post('/api/set-connection', async (req, res) => {
    const { registration_id, status } = req.body;
    await supabase.from('users').update({ connection_status: status }).eq('registration_id', registration_id);
    res.json({ success: true });
});

// ============================================================
// 20. NETWORK DIRECTORY (Student Board)
// ============================================================
app.get('/api/network-directory', async (req, res) => {
    const { data, error } = await supabase.from('users')
        .select('registration_id, full_name, exp_points, connection_status')
        .eq('role', 'STUDENT')
        .eq('status', 'ACTIVE')
        .order('exp_points', { ascending: false });
    if (error) return res.status(500).json({ error: "Failed to fetch directory" });
    res.json({ directory: data || [] });
});

// ============================================================
// 21. ADMIN DIRECTORY (Gatekeeper)
// ============================================================
app.get('/api/admin-directory', async (req, res) => {
    const { data, error } = await supabase.from('users')
        .select('registration_id, full_name, email, role, status, exp_points, connection_status')
        .order('exp_points', { ascending: false });
    if (error) return res.status(500).json({ error: "Failed to fetch admin directory" });
    res.json({ directory: data || [] });
});

// ============================================================
// 22. STUDENT PROFILE
// ============================================================
app.get('/api/student-profile/:id', async (req, res) => {
    const id = req.params.id;
    const { data: userRow, error } = await supabase.from('users')
        .select('exp_points')
        .eq('registration_id', id)
        .single();
    if (error || !userRow) return res.status(404).json({ error: "User not found" });

    const { count: clearedCount } = await supabase.from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('registration_id', id)
        .eq('status', 'PASSED');

    res.json({ exp: userRow.exp_points || 0, missionsCleared: clearedCount || 0 });
});

// ============================================================
// 23. MY SUBMISSIONS (Mission Board Log)
// ============================================================
app.get('/api/my-submissions/:id', async (req, res) => {
    const id = req.params.id;
    const { data, error } = await supabase.from('submissions')
        .select('task_id, status, tasks(title)')
        .eq('registration_id', id)
        .order('id', { ascending: false });
    if (error) return res.status(500).json({ error: "Database error" });
    const formatted = (data || []).map(s => ({
        task_id: s.task_id,
        status: s.status,
        title: s.tasks?.title || 'Unknown'
    }));
    res.json({ submissions: formatted });
});

// ============================================================
// 24. GET ANNOUNCEMENTS
// ============================================================
app.get('/api/announcements', async (req, res) => {
    const { data, error } = await supabase.from('announcements')
        .select('message, timestamp')
        .order('id', { ascending: false })
        .limit(5);
    if (error) return res.status(500).json({ error: "Failed to fetch announcements" });
    res.json({ announcements: data || [] });
});

// Start Server
app.listen(PORT, () => {
    console.log(`[SYS] SERVER ONLINE ON PORT ${PORT}`);
});
