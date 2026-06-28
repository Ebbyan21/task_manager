import { supabase, logActivity } from '../../../utils/supabaseClient.js';
import { showModal, closeModal, showToast, AppState } from '../../../app.js';
import { loadProjects, getDivId } from './index.js';

export function showCreateProjectModal() {
  showModal(`
    <div class="bg-studio-card border border-studio-border rounded-2xl p-6
                w-full max-w-md mx-4">
      <div class="flex items-center justify-between mb-5">
        <h3 class="text-lg font-bold text-white">Buat Project Baru</h3>
        <button id="m-close" class="text-studio-muted hover:text-white text-xl leading-none">✕</button>
      </div>

      <form id="project-form-create" class="space-y-4">
        <div>
          <label class="block text-sm text-studio-muted mb-1.5">Nama Project *</label>
          <input type="text" id="proj-name" required placeholder="Nama project..."
            class="w-full px-4 py-2.5 bg-studio-dark border border-studio-border
                   rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors" />
        </div>

        <div>
          <label class="block text-sm text-studio-muted mb-1.5">Deskripsi</label>
          <textarea id="proj-desc" rows="3" placeholder="Deskripsi singkat project..."
            class="w-full px-4 py-2.5 bg-studio-dark border border-studio-border
                   rounded-lg text-studio-text text-sm focus:border-studio-accent
                   transition-colors resize-none"></textarea>
        </div>

        <div>
          <label class="block text-sm text-studio-muted mb-1.5">Deadline</label>
          <input type="datetime-local" id="proj-deadline"
            class="w-full px-4 py-2.5 bg-studio-dark border border-studio-border
                   rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors" />
        </div>

        <div class="flex items-center gap-2 px-3 py-2 bg-studio-accent/5
                    border border-studio-accent/20 rounded-lg">
          <span class="text-studio-accent">🏢</span>
          <p class="text-xs text-studio-muted">
            Project untuk divisi
            <strong class="text-studio-accent">${AppState.profile.divisions?.name || 'Anda'}</strong>
          </p>
        </div>

        <p id="proj-error" class="hidden text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"></p>

        <div class="flex gap-3 pt-2">
          <button type="button" id="m-cancel" class="flex-1 py-2.5 bg-studio-border text-studio-text rounded-lg text-sm transition-colors">Batal</button>
          <button type="submit" id="proj-submit" class="flex-1 py-2.5 bg-studio-accent hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors">Buat Project</button>
        </div>
      </form>
    </div>`);

  document.getElementById('m-close').addEventListener('click', closeModal);
  document.getElementById('m-cancel').addEventListener('click', closeModal);

  document.getElementById('project-form-create').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn    = document.getElementById('proj-submit');
    const errEl  = document.getElementById('proj-error');
    const name   = document.getElementById('proj-name').value.trim();
    const desc   = document.getElementById('proj-desc').value.trim();
    const dlVal  = document.getElementById('proj-deadline').value;
    const deadline = dlVal ? new Date(dlVal).toISOString() : null;

    if (!name) {
      errEl.textContent = 'Nama project wajib diisi.';
      errEl.classList.remove('hidden');
      return;
    }

    btn.disabled    = true;
    btn.textContent = 'Menyimpan...';
    errEl.classList.add('hidden');

    try {
      const { error } = await supabase.from('projects').insert({
        name,
        description: desc || null,
        deadline,
        division_id: getDivId(),
        created_by:  AppState.user.id,
      });
      if (error) throw error;

      await logActivity('CREATE_PROJECT', `Manager membuat project baru: ${name}`);
      showToast('Project berhasil dibuat!', 'success');
      closeModal();
      await loadProjects();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
      btn.disabled    = false;
      btn.textContent = 'Buat Project';
    }
  });
}