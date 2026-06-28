import { supabase, logActivity } from '../../../utils/supabaseClient.js';
import { showModal, closeModal, showToast } from '../../../app.js';
import { getTaskState, loadTasks } from './index.js';

export async function showEditTaskModal(taskId, projectId) {
  const { members, activeProjName, activeProjId } = getTaskState();
  const projId = projectId || activeProjId;

  const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
  if (!task) return;

  showModal(`
    <div class="bg-studio-card border border-studio-border rounded-2xl p-6 w-full max-w-md mx-4">
      <div class="flex items-center justify-between mb-5">
        <div>
          <h3 class="text-lg font-bold text-white">Edit Task</h3>
          <p class="text-xs text-studio-muted mt-0.5">Project: <span class="text-studio-accent">${activeProjName}</span></p>
        </div>
        <button id="m-close" class="text-studio-muted hover:text-white text-xl leading-none">✕</button>
      </div>

      <form id="task-form-edit" class="space-y-4">
        <input type="hidden" id="task-id" value="${task.id}" />
        <div>
          <label class="block text-sm text-studio-muted mb-1.5">Judul Task *</label>
          <input type="text" id="task-title" required value="${task.title}"
            class="w-full px-4 py-2.5 bg-studio-dark border border-studio-border rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors" />
        </div>
        <div>
          <label class="block text-sm text-studio-muted mb-1.5">Deskripsi</label>
          <textarea id="task-desc" rows="2"
            class="w-full px-4 py-2.5 bg-studio-dark border border-studio-border rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors resize-none">${task.description || ''}</textarea>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-studio-muted mb-1.5">Prioritas</label>
            <select id="task-priority" class="w-full px-3 py-2.5 bg-studio-dark border border-studio-border rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors">
              <option value="low" ${task.priority==='low'?'selected':''}>🟢 Low</option>
              <option value="medium" ${task.priority==='medium'?'selected':''}>🟡 Medium</option>
              <option value="high" ${task.priority==='high'?'selected':''}>🔴 High</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-studio-muted mb-1.5">Assign ke Artist</label>
            <select id="task-assigned" class="w-full px-3 py-2.5 bg-studio-dark border border-studio-border rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors">
              <option value="">— Belum ditugaskan —</option>
              ${members.map(m => `<option value="${m.id}" ${task.assigned_to === m.id ? 'selected' : ''}>${m.full_name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div>
          <label class="block text-sm text-studio-muted mb-1.5">Deadline</label>
          <input type="datetime-local" id="task-deadline" value="${task.deadline ? new Date(task.deadline).toISOString().slice(0,16) : ''}"
            class="w-full px-4 py-2.5 bg-studio-dark border border-studio-border rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors" />
        </div>
        <p id="task-error" class="hidden text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"></p>
        <div class="flex gap-3 pt-2">
          <button type="button" id="m-cancel" class="flex-1 py-2.5 bg-studio-border text-studio-text rounded-lg text-sm">Batal</button>
          <button type="submit" id="task-submit" class="flex-1 py-2.5 bg-studio-accent hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors">Simpan Perubahan</button>
        </div>
      </form>
    </div>`);

  document.getElementById('m-close').addEventListener('click', closeModal);
  document.getElementById('m-cancel').addEventListener('click', closeModal);

  document.getElementById('task-form-edit').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('task-submit');
    const errEl = document.getElementById('task-error');
    const id = document.getElementById('task-id').value;
    const title = document.getElementById('task-title').value.trim();
    const desc = document.getElementById('task-desc').value.trim();
    const priority = document.getElementById('task-priority').value;
    const assignedVal = document.getElementById('task-assigned').value;
    const assigned_to = assignedVal || null;
    const dlVal = document.getElementById('task-deadline').value;
    const deadline = dlVal ? new Date(dlVal).toISOString() : null;

    if (!title) {
      errEl.textContent = 'Judul task wajib diisi.';
      errEl.classList.remove('hidden'); return;
    }

    btn.disabled = true; btn.textContent = 'Menyimpan...'; errEl.classList.add('hidden');

    try {
      const { error } = await supabase.from('tasks').update({ title, description: desc||null, priority, assigned_to, deadline }).eq('id', id);
      if (error) throw error;
      await logActivity('UPDATE_TASK', `Manager memperbarui task: ${title}`);
      showToast('Task berhasil diperbarui!', 'success');
      closeModal();
      await loadTasks(projId);
    } catch (err) {
      errEl.textContent = err.message; errEl.classList.remove('hidden');
      btn.disabled = false; btn.textContent = 'Simpan Perubahan';
    }
  });
}

export function confirmDeleteTask(taskId, title) {
  const { activeProjId } = getTaskState();
  showModal(`
    <div class="bg-studio-card border border-red-500/30 rounded-2xl p-6 w-full max-w-sm mx-4">
      <div class="text-center space-y-3 mb-6">
        <div class="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center text-3xl mx-auto">🗑️</div>
        <h3 class="text-lg font-bold text-white">Hapus Task?</h3>
        <p class="text-studio-muted text-sm">Task <strong class="text-white">${title}</strong> akan dihapus permanen.</p>
      </div>
      <div class="flex gap-3">
        <button id="del-cancel" class="flex-1 py-2.5 bg-studio-border text-studio-text rounded-lg text-sm">Batal</button>
        <button id="del-confirm" class="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold">Ya, Hapus</button>
      </div>
    </div>`);

  document.getElementById('del-cancel').addEventListener('click', closeModal);
  document.getElementById('del-confirm').addEventListener('click', async () => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (!error) {
      await logActivity('DELETE_TASK', `Manager menghapus task: ${title}`);
      closeModal();
      showToast('Task dihapus.', 'warning');
      await loadTasks(activeProjId);
    } else {
      showToast('Gagal: ' + error.message, 'error');
      closeModal();
    }
  });
}