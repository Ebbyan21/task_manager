import { supabase, logActivity } from '../../../utils/supabaseClient.js';
import { showModal, closeModal, showToast } from '../../../app.js';
import { loadDivisions } from './index.js';

export function showEditDivisionModal(id, currentName) {
  showModal(`
    <div class="bg-studio-card border border-studio-border rounded-2xl p-6 w-full max-w-sm mx-4">
      <div class="flex items-center justify-between mb-5">
        <h3 class="text-lg font-bold text-white">Edit Divisi</h3>
        <button type="button" id="division-modal-close" class="text-studio-muted hover:text-white text-xl">✕</button>
      </div>

      <form id="division-form-edit" class="space-y-4">
        <input type="hidden" id="div-id" value="${id}" />
        <div>
          <label class="block text-sm text-studio-muted mb-1.5">Nama Divisi *</label>
          <input type="text" id="div-name" required value="${currentName}"
            class="w-full px-4 py-2.5 bg-studio-dark border border-studio-border rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors" />
        </div>
        <p id="div-error" class="hidden text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"></p>
        <div class="flex gap-3 pt-2">
          <button type="button" id="division-cancel-btn" class="flex-1 py-2.5 bg-studio-border text-studio-text rounded-lg text-sm transition-colors">Batal</button>
          <button type="submit" id="div-submit-btn" class="flex-1 py-2.5 bg-studio-accent hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors">Simpan</button>
        </div>
      </form>
    </div>`);

  document.getElementById('division-modal-close')?.addEventListener('click', closeModal);
  document.getElementById('division-cancel-btn')?.addEventListener('click', closeModal);

  document.getElementById('division-form-edit').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn   = document.getElementById('div-submit-btn');
    const errEl = document.getElementById('div-error');
    const idVal = document.getElementById('div-id').value;
    const name  = document.getElementById('div-name').value.trim();

    if (!name) return;
    btn.disabled = true; btn.textContent = 'Menyimpan...'; errEl.classList.add('hidden');

    try {
      const { error } = await supabase.from('divisions').update({ name }).eq('id', idVal);
      if (error) throw error;
      await logActivity('UPDATE_DIVISION', `Admin mengubah divisi menjadi: ${name}`);
      showToast('Divisi berhasil diperbarui!', 'success');
      closeModal();
      await loadDivisions();
    } catch (err) {
      errEl.textContent = err.message.includes('unique') ? 'Nama divisi sudah digunakan.' : err.message;
      errEl.classList.remove('hidden');
      btn.disabled = false; btn.textContent = 'Simpan';
    }
  });
}

export function confirmDeleteDivision(id, name) {
  showModal(`
    <div class="bg-studio-card border border-red-500/30 rounded-2xl p-6 w-full max-w-sm mx-4">
      <div class="text-center space-y-3 mb-6">
        <div class="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center text-3xl mx-auto">⚠️</div>
        <h3 class="text-lg font-bold text-white">Hapus Divisi?</h3>
        <p class="text-studio-muted text-sm">
          Divisi <strong class="text-white">${name}</strong> akan dihapus.
          Karyawan & project di divisi ini akan kehilangan relasi divisinya.
        </p>
      </div>
      <div class="flex gap-3">
        <button type="button" id="delete-division-cancel" class="flex-1 py-2.5 bg-studio-border text-studio-text rounded-lg text-sm">Batal</button>
        <button type="button" id="delete-division-confirm" class="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors">Ya, Hapus</button>
      </div>
    </div>`);

  document.getElementById('delete-division-cancel')?.addEventListener('click', closeModal);
  document.getElementById('delete-division-confirm')?.addEventListener('click', async () => {
    const { error } = await supabase.from('divisions').delete().eq('id', id);
    if (!error) {
      await logActivity('DELETE_DIVISION', `Admin menghapus divisi: ${name}`);
      closeModal();
      showToast('Divisi berhasil dihapus.', 'warning');
      await loadDivisions();
    } else {
      showToast('Gagal menghapus: ' + error.message, 'error');
      closeModal();
    }
  });
}