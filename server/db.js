const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// --- Supabase Client Setup ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('FATAL: SUPABASE_URL or SUPABASE_KEY environment variable is missing!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- Initialize Admin User on Startup ---
async function initializeAdmin() {
    const { data: existing } = await supabase
        .from('users')
        .select('registration_id')
        .eq('registration_id', '251-013-001')
        .single();

    if (!existing) {
        const hashedPass = bcrypt.hashSync('admin123', 10);
        const { error } = await supabase.from('users').insert({
            registration_id: '251-013-001',
            full_name: 'Tanjim Ahmed Kingshuk',
            passkey: hashedPass,
            role: 'ADMIN',
            exp_points: 9999,
            status: 'ACTIVE',
            email: 'admin@gub.edu.bd',
            connection_status: 'OFFLINE'
        });
        if (!error) console.log('[DB] Admin account seeded into Supabase.');
        else console.log('[DB] Admin seed result:', error.message);
    } else {
        console.log('[DB] Admin account already exists in Supabase.');
    }
}

initializeAdmin();

module.exports = supabase;
