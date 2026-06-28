// src/renderer/app.js — Frontend router & global state

import { supabase } from './utils/supabaseClient.js';
import { renderSidebar } from './components/Sidebar.js';
import { renderNavbar }  from './components/Navbar.js';
import { initNotification } from './components/Notification.js';

// Import initAuthDependencies dari login.js
import { initAuthDependencies, showAuthLayer, showFirstLoginModal, logout } from './views/auth/login.js';

export { logout };

// ─── GLOBAL STATE ────────────────────────────
export const AppState = {
  user:    null,
  profile: null,
  role:    null,
};

// ─── REALTIME SUBSCRIPTION TRACKER ───────────
let _realtimeChannel = null;
export const getRealtimeChannel = () => _realtimeChannel;

// ─── DEPENDENCY INJECTION KE LOGIN.JS ────────
// LAKUKAN INI SEBELUM YANG LAIN JALAN BIAR GA ERROR
initAuthDependencies({
  AppState,
  enterApp,
  resetAppUI,
  getRealtimeChannel
});

// ─── ERROR OVERLAY ────────────────────────────
function initRendererErrorOverlay() {
  const errorOverlay = document.getElementById('renderer-error');
  if (!errorOverlay) return;

  const showError = (title, message, details) => {
    errorOverlay.classList.remove('hidden');
    errorOverlay.innerHTML = `
      <h1 class="text-2xl font-bold mb-4">${title}</h1>
      <pre class="whitespace-pre-wrap text-sm mb-3">${message}</pre>
      <pre class="whitespace-pre-wrap text-sm text-studio-muted">${details}</pre>
    `;
  };

  window.addEventListener('error', event => {
    showError('Renderer Error', event.message, `${event.filename}:${event.lineno}:${event.colno}\n${event.error?.stack || ''}`);
  });

  window.addEventListener('unhandledrejection', event => {
    showError('Unhandled Rejection', event.reason?.message || event.reason, event.reason?.stack || '');
  });
}

// ─── WINDOW CONTROLS ─────────────────────────
function initWindowControls() {
  const minimizeBtn  = document.getElementById('window-minimize');
  const maximizeBtn  = document.getElementById('window-maximize');
  const closeBtn     = document.getElementById('window-close');
  const titlebarLogo = document.getElementById('titlebar-logo');

  if (minimizeBtn) minimizeBtn.addEventListener('click', () => window.electronAPI.window.minimize());
  if (maximizeBtn) maximizeBtn.addEventListener('click', () => window.electronAPI.window.maximize());
  if (closeBtn)    closeBtn.addEventListener('click',    () => window.electronAPI.window.close());

  // Sync icon maximize saat window berubah state
  window.electronAPI.window.isMaximized().then(isMax => {
    document.body.classList.toggle('is-maximized', isMax);
  });
  window.electronAPI.window.onMaximized((isMax) => {
    document.body.classList.toggle('is-maximized', isMax);
  });

  if (titlebarLogo) {
    titlebarLogo.addEventListener('error', () => {
      const fallback = document.createElement('div');
      fallback.className = 'w-4 h-4 rounded bg-studio-accent flex items-center justify-center text-[10px] text-white';
      fallback.textContent = 'S';
      titlebarLogo.replaceWith(fallback);
    }, { once: true });
  }
}

// ─── ROUTE MAP (MODULAR CRUD UPDATED) ────────
const ROUTES = {
  admin: {
    dashboard:  () => import('./views/admin/dashboard.js'),
    karyawan:   () => import('./views/admin/karyawan/index.js'),
    projects:   () => import('./views/admin/projects.js'),
    divisions:  () => import('./views/admin/divisions/index.js'),
    roles:      () => import('./views/admin/roles.js'),
    audit_logs: () => import('./views/admin/audit_logs.js'),
    settings:   () => import('./views/admin/settings/index.js'),
  },
  manager: {
    dashboard: () => import('./views/manager/dashboard.js'),
    tim:       () => import('./views/manager/tim.js'),
    projects:  () => import('./views/manager/projects/index.js'),
    tasks:     () => import('./views/manager/tasks/index.js'),
    review:    () => import('./views/manager/review/index.js'),
    settings:  () => import('./views/admin/settings/index.js'),
  },
  employee: {
    dashboard: () => import('./views/employee/dashboard.js'),
    kanban:    () => import('./views/employee/kanban/index.js'),
    settings:  () => import('./views/admin/settings/index.js'),
  },
};

