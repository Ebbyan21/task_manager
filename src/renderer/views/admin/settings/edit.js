import { supabase, logActivity } from '../../../utils/supabaseClient.js';
import { renderSidebar } from '../../../components/Sidebar.js';
import { showToast, AppState } from '../../../app.js';

export async function handleProfileUpdate(e) {
  e.preventDefault();
  const btn  = document.getElementById('save-profile-btn');
  const name = document.getElementById('profile-name').value.trim();
  if (!name) return;

  btn.disabled    = true;
  btn.textContent = 'Menyimpan...';

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: name, updated_at: new Date().toISOString() })
    .eq('id', AppState.user.id);

  if (!error) {
    AppState.profile.full_name = name;
    renderSidebar(AppState.role, AppState.profile);
    await logActivity('UPDATE_PROFILE', `User memperbarui nama menjadi: ${name}`);
    showToast('Profil berhasil diperbarui!', 'success');
  } else {
    showToast('Gagal menyimpan: ' + error.message, 'error');
  }
  btn.disabled    = false;
  btn.textContent = 'Simpan Perubahan';
}

export async function handlePasswordUpdate(e) {
  e.preventDefault();
  const btn       = document.getElementById('change-pw-btn');
  const errEl     = document.getElementById('pw-error');
  const newPw     = document.getElementById('new-pw').value;
  const confirmPw = document.getElementById('confirm-pw').value;

  if (newPw !== confirmPw) {
    errEl.textContent = 'Password tidak cocok.';
    errEl.classList.remove('hidden');
    return;
  }
  if (newPw.length < 8) {
    errEl.textContent = 'Password minimal 8 karakter.';
    errEl.classList.remove('hidden');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Menyimpan...';
  errEl.classList.add('hidden');

  const { error } = await supabase.auth.updateUser({ password: newPw });
  if (!error) {
    await logActivity('CHANGE_PASSWORD', 'User mengubah password');
    showToast('Password berhasil diubah!', 'success');
    document.getElementById('new-pw').value     = '';
    document.getElementById('confirm-pw').value = '';
  } else {
    errEl.textContent = error.message;
    errEl.classList.remove('hidden');
  }
  btn.disabled    = false;
  btn.textContent = '🔑 Ubah Password';
}