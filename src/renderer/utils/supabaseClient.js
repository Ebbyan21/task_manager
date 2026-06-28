// src/renderer/utils/supabaseClient.js — Inisialisasi Supabase client via browser bundle

const env = await window.electronAPI.getEnv();
const { SUPABASE_URL, SUPABASE_ANON_KEY } = env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('[Supabase] ENV tidak ditemukan. Periksa file .env Anda.');
}

const supabaseFactory = globalThis.supabase;
if (!supabaseFactory || typeof supabaseFactory.createClient !== 'function') {
  throw new Error('[Supabase] Browser bundle belum dimuat. Pastikan script UMD Supabase dimuat sebelum app.js.');
}

export const supabase = supabaseFactory.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export async function logActivity(action, details = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.rpc('log_activity', {
    p_user_id: user.id,
    p_action: action,
    p_details: details,
  });
}