// ─── ROUTER ──────────────────────────────────
export async function navigateTo(page) {
  const role     = AppState.role;
  const routeMap = ROUTES[role];

  if (!routeMap || !routeMap[page]) {
    console.warn(`[Router] Route "${page}" tidak ditemukan untuk role "${role}"`);
    return;
  }

  document.querySelectorAll('.nav-link').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="space-y-4 animate-pulse">
      <div class="skeleton h-8 w-48 rounded-lg"></div>
      <div class="skeleton h-32 w-full rounded-xl"></div>
      <div class="skeleton h-32 w-full rounded-xl"></div>
    </div>`;

  try {
    const mod = await routeMap[page]();
    await mod.render(content);
  } catch (err) {
    console.error('[Router] Error render halaman:', err);

    const errorBox = document.createElement('div');
    errorBox.className = 'flex flex-col items-center justify-center h-64 gap-4 text-studio-muted';

    const icon = document.createElement('span');
    icon.className   = 'text-5xl';
    icon.textContent = '⚠️';

    const title = document.createElement('p');
    title.className   = 'text-lg font-medium text-white';
    title.textContent = 'Gagal memuat halaman';

    const detail = document.createElement('p');
    detail.className   = 'text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 max-w-md text-center';
    detail.textContent = err?.message || 'Terjadi kesalahan.';

    const button = document.createElement('button');
    button.className   = 'px-4 py-2 bg-studio-accent hover:bg-purple-700 text-white text-sm rounded-lg transition-colors';
    button.textContent = 'Kembali ke Dashboard';
    button.addEventListener('click', () => navigateTo('dashboard'));

    errorBox.append(icon, title, detail, button);
    content.innerHTML = '';
    content.appendChild(errorBox);
  }
}

// ─── SHOW TOAST ──────────────────────────────
export function showToast(message, type = 'info') {
  const colors = { success: 'bg-green-600', error: 'bg-red-600', warning: 'bg-yellow-600', info: 'bg-studio-accent' };
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

  const toast = document.createElement('div');
  toast.className = `toast flex items-center gap-3 px-4 py-3 rounded-lg text-white text-sm shadow-xl min-w-64 max-w-sm ${colors[type] || colors.info}`;

  const iconEl = document.createElement('span');
  iconEl.className   = 'flex-shrink-0';
  iconEl.textContent = icons[type] || icons.info;

  const messageEl = document.createElement('span');
  messageEl.className   = 'flex-1';
  messageEl.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.type      = 'button';
  closeBtn.className = 'flex-shrink-0 text-white/60 hover:text-white ml-2';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', () => toast.remove());

  toast.append(iconEl, messageEl, closeBtn);
  document.getElementById('toast-container').appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function initAutoUpdater() {
  if (!window.electronAPI?.updater) return;

  window.electronAPI.updater.onStatus((data) => {
    if (data.type === 'available') {
      showToast(`Update v${data.version} tersedia, sedang didownload...`, 'info');
    }
    if (data.type === 'progress') {
      // opsional: update progress bar
    }
    if (data.type === 'downloaded') {
      // Tampilkan toast dengan tombol install
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = 'toast flex items-center gap-3 px-4 py-3 rounded-lg text-white text-sm shadow-xl min-w-64 bg-green-700 pointer-events-all';
      toast.innerHTML = `
        <span>🎉</span>
        <span class="flex-1">Update v${data.version} siap! Restart untuk install.</span>
        <button id="btn-install-update"
          class="px-3 py-1 bg-white text-green-700 rounded font-semibold text-xs hover:bg-green-100 transition-colors">
          Restart
        </button>`;
      container.appendChild(toast);
      document.getElementById('btn-install-update')
        ?.addEventListener('click', () => window.electronAPI.updater.install());
    }
  });
}

// ─── SHOW MODAL ──────────────────────────────
export function showModal(content) {
  const container = document.getElementById('modal-container');
  if (!container) return;

  // Langsung render content tanpa wrapper tambahan
  container.innerHTML = content;

  container.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');

  container.addEventListener('click', (event) => {
    if (event.target === container) closeModal();
  }, { once: true });
}

export function closeModal() {
  const container = document.getElementById('modal-container');
  if (!container) return;
  container.classList.add('hidden');
  container.innerHTML = '';
  document.body.classList.remove('overflow-hidden');
}

// ─── COMPATIBILITY ALIASES ────────────────────
if (typeof window !== 'undefined') {
  window._navigate   = navigateTo;
  window._closeModal = closeModal;
  window._showModal  = showModal;
  window._showToast  = showToast;
  window.logout      = logout;
}

// ─── RESET UI ────────────────────────────────
export function resetAppUI() {
  ['sidebar-container','navbar-container','page-content','toast-container'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '';
  });
  const modal = document.getElementById('modal-container');
  if (modal) { modal.innerHTML = ''; modal.classList.add('hidden'); }
}

// ─── ENTER APP ───────────────────────────────
export async function enterApp() {
  resetAppUI();
  document.getElementById('auth-layer')?.classList.add('hidden');
  document.getElementById('app-shell')?.classList.remove('hidden');

  renderSidebar(AppState.role, AppState.profile);
  renderNavbar(AppState.profile);

  _realtimeChannel = initNotification();
  await navigateTo('dashboard');
}

// ============================================
// INIT
// ============================================
initRendererErrorOverlay();
initWindowControls();
initAutoUpdater();

(async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*, divisions(name)')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        AppState.user    = session.user;
        AppState.profile = profile;
        AppState.role    = profile.role;

        await supabase.from('profiles')
          .update({ is_online: true })
          .eq('id', session.user.id);

        if (profile.is_first_login) {
          showFirstLoginModal();
        } else {
          await enterApp();
        }
        return;
      }
    }
    showAuthLayer();
  } catch (error) {
    console.error("Auth Session Error:", error);
    showAuthLayer();
  }
})();