import { supabase, logActivity } from '../../../utils/supabaseClient.js';
import { showModal, closeModal, showToast, AppState } from '../../../app.js';
import { loadKaryawan } from './index.js';

export async function showEditModal(userId, divisions) {
  const { data: emp } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (!emp) return;

  showModal(`
    <div class="bg-studio-card border border-studio-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
      <div class="flex items-center justify-between mb-5">
        <h3 class="text-lg font-bold text-white">Edit Pengguna</h3>
        <button id="m-close" class="text-studio-muted hover:text-white text-xl leading-none">✕</button>
      </div>

      <form id="edit-emp-form" class="space-y-4">
        <input type="hidden" id="edit-id" value="${emp.id}" />
        
        <div>
          <label class="block text-sm text-studio-muted mb-1.5">Nama Lengkap *</label>
          <input type="text" id="edit-name" required value="${emp.full_name}"
            class="w-full px-4 py-2.5 bg-studio-dark border border-studio-border rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors" />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-studio-muted mb-1.5">Role</label>
            <select id="edit-role" 
              class="w-full px-3 py-2.5 bg-studio-dark border border-studio-border rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors" 
              ${emp.id === AppState.user?.id ? 'disabled' : ''}>
              <option value="employee" ${emp.role === 'employee' ? 'selected' : ''}>Artist</option>
              <option value="manager"  ${emp.role === 'manager'  ? 'selected' : ''}>Manager</option>
              <option value="admin"    ${emp.role === 'admin'    ? 'selected' : ''}>Admin</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-studio-muted mb-1.5">Divisi</label>
            <select id="edit-division" class="w-full px-3 py-2.5 bg-studio-dark border border-studio-border rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors">
              <option value="">— Tanpa Divisi —</option>
              ${divisions.map(d => `
                <option value="${d.id}" ${emp.division_id == d.id ? 'selected' : ''}>
                  ${d.name}
                </option>`).join('')}
            </select>
          </div>
        </div>

        ${emp.id === AppState.user?.id 
          ? `<p class="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">⚠️ Anda tidak bisa mengubah role akun sendiri.</p>` 
          : ''}
        
        <div id="edit-error" class="hidden text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"></div>
        
        <div class="flex gap-3 pt-2">
          <button type="button" id="m-cancel" class="flex-1 py-2.5 bg-studio-border text-studio-text rounded-lg text-sm transition-colors">Batal</button>
          <button type="submit" id="edit-btn" class="flex-1 py-2.5 bg-studio-accent hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors">Simpan</button>
        </div>
      </form>
    </div>`);

  document.getElementById('m-close').addEventListener('click', closeModal);
  document.getElementById('m-cancel').addEventListener('click', closeModal);

  document.getElementById('edit-emp-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn         = document.getElementById('edit-btn');
    const errEl       = document.getElementById('edit-error');
    const id          = document.getElementById('edit-id').value;
    const full_name   = document.getElementById('edit-name').value.trim();
    const roleEl      = document.getElementById('edit-role');
    const role        = roleEl.disabled ? emp.role : roleEl.value;
    const division_id = document.getElementById('edit-division').value || null;

    btn.disabled = true;
    btn.textContent = 'Menyimpan...';

    const { error } = await supabase.from('profiles').update({ full_name, role, division_id }).eq('id', id);

    if (!error) {
      await logActivity('UPDATE_USER', `Admin memperbarui profil: ${full_name} (role: ${role})`);
      closeModal();
      showToast('Data pengguna berhasil diperbarui!', 'success');
      await loadKaryawan();
    } else {
      errEl.textContent = error.message;
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Simpan';
    }
  });
}

export function showResetPwModal(userId, name) {
  showModal(`
    <div class="bg-studio-card border border-studio-border rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
      <div class="flex items-center gap-3 mb-5">
        <div class="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center text-xl">🔑</div>
        <div>
          <h3 class="text-lg font-bold text-white">Reset Password</h3>
          <p class="text-sm text-studio-muted">${name}</p>
        </div>
      </div>
      
      <p class="text-sm text-studio-muted mb-4">Set password baru untuk pengguna ini. Mereka akan diwajibkan mengganti password saat login berikutnya.</p>
      
      <div class="mb-4">
        <label class="block text-sm text-studio-muted mb-1.5">Password Baru *</label>
        <input type="text" id="reset-pw-val" value="Studio123!" 
          class="w-full px-4 py-2.5 bg-studio-dark border border-studio-border rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors" />
      </div>
      
      <div id="reset-error" class="hidden text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4"></div>
      
      <div class="flex gap-3">
        <button id="m-cancel" class="flex-1 py-2.5 bg-studio-border text-studio-text rounded-lg text-sm transition-colors">Batal</button>
        <button id="reset-confirm" class="flex-1 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-sm font-semibold transition-colors">Reset Password</button>
      </div>
    </div>`);

  document.getElementById('m-cancel').addEventListener('click', closeModal);
  document.getElementById('reset-confirm').addEventListener('click', async () => {
    const btn   = document.getElementById('reset-confirm');
    const errEl = document.getElementById('reset-error');
    const newPw = document.getElementById('reset-pw-val').value;

    if (!newPw || newPw.length < 8) {
      errEl.textContent = 'Password minimal 8 karakter.';
      errEl.classList.remove('hidden');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Mereset...';

    const { error } = await supabase.from('profiles').update({ is_first_login: true }).eq('id', userId);

    if (!error) {
      await logActivity('RESET_PASSWORD', `Admin mereset password untuk: ${name}`);
      closeModal();
      showToast(`Password ${name} direset. Mereka harus ganti PW saat login.`, 'warning');
      await loadKaryawan();
    } else {
      errEl.textContent = error.message;
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Reset Password';
    }
  });
}

export function confirmDeleteEmployee(userId, name) {
  showModal(`
    <div class="bg-studio-card border border-red-500/30 rounded-2xl p-6 w-full max-w-xs mx-4 shadow-2xl">
      <div class="flex flex-col items-center text-center gap-2 mb-6">
        <div class="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center text-3xl mb-1">🗑️</div>
        <h3 class="text-base font-bold text-white">Hapus Permanen?</h3>
        <p class="text-studio-muted text-xs leading-relaxed">
          Akun <strong class="text-white">${name}</strong> akan terhapus sepenuhnya beserta akses loginnya.
        </p>
      </div>
      
      <div id="del-error" class="hidden mb-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"></div>
      
      <div class="flex gap-2">
        <button id="m-cancel" class="flex-1 py-2.5 bg-studio-border hover:bg-studio-border/80 text-studio-text rounded-xl text-sm font-medium transition-colors">
          Batal
        </button>
        <button id="del-emp-confirm" class="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors">
          Ya, Hapus
        </button>
      </div>
    </div>`);

  document.getElementById('m-cancel').addEventListener('click', closeModal);
  document.getElementById('del-emp-confirm').addEventListener('click', async () => {
    const btn   = document.getElementById('del-emp-confirm');
    const errEl = document.getElementById('del-error');
    btn.disabled = true;
    btn.textContent = 'Proses...';
    errEl.classList.add('hidden');

    const { error } = await supabase.rpc('delete_user', { p_user_id: userId });

    if (!error) {
      await logActivity('DELETE_USER', `Admin menghapus permanen akun: ${name}`);
      closeModal();
      showToast(`Akun ${name} berhasil dihapus permanen.`, 'success');
      await loadKaryawan();
    } else {
      errEl.textContent = error.message;
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Ya, Hapus';
    }
  });
}