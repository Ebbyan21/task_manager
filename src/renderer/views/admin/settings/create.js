import { supabase, logActivity } from '../../../utils/supabaseClient.js';
import { updateNavbarProfile } from '../../../components/Navbar.js';
import { renderSidebar } from '../../../components/Sidebar.js';
import { showToast, AppState } from '../../../app.js';

export async function handleAvatarUpload(e) {
  const file   = e.target.files[0];
  const status = document.getElementById('upload-status');
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    showToast('Ukuran file maksimal 2MB.', 'error');
    return;
  }

  status.textContent = 'Mengupload...';
  status.classList.remove('hidden');

  const ext      = file.name.split('.').pop();
  const filePath = `${AppState.user.id}/avatar.${ext}`;

  await supabase.storage.from('avatars').remove([filePath]);

  const { error: uploadErr } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (uploadErr) {
    showToast('Upload gagal: ' + uploadErr.message, 'error');
    status.classList.add('hidden');
    return;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ avatar_url: cacheBustedUrl })
    .eq('id', AppState.user.id);

  if (!updateErr) {
    AppState.profile.avatar_url = cacheBustedUrl;
    document.getElementById('avatar-preview').innerHTML = `<img src="${cacheBustedUrl}" class="w-full h-full object-cover" />`;
    renderSidebar(AppState.role, AppState.profile);
    updateNavbarProfile(AppState.profile);
    await logActivity('UPLOAD_AVATAR', 'User memperbarui foto profil');
    showToast('Foto profil berhasil diperbarui!', 'success');
  }

  status.classList.add('hidden');
}