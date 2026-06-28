// ============================================
// src/renderer/views/auth/login.js
// Authentication Logic & UI
// ============================================

import { supabase } from '../../utils/supabaseClient.js';

// ─── DEPENDENCY INJECTION ────────────────────
// Buat ngehindarin Circular Dependency, kita tampung dari app.js
let AppState, enterApp, resetAppUI, getRealtimeChannel;

export function initAuthDependencies(deps) {
  AppState = deps.AppState;
  enterApp = deps.enterApp;
  resetAppUI = deps.resetAppUI;
  getRealtimeChannel = deps.getRealtimeChannel;
}

// ─── AUTH LAYER CONTROLS ─────────────────────
export function showAuthLayer() {
  const appShell = document.getElementById('app-shell');
  const authLayer = document.getElementById('auth-layer');
  
  if (appShell) appShell.classList.add('hidden');
  if (authLayer) authLayer.classList.remove('hidden');
  
  renderLoginPage();
}

export function showAppShell() {
  const appShell = document.getElementById('app-shell');
  const authLayer = document.getElementById('auth-layer');
  
  if (authLayer) authLayer.classList.add('hidden');
  if (appShell) appShell.classList.remove('hidden');
}

// ─── RENDER LOGIN PAGE ───────────────────────
export function renderLoginPage() {
  const authLayer = document.getElementById('auth-layer');
  if (!authLayer) return console.error('[UI] auth-layer not found');

  authLayer.innerHTML = `
    <div class="w-full max-w-md px-4">
      <!-- Logo / Header -->
      <div class="text-center mb-8">
        <div class="w-24 h-[72px] mx-auto mb-4 flex items-center justify-center">
          <img id="login-logo" src="./assets/images/icon.png" alt="Studio Dalang Pelo"
            class="w-full h-full object-contain drop-shadow-lg" />
        </div>
        <h1 class="text-2xl font-bold text-white">Studio Dalang Pelo</h1>
        <p class="text-studio-muted text-sm mt-1">Sistem Manajemen Karyawan &amp; Tugas</p>
      </div>

      <!-- Form Card -->
      <div class="bg-studio-card border border-studio-border rounded-2xl p-8 shadow-2xl">
        <h2 class="text-lg font-semibold text-white mb-6">Masuk ke Akun Anda</h2>
        <form id="login-form" class="space-y-4">
          <div>
            <label class="block text-sm text-studio-muted mb-1.5">Email</label>
            <input type="email" id="login-email" required
              placeholder="nama@studio.com"
              class="w-full px-4 py-2.5 bg-studio-dark border border-studio-border
                     rounded-lg text-studio-text text-sm placeholder-studio-muted/50
                     focus:border-studio-accent transition-colors" />
          </div>

          <div>
            <label class="block text-sm text-studio-muted mb-1.5">Password</label>
            <div class="relative">
              <input type="password" id="login-password" required
                placeholder="••••••••"
                class="w-full px-4 py-2.5 bg-studio-dark border border-studio-border
                       rounded-lg text-studio-text text-sm placeholder-studio-muted/50
                       focus:border-studio-accent transition-colors pr-10" />
              <button type="button" id="toggle-pw"
                class="absolute right-3 top-1/2 -translate-y-1/2
                       text-studio-muted hover:text-white text-sm transition-colors">
                👁
              </button>
            </div>
          </div>

          <button type="submit" id="login-btn"
            class="w-full py-2.5 bg-studio-accent hover:bg-purple-700 text-white
                   font-semibold rounded-lg transition-colors text-sm mt-2
                   disabled:opacity-50 disabled:cursor-not-allowed">
            Masuk
          </button>
        </form>
        <div id="login-error"
          class="hidden mt-4 text-sm text-red-400 text-center bg-red-500/10
                 border border-red-500/20 rounded-lg py-2.5 px-3"></div>
      </div>

      <p class="text-center text-xs text-studio-muted mt-6">
        &copy; ${new Date().getFullYear()} Studio Dalang Pelo. All rights reserved.
      </p>
    </div>`;

  // Event Listeners
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);
  
  const toggleBtn = document.getElementById('toggle-pw');
  const pwInput   = document.getElementById('login-password');
  if (toggleBtn && pwInput) {
    toggleBtn.addEventListener('click', () => {
      const isHidden        = pwInput.type === 'password';
      pwInput.type          = isHidden ? 'text' : 'password';
      toggleBtn.textContent = isHidden ? '🙈' : '👁';
    });
  }

  const loginLogo = document.getElementById('login-logo');
  if (loginLogo) {
    loginLogo.addEventListener('error', () => {
      loginLogo.outerHTML = '<div class="w-16 h-16 bg-studio-accent rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-lg">🎨</div>';
    }, { once: true });
  }
}

// ─── HANDLE LOGIN LOGIC ──────────────────────
async function handleLogin(e) {
  e.preventDefault();

  const btn      = document.getElementById('login-btn');
  const errEl    = document.getElementById('login-error');
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!supabase) {
    errEl.textContent = 'Supabase belum terinisialisasi.';
    errEl.classList.remove('hidden');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Memverifikasi...';
  errEl.classList.add('hidden');

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*, divisions(name)')
      .eq('id', data.user.id)
      .single();

    if (profileErr) throw profileErr;

    // Set Global State (pake AppState dari app.js)
    AppState.user    = data.user;
    AppState.profile = profile;
    AppState.role    = profile.role;

    await supabase.from('profiles')
      .update({ is_online: true })
      .eq('id', data.user.id);

    if (profile.is_first_login) {
      showFirstLoginModal();
      return;
    }

    showAppShell();
    await enterApp(); // Panggil fungsi enterApp dari app.js
  } catch (err) {
    const msg = err.message === 'Invalid login credentials'
      ? 'Email atau password salah. Silakan coba lagi.'
      : err.message;
    errEl.textContent = msg;
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Masuk';
  }
}

