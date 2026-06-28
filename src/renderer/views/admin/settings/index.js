import { setPageTitle } from '../../../components/Navbar.js';
import { AppState } from '../../../app.js';
import { handleAvatarUpload } from './create.js';
import { handleProfileUpdate, handlePasswordUpdate } from './edit.js';

export async function render(container) {
  setPageTitle('Pengaturan Akun');
  const profile = AppState.profile;

  container.innerHTML = `
    <div class="max-w-2xl space-y-6">
      <div>
        <h2 class="text-xl font-bold text-white">Pengaturan Akun</h2>
        <p class="text-studio-muted text-sm">Kelola informasi profil dan keamanan akun Anda</p>
      </div>

      <div class="bg-studio-card border border-studio-border rounded-xl p-6">
        <h3 class="font-semibold text-white mb-4">Foto Profil</h3>
        <div class="flex items-center gap-5">
          <div id="avatar-preview" class="w-20 h-20 rounded-full overflow-hidden bg-studio-accent/30 flex items-center justify-center flex-shrink-0">
            ${profile.avatar_url
              ? `<img src="${profile.avatar_url}" class="w-full h-full object-cover" />`
              : `<span class="text-3xl font-bold text-white">${profile.full_name?.charAt(0) || '?'}</span>`}
          </div>
          <div class="space-y-2">
            <label for="avatar-input" class="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-studio-accent hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors">
              📷 Ganti Foto
            </label>
            <input type="file" id="avatar-input" accept="image/*" class="hidden" />
            <p class="text-xs text-studio-muted">JPG, PNG, atau GIF. Maks 2MB.</p>
            <p id="upload-status" class="text-xs text-studio-muted hidden"></p>
          </div>
        </div>
      </div>

      <div class="bg-studio-card border border-studio-border rounded-xl p-6">
        <h3 class="font-semibold text-white mb-4">Informasi Profil</h3>
        <form id="profile-form" class="space-y-4">
          <div>
            <label class="block text-sm text-studio-muted mb-1.5">Nama Lengkap</label>
            <input type="text" id="profile-name" value="${profile.full_name}"
              class="w-full px-4 py-2.5 bg-studio-dark border border-studio-border rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors" />
          </div>
          <div>
            <label class="block text-sm text-studio-muted mb-1.5">Email</label>
            <input type="email" value="${AppState.user?.email || ''}" disabled
              class="w-full px-4 py-2.5 bg-studio-dark/50 border border-studio-border rounded-lg text-studio-muted text-sm cursor-not-allowed" />
            <p class="text-xs text-studio-muted mt-1">Email tidak dapat diubah.</p>
          </div>
          <button type="submit" id="save-profile-btn" class="px-6 py-2.5 bg-studio-accent hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors">
            Simpan Perubahan
          </button>
        </form>
      </div>

      <div class="bg-studio-card border border-studio-border rounded-xl p-6">
        <h3 class="font-semibold text-white mb-4">Ubah Password</h3>
        <form id="password-form" class="space-y-4">
          <div>
            <label class="block text-sm text-studio-muted mb-1.5">Password Baru</label>
            <input type="password" id="new-pw" minlength="8" placeholder="Minimal 8 karakter"
              class="w-full px-4 py-2.5 bg-studio-dark border border-studio-border rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors" />
          </div>
          <div>
            <label class="block text-sm text-studio-muted mb-1.5">Konfirmasi Password</label>
            <input type="password" id="confirm-pw" minlength="8" placeholder="Ulangi password baru"
              class="w-full px-4 py-2.5 bg-studio-dark border border-studio-border rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors" />
          </div>
          <p id="pw-error" class="hidden text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"></p>
          <button type="submit" id="change-pw-btn" class="px-6 py-2.5 bg-studio-border hover:bg-studio-accent/20 hover:text-studio-accent text-studio-text text-sm font-semibold rounded-lg transition-colors border border-studio-border hover:border-studio-accent/40">
            🔑 Ubah Password
          </button>
        </form>
      </div>
    </div>`;

  document.getElementById('avatar-input').addEventListener('change', handleAvatarUpload);
  document.getElementById('profile-form').addEventListener('submit', handleProfileUpdate);
  document.getElementById('password-form').addEventListener('submit', handlePasswordUpdate);
}