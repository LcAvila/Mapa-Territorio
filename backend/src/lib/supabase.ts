import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase Admin credentials missing. Auth synchronization will fail.');
}

// Service Role client for admin operations (like creating users)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Standard client for public operations
export const supabase = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY || '');
