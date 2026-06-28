// src/renderer/components/Navbar.js
import { escapeHtml } from '../utils/helper.js';

export function renderNavbar(profile) {
  const container = document.getElementById('navbar-container');
  const avatar = profile.avatar_url
    ? `<img id="navbar-avatar-img" src="${escapeHtml(profile.avatar_url)}"
            class="w-8 h-8 rounded-full object-cover ring-2 ring-studio-accent/50" />`
    : `<div class="w-8 h-8 rounded-full bg-studio-accent flex items-center
                  justify-center text-white text-xs font-bold ring-2 ring-studio-accent/50">
         ${escapeHtml(profile.full_name?.charAt(0)?.toUpperCase() || '?')}
       </div>`;

  const division = profile.divisions?.name || '—';

  container.innerHTML = `
    <header class="h-14 bg-studio-card border-b border-studio-border
                   flex items-center justify-between px-6 flex-shrink-0">
      <!-- Breadcrumb / Page Title -->
      <div>
        <h1 id="page-title" class="text-base font-semibold text-white">Dashboard</h1>
        <p class="text-xs text-studio-muted">${escapeHtml(division)}</p>
      </div>

      <!-- Right Side -->
      <div class="flex items-center gap-4">
        <!-- Online indicator -->
        <div class="flex items-center gap-1.5 text-xs text-green-400">
          <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
          Online
        </div>

        <!-- User Avatar & Name -->
        <div class="flex items-center gap-2" id="navbar-user">
          ${avatar}
          <span class="text-sm text-studio-text hidden sm:block">
            ${escapeHtml(profile.full_name)}
          </span>
        </div>
      </div>
    </header>`;

  // Attach fallback for avatar image in initial render
  const imgInit = document.getElementById('navbar-avatar-img');
  if (imgInit) {
    imgInit.addEventListener('error', () => {
      imgInit.outerHTML = '<div class="w-8 h-8 rounded-full bg-studio-accent flex items-center justify-center text-white text-xs font-bold">? </div>';
    }, { once: true });
  }
}

// Update title navbar saat navigasi
export function setPageTitle(title) {
  const el = document.getElementById('page-title');
  if (el) el.textContent = title;
}

// Update avatar & nama di navbar tanpa re-render full
export function updateNavbarProfile(profile) {
  const el = document.getElementById('navbar-user');
  if (!el) return;

  const avatar = profile.avatar_url
    ? `<img src="${escapeHtml(profile.avatar_url)}"
            class="w-8 h-8 rounded-full object-cover ring-2 ring-studio-accent/50" />`
    : `<div class="w-8 h-8 rounded-full bg-studio-accent flex items-center
                  justify-center text-white text-xs font-bold ring-2 ring-studio-accent/50">
         ${escapeHtml(profile.full_name?.charAt(0)?.toUpperCase() || '?')}
       </div>`;

  el.innerHTML = `
    ${avatar}
    <span class="text-sm text-studio-text hidden sm:block">
      ${escapeHtml(profile.full_name)}
    </span>`;

  // Attach fallback for image
  const img = document.getElementById('navbar-avatar-img');
  if (img) {
    img.addEventListener('error', () => {
      img.outerHTML = '<div class="w-8 h-8 rounded-full bg-studio-accent flex items-center justify-center text-white text-xs font-bold">? </div>';
    }, { once: true });
  }
}