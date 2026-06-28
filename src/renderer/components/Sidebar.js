// src/renderer/components/Sidebar.js
import { navigateTo, logout } from '../app.js';
import { escapeHtml } from '../utils/helper.js';

// ─── MENU DEFINISI PER ROLE ───────────────────────────────────────────────────
const MENUS = {
  admin: [
    { page: 'dashboard',  icon: '📊', label: 'Dashboard' },
    { page: 'karyawan',   icon: '👥', label: 'Karyawan' },
    { page: 'projects',   icon: '📁', label: 'Monitor Project' },
    { divider: true, label: 'Konfigurasi' },
    { page: 'divisions',  icon: '🏢', label: 'Divisi' },
    { page: 'roles',      icon: '🎭', label: 'Role' },
    { divider: true, label: 'Sistem' },
    { page: 'audit_logs', icon: '📋', label: 'Audit Log' },
    { page: 'settings',   icon: '⚙️',  label: 'Pengaturan' },
  ],
  manager: [
    { page: 'dashboard', icon: '📊', label: 'Dashboard' },
    { page: 'tim',       icon: '👥', label: 'Tim Saya' },
    { page: 'projects',  icon: '🗂️',  label: 'Project & Tugas' },
    { page: 'review',    icon: '🔍', label: 'Quality Control' },
    { page: 'settings',  icon: '⚙️',  label: 'Pengaturan' },
  ],
  employee: [
    { page: 'dashboard', icon: '🏠', label: 'Dashboard' },
    { page: 'kanban',    icon: '📌', label: 'Tugas Saya' },
    { page: 'settings',  icon: '⚙️',  label: 'Pengaturan' },
  ],
};

// ─── LABEL BADGE PER ROLE ─────────────────────────────────────────────────────
const ROLE_LABEL = {
  admin:    { label: 'Admin',   color: 'text-red-400',    bg: 'bg-red-400/10'    },
  manager:  { label: 'Manager', color: 'text-cyan-400',   bg: 'bg-cyan-400/10'   },
  employee: { label: 'Artist',  color: 'text-purple-400', bg: 'bg-purple-400/10' },
};

// ─── RENDER SIDEBAR ───────────────────────────────────────────────────────────
export function renderSidebar(role, profile) {
  const container = document.getElementById('sidebar-container');
  const menus     = MENUS[role] || [];
  const roleInfo  = ROLE_LABEL[role] || {};

  // Avatar user
  const avatarHtml = profile.avatar_url
    ? `<img src="${escapeHtml(profile.avatar_url)}"
            class="w-9 h-9 rounded-full object-cover ring-2 ring-studio-accent/30" />`
    : `<div class="w-9 h-9 rounded-full bg-studio-accent flex items-center
                  justify-center text-white font-semibold text-sm">
         ${escapeHtml(profile.full_name?.charAt(0)?.toUpperCase() || '?')}
       </div>`;

  // Render menu items & dividers
  const menuHtml = menus.map(m => {
    if (m.divider) {
      return `<div class="px-3 pt-4 pb-1">
        <p class="text-xs font-semibold text-studio-muted/50 uppercase tracking-wider">
          ${m.label}
        </p>
      </div>`;
    }
    return `
      <button data-page="${escapeHtml(m.page)}"
        class="nav-link w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
               text-studio-muted hover:text-white hover:bg-studio-border/50
               transition-all text-sm font-medium text-left">
        <span class="text-base w-5 text-center flex-shrink-0">${escapeHtml(m.icon)}</span>
        <span>${escapeHtml(m.label)}</span>
      </button>`;
  }).join('');

  container.innerHTML = `
    <aside class="h-full w-60 bg-studio-card border-r border-studio-border
                  flex flex-col overflow-hidden">

      <!-- ── Brand ── -->
      <div class="p-5 border-b border-studio-border">
        <div class="flex items-center gap-3">
          <img id="sidebar-brand-logo"
            src="./assets/images/icon.png"
            alt="Studio Dalang Pelo"
            class="w-9 h-9 object-contain rounded-xl flex-shrink-0" />
          <div class="min-w-0">
            <p class="text-sm font-bold text-white leading-tight truncate">Studio Dalang Pelo</p>
            <p class="text-xs text-studio-muted">Management System</p>
          </div>
        </div>
      </div>

      <!-- ── Navigasi ── -->
      <nav class="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        ${menuHtml}
      </nav>

      <!-- ── Profil User ── -->
      <div class="p-4 border-t border-studio-border">
        <div class="flex items-center gap-3 mb-3">
          ${avatarHtml}
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white truncate">${escapeHtml(profile.full_name)}</p>
            <span class="text-xs px-2 py-0.5 rounded-full font-medium
                         ${roleInfo.color} ${roleInfo.bg}">
              ${escapeHtml(roleInfo.label)}
            </span>
          </div>
        </div>
        <button data-logout="1"
          class="w-full flex items-center justify-center gap-2 py-2 px-3
                 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg
                 text-xs font-medium transition-colors border border-red-500/20">
          🚪 Keluar
        </button>
      </div>

    </aside>`;

  // Attach event listeners to menu buttons
  container.querySelectorAll('button[data-page]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
  });

  const logoutBtn = container.querySelector('button[data-logout]');
  if (logoutBtn) logoutBtn.addEventListener('click', () => logout());

  // Logo fallback without inline attribute
  const brandLogo = document.getElementById('sidebar-brand-logo');
  if (brandLogo) {
    brandLogo.addEventListener('error', () => {
      brandLogo.outerHTML = '<div class="w-9 h-9 bg-studio-accent rounded-xl flex items-center justify-center text-xl">🎨</div>';
    }, { once: true });
  }
}