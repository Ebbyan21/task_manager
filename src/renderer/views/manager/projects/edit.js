import { supabase, logActivity } from '../../../utils/supabaseClient.js';
import { showModal, closeModal, showToast, AppState } from '../../../app.js';
import { loadProjects } from './index.js';

export async function showEditProjectModal(projectId) {
  const { data: project } = await supabase
    .from('projects').select('*').eq('id', projectId).single();
    
  if (!project) return;

  showModal(`
    <div class="bg-studio-card border border-studio-border rounded-2xl p-6
                w-full max-w-md mx-4">
      <div class="flex items-center justify-between mb-5">
        <h3 class="text-lg font-bold text-white">Edit Project</h3>
        <button id="m-close" class="text-studio-muted hover:text-white text-xl leading-none">✕</button>
      </div>

      <form id="project-form-edit" class="space-y-4">
        <input type="hidden" id="proj-id" value="${project.id}" />

        <div>
          <label class="block text-sm text-studio-muted mb-1.5">Nama Project *</label>
          <input type="text" id="proj-name" required value="${project.name}"
            class="w-full px-4 py-2.5 bg-studio-dark border border-studio-border
                   rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors" />
        </div>

        <div>
          <label class="block text-sm text-studio-muted mb-1.5">Deskripsi</label>
          <textarea id="proj-desc" rows="3"
            class="w-full px-4 py-2.5 bg-studio-dark border border-studio-border
                   rounded-lg text-studio-text text-sm focus:border-studio-accent
                   transition-colors resize-none">${project.description || ''}</textarea>
        </div>

        <div>
          <label class="block text-sm text-studio-muted mb-1.5">Deadline</label>
          <input type="datetime-local" id="proj-deadline"
            value="${project.deadline ? new Date(project.deadline).toISOString().slice(0,16) : ''}"
            class="w-full px-4 py-2.5 bg-studio-dark border border-studio-border
                   rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors" />
        </div>

        <p id="proj-error" class="hidden text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"></p>

        <div class="flex gap-3 pt-2">
          <button type="button" id="m-cancel" class="flex-1 py-2.5 bg-studio-border text-studio-text rounded-lg text-sm transition-colors">Batal</button>
          <button type="submit" id="proj-submit" class="flex-1 py-2.5 bg-studio-accent hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors">Simpan Perubahan</button>
        </div>
      </form>
    </div>`);

  document.getElementById('m-close').addEventListener('click', closeModal);
  document.getElementById('m-cancel').addEventListener('click', closeModal);

  document.getElementById('project-form-edit').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn    = document.getElementById('proj-submit');
    const errEl  = document.getElementById('proj-error');
    const id     = document.getElementById('proj-id').value;
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
      const { error } = await supabase.from('projects')
        .update({ name, description: desc || null, deadline })
        .eq('id', id);

      if (error) throw error;
      
      await logActivity('UPDATE_PROJECT', `Manager memperbarui project: ${name}`);
      showToast('Project berhasil diperbarui!', 'success');
      closeModal();
      await loadProjects();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
      btn.disabled    = false;
      btn.textContent = 'Simpan Perubahan';
    }
  });
}

export function confirmDelete(id, name) {
  showModal(`
    <div class="bg-studio-card border border-red-500/30 rounded-2xl p-6 w-full max-w-sm mx-4">
      <div class="text-center space-y-3 mb-6">
        <div class="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center text-3xl mx-auto">🗑️</div>
        <h3 class="text-lg font-bold text-white">Hapus Project?</h3>
        <p class="text-studio-muted text-sm">
          Project <strong class="text-white">${name}</strong> dan semua task-nya akan dihapus permanen.
        </p>
      </div>
      <div class="flex gap-3">
        <button id="del-cancel" class="flex-1 py-2.5 bg-studio-border text-studio-text rounded-lg text-sm">Batal</button>
        <button id="del-confirm" class="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors">Ya, Hapus</button>
      </div>
    </div>`);

  document.getElementById('del-cancel').addEventListener('click', closeModal);
  document.getElementById('del-confirm').addEventListener('click', async () => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (!error) {
      await logActivity('DELETE_PROJECT', `Manager menghapus project: ${name}`);
      closeModal();
      showToast('Project berhasil dihapus.', 'warning');
      await loadProjects();
    } else {
      showToast('Gagal: ' + error.message, 'error');
      closeModal();
    }
  });
}