// ─── FIRST LOGIN MODAL ────────────────────────
export function showFirstLoginModal() {
  document.getElementById('auth-layer').innerHTML = `
    <div class="w-full max-w-md px-4">
      <div class="bg-studio-card border border-yellow-500/40 rounded-2xl p-8 shadow-2xl">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center
                      justify-center text-xl flex-shrink-0">🔐</div>
          <div>
            <h2 class="text-lg font-semibold text-white">Ganti Password</h2>
            <p class="text-sm text-studio-muted">Wajib dilakukan sebelum melanjutkan</p>
          </div>
        </div>

        <div class="text-sm text-yellow-400 bg-yellow-500/10 border
                    border-yellow-500/20 rounded-lg px-4 py-3 mb-6">
          Ini adalah login pertama Anda. Demi keamanan, harap ganti
          password default yang diberikan oleh Admin.
        </div>

        <form id="first-login-form" class="space-y-4">
          <div>
            <label class="block text-sm text-studio-muted mb-1.5">Password Baru</label>
            <input type="password" id="new-password" required minlength="8"
              placeholder="Minimal 8 karakter"
              class="w-full px-4 py-2.5 bg-studio-dark border border-studio-border
                     rounded-lg text-studio-text text-sm focus:border-yellow-500
                     transition-colors" />
          </div>
          <div>
            <label class="block text-sm text-studio-muted mb-1.5">Konfirmasi Password Baru</label>
            <input type="password" id="confirm-password" required minlength="8"
              placeholder="Ulangi password baru"
              class="w-full px-4 py-2.5 bg-studio-dark border border-studio-border
                     rounded-lg text-studio-text text-sm focus:border-yellow-500
                     transition-colors" />
          </div>

          <div id="pw-strength" class="hidden">
            <div class="flex gap-1 mb-1">
              ${[1,2,3,4].map(i => `<div class="strength-bar h-1 flex-1 rounded-full bg-studio-border" data-idx="${i}"></div>`).join('')}
            </div>
            <p id="pw-strength-label" class="text-xs text-studio-muted"></p>
          </div>

          <button type="submit" id="change-pw-btn"
            class="w-full py-2.5 bg-yellow-600 hover:bg-yellow-500 text-white
                   font-semibold rounded-lg transition-colors text-sm">
            Simpan Password Baru
          </button>
        </form>

        <div id="first-login-error"
          class="hidden mt-4 text-sm text-red-400 text-center bg-red-500/10
                 border border-red-500/20 rounded-lg py-2 px-3"></div>
      </div>
    </div>`;

  document.getElementById('new-password').addEventListener('input', (e) => {
    const pw  = e.target.value;
    const el  = document.getElementById('pw-strength');
    const lbl = document.getElementById('pw-strength-label');
    if (!pw) { el.classList.add('hidden'); return; }
    
    el.classList.remove('hidden');
    let strength = 0;
    if (pw.length >= 8)          strength++;
    if (/[A-Z]/.test(pw))        strength++;
    if (/[0-9]/.test(pw))        strength++;
    if (/[^A-Za-z0-9]/.test(pw)) strength++;
    
    const colors = ['bg-red-500','bg-orange-500','bg-yellow-500','bg-green-500'];
    const labels = ['Lemah','Cukup','Kuat','Sangat Kuat'];
    
    document.querySelectorAll('.strength-bar').forEach((bar, i) => {
      bar.className = `strength-bar h-1 flex-1 rounded-full ${i < strength ? colors[strength - 1] : 'bg-studio-border'}`;
    });
    
    lbl.textContent = labels[strength - 1] || '';
    lbl.className   = `text-xs ${['text-red-400','text-orange-400','text-yellow-400','text-green-400'][strength - 1] || 'text-studio-muted'}`;
  });

  document.getElementById('first-login-form').addEventListener('submit', handleFirstPasswordChange);
}

// ─── HANDLE FIRST PASSWORD CHANGE ────────────
async function handleFirstPasswordChange(e) {
  e.preventDefault();

  const btn       = document.getElementById('change-pw-btn');
  const errEl     = document.getElementById('first-login-error');
  const newPw     = document.getElementById('new-password').value;
  const confirmPw = document.getElementById('confirm-password').value;

  if (newPw !== confirmPw) {
    errEl.textContent = 'Password tidak cocok. Coba lagi.';
    errEl.classList.remove('hidden');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Menyimpan...';
  errEl.classList.add('hidden');

  try {
    const { error: pwErr } = await supabase.auth.updateUser({ password: newPw });
    if (pwErr) throw pwErr;

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ is_first_login: false })
      .eq('id', AppState.user.id);
    if (profileErr) throw profileErr;

    AppState.profile.is_first_login = false;
    showAppShell();
    await enterApp();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
    btn.disabled    = false;
    btn.textContent = 'Simpan Password Baru';
  }
}

// ─── LOGOUT ──────────────────────────────────
export async function logout() {
  try {
    if (AppState.user) {
      await supabase.from('profiles')
        .update({ is_online: false })
        .eq('id', AppState.user.id);
    }

    const realtimeChannel = getRealtimeChannel();
    if (realtimeChannel) {
      await supabase.removeChannel(realtimeChannel);
    }

    await supabase.auth.signOut();
  } catch (err) {
    console.error('[Logout] Error:', err);
  } finally {
    AppState.user    = null;
    AppState.profile = null;
    AppState.role    = null;

    sessionStorage.clear();
    resetAppUI();
    showAuthLayer();
  }
}