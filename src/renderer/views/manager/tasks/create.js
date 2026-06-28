import { supabase, logActivity } from '../../../utils/supabaseClient.js';
import { showModal, closeModal, showToast } from '../../../app.js';
import { getTaskState, loadTasks } from './index.js';

export function showCreateTaskModal(projectId) {
  const { members, activeProjName } = getTaskState();

  showModal(`
    <div class="bg-studio-card border border-studio-border rounded-2xl p-6 w-full max-w-md mx-4">
      <div class="flex items-center justify-between mb-5">
        <div>
          <h3 class="text-lg font-bold text-white">Tambah Task Baru</h3>
          <p class="text-xs text-studio-muted mt-0.5">Project: <span class="text-studio-accent">${activeProjName}</span></p>
        </div>
        <button id="m-close" class="text-studio-muted hover:text-white text-xl leading-none">✕</button>
      </div>

      <form id="task-form-create" class="space-y-4">
        <input type="hidden" id="task-proj-id" value="${projectId}" />
        <div>
          <label class="block text-sm text-studio-muted mb-1.5">Judul Task *</label>
          <input type="text" id="task-title" required placeholder="Judul task..."
            class="w-full px-4 py-2.5 bg-studio-dark border border-studio-border rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors" />
        </div>
        <div>
          <label class="block text-sm text-studio-muted mb-1.5">Deskripsi</label>
          <textarea id="task-desc" rows="2" placeholder="Detail pekerjaan..."
            class="w-full px-4 py-2.5 bg-studio-dark border border-studio-border rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors resize-none"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-studio-muted mb-1.5">Prioritas</label>
            <select id="task-priority" class="w-full px-3 py-2.5 bg-studio-dark border border-studio-border rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors">
              <option value="low">🟢 Low</option>
              <option value="medium" selected>🟡 Medium</option>
              <option value="high">🔴 High</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-studio-muted mb-1.5">Assign ke Artist</label>
            <select id="task-assigned" class="w-full px-3 py-2.5 bg-studio-dark border border-studio-border rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors">
              <option value="">— Belum ditugaskan —</option>
              ${members.map(m => `<option value="${m.id}">${m.full_name}</option>`).join('')}
            </select>
            ${members.length === 0 ? `<p class="text-xs text-yellow-400 mt-1">Belum ada artist di divisi ini.</p>` : ''}
          </div>
        </div>
        <div>
          <label class="block text-sm text-studio-muted mb-1.5">Deadline</label>
          <input type="datetime-local" id="task-deadline" class="w-full px-4 py-2.5 bg-studio-dark border border-studio-border rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors" />
        </div>
        <p id="task-error" class="hidden text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"></p>
        <div class="flex gap-3 pt-2">
          <button type="button" id="m-cancel" class="flex-1 py-2.5 bg-studio-border text-studio-text rounded-lg text-sm">Batal</button>
          <button type="submit" id="task-submit" class="flex-1 py-2.5 bg-studio-accent hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors">Tambah Task</button>
        </div>
      </form>
    </div>`);

  document.getElementById('m-close').addEventListener('click', closeModal);
  document.getElementById('m-cancel').addEventListener('click', closeModal);

  document.getElementById('task-form-create').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('task-submit');
    const errEl = document.getElementById('task-error');
    const project_id = document.getElementById('task-proj-id').value;
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
      const { error } = await supabase.from('tasks').insert({
        project_id, title, description: desc || null, priority, assigned_to, deadline, status: 'todo'
      });
      if (error) throw error;
      
      const memberName = assigned_to ? members.find(m => m.id === assigned_to)?.full_name : null;
      await logActivity('CREATE_TASK', `Manager membuat task: ${title}` + (memberName ? ` → ${memberName}` : ''));
      showToast('Task berhasil ditambahkan!', 'success');
      closeModal();
      await loadTasks(project_id);
    } catch (err) {
      errEl.textContent = err.message; errEl.classList.remove('hidden');
      btn.disabled = false; btn.textContent = 'Tambah Task';
    }
  });
}