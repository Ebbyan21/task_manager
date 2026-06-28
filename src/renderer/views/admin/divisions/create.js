import { supabase, logActivity } from '../../../utils/supabaseClient.js';
import { showModal, closeModal, showToast } from '../../../app.js';
import { loadDivisions } from './index.js';

export function showCreateDivisionModal() {
  showModal(`
    <div class="bg-studio-card border border-studio-border rounded-2xl p-6 w-full max-w-sm mx-4">
      <div class="flex items-center justify-between mb-5">
        <h3 class="text-lg font-bold text-white">Tambah Divisi Baru</h3>
        <button type="button" id="division-modal-close" class="text-studio-muted hover:text-white text-xl">✕</button>
      </div>

      <form id="division-form-create" class="space-y-4">
        <div>
          <label class="block text-sm text-studio-muted mb-1.5">Nama Divisi *</label>
          <input type="text" id="div-name" required placeholder="Contoh: Animasi 3D"
            class="w-full px-4 py-2.5 bg-studio-dark border border-studio-border rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors" />
        </div>
        <p id="div-error" class="hidden text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"></p>
        <div class="flex gap-3 pt-2">
          <button type="button" id="division-cancel-btn" class="flex-1 py-2.5 bg-studio-border text-studio-text rounded-lg text-sm transition-colors">Batal</button>
          <button type="submit" id="div-submit-btn" class="flex-1 py-2.5 bg-studio-accent hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors">Tambah Divisi</button>
        </div>
      </form>
    </div>`);

  document.getElementById('division-modal-close')?.addEventListener('click', closeModal);
  document.getElementById('division-cancel-btn')?.addEventListener('click', closeModal);

  document.getElementById('division-form-create').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn   = document.getElementById('div-submit-btn');
    const errEl = document.getElementById('div-error');
    const name  = document.getElementById('div-name').value.trim();

    if (!name) return;
    btn.disabled = true; btn.textContent = 'Menyimpan...'; errEl.classList.add('hidden');

    try {
      const { error } = await supabase.from('divisions').insert({ name });
      if (error) throw error;
      await logActivity('CREATE_DIVISION', `Admin membuat divisi baru: ${name}`);
      showToast('Divisi berhasil ditambahkan!', 'success');
      closeModal();
      await loadDivisions();
    } catch (err) {
      errEl.textContent = err.message.includes('unique') ? 'Nama divisi sudah digunakan.' : err.message;
      errEl.classList.remove('hidden');
      btn.disabled = false; btn.textContent = 'Tambah Divisi';
    }
  });